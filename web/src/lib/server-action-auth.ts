import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ServerSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type RequireSessionErrors = {
  unauthorizedError?: string;
  missingOrgError?: string;
  adminRequiredError?: string;
};

export async function getServerSession(): Promise<ServerSession> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(
  errors: Pick<RequireSessionErrors, "unauthorizedError"> = {},
): Promise<NonNullable<ServerSession>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error(errors.unauthorizedError ?? "unauthorized");
  }
  return session as NonNullable<ServerSession>;
}

export async function requireOrgMember(
  errors: Pick<RequireSessionErrors, "unauthorizedError" | "missingOrgError"> = {},
): Promise<NonNullable<ServerSession>> {
  const session = await requireSession({ unauthorizedError: errors.unauthorizedError });
  if (!session.user.orgId) {
    throw new Error(errors.missingOrgError ?? "unauthorizedMissingOrg");
  }
  return session;
}

export async function requireOrgAdmin(
  errors: RequireSessionErrors = {},
): Promise<NonNullable<ServerSession>> {
  const session = await requireOrgMember({
    unauthorizedError: errors.unauthorizedError,
    missingOrgError: errors.missingOrgError,
  });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    throw new Error(errors.adminRequiredError ?? "unauthorizedAdminRequired");
  }

  return session;
}

export type KpiApprovalLevelCode = "MANAGER" | "EXECUTIVE" | "ADMIN";

export async function getOrgKpiApprovalLevel(orgId: string): Promise<KpiApprovalLevelCode> {
  const org = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: { kpiApprovalLevel: true },
  });

  const level = String(org?.kpiApprovalLevel ?? "MANAGER") as KpiApprovalLevelCode;
  if (level === "MANAGER" || level === "EXECUTIVE" || level === "ADMIN") return level;
  return "MANAGER";
}
