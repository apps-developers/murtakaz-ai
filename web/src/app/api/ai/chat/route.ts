import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { requireOrgMember } from "@/lib/server-action-auth";
import { getSmartModel } from "@/lib/ai/client";
import { buildAgentSystemPrompt } from "@/lib/ai/agent-prompt";
import { createAgentTools } from "@/lib/ai/tools";
import { isAiFeatureEnabled, aiDisabledResponse } from "../_mock-stream";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  let session;
  try {
    session = await requireOrgMember();
  } catch {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const user = session.user as { id: string; orgId: string; role: string; name: string };
  const { messages, locale } = (await req.json()) as { messages: UIMessage[]; locale?: string };

  const orgName = await getOrgName(user.orgId);

  const system = buildAgentSystemPrompt({
    locale: locale ?? "en",
    role: user.role,
    userName: user.name,
    orgName: orgName.name,
    orgNameAr: orgName.nameAr,
  });

  const tools = createAgentTools(user.orgId, user.id, user.role);

  const result = streamText({
    model: getSmartModel(),
    system,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}

async function getOrgName(orgId: string) {
  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, nameAr: true },
  });
  return { name: org?.name ?? "", nameAr: org?.nameAr ?? null };
}
