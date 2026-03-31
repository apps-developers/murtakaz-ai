import { NextResponse } from "next/server";
import { getFeatureFlag } from "@/actions/feature-flags";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export function createMockStream(text: string, delayMs = 22): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const tokens = text.split(/(\s+)/);

  return new ReadableStream({
    async start(controller) {
      for (const token of tokens) {
        controller.enqueue(encoder.encode(token));
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
      controller.close();
    },
  });
}

export function streamResponse(text: string): Response {
  return new Response(createMockStream(text), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

export function aiDisabledResponse(): NextResponse {
  return NextResponse.json({ error: "AI features are disabled by system administrator." }, { status: 403 });
}

export function isAiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_ENABLED === "true";
}

/**
 * Check if AI features are enabled via env var AND feature flag
 */
export async function isAiFeatureEnabled(): Promise<boolean> {
  // First check environment variable
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return false;
  }

  // Then check database feature flag
  try {
    const isEnabled = await getFeatureFlag(FEATURE_FLAGS.AI_FEATURES);
    return isEnabled;
  } catch {
    // If we can't check the feature flag, default to enabled
    return true;
  }
}
