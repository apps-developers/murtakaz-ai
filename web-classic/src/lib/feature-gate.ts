import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFeatureFlag } from "@/actions/feature-flags";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/feature-flags";

/**
 * Middleware to protect AI API routes based on feature flags
 */
export async function protectAiRoute(request: NextRequest) {
  const isEnabled = await getFeatureFlag(FEATURE_FLAGS.AI_FEATURES);

  if (!isEnabled) {
    return NextResponse.json(
      { error: "AI features are currently disabled" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

/**
 * Check if a feature is enabled (for use in route handlers)
 */
export async function requireFeature(featureKey: FeatureFlagKey) {
  const isEnabled = await getFeatureFlag(featureKey);

  if (!isEnabled) {
    throw new Error(`Feature ${featureKey} is currently disabled`);
  }

  return true;
}
