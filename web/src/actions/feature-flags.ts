"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/server-action-auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { FEATURE_FLAGS, DEFAULT_FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/feature-flags";

const featureFlagSchema = z.enum([
  FEATURE_FLAGS.AI_FEATURES,
  FEATURE_FLAGS.DIAGRAMS,
  FEATURE_FLAGS.ADVANCED_FEATURES,
]);

const updateFeatureFlagSchema = z.object({
  key: featureFlagSchema,
  enabled: z.boolean(),
});

/**
 * Get all feature flags with their current values
 * Creates default entries if they don't exist
 */
export async function getFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  await requireSuperAdmin();

  const settings = await prisma.systemSettings.findMany({
    where: {
      key: {
        in: Object.values(FEATURE_FLAGS),
      },
    },
  });

  const flags = { ...DEFAULT_FEATURE_FLAGS };

  for (const setting of settings) {
    const key = setting.key as FeatureFlagKey;
    if (Object.values(FEATURE_FLAGS).includes(key)) {
      const value = setting.value as { enabled: boolean };
      flags[key] = value.enabled ?? DEFAULT_FEATURE_FLAGS[key];
    }
  }

  return flags;
}

/**
 * Get a single feature flag value
 * Creates default entry if it doesn't exist
 */
export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  // Public - no auth required for reading
  const setting = await prisma.systemSettings.findUnique({
    where: { key },
  });

  if (!setting) {
    return DEFAULT_FEATURE_FLAGS[key];
  }

  const value = setting.value as { enabled: boolean };
  return value.enabled ?? DEFAULT_FEATURE_FLAGS[key];
}

/**
 * Update a feature flag (super admin only)
 */
export async function updateFeatureFlag(data: z.infer<typeof updateFeatureFlagSchema>) {
  const session = await requireSuperAdmin();

  const parsed = updateFeatureFlagSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "validationFailed",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.map((p) => (typeof p === "string" || typeof p === "number" ? p : String(p))),
        message: i.message,
      })),
    };
  }

  const { key, enabled } = parsed.data;

  try {
    await prisma.systemSettings.upsert({
      where: { key },
      create: {
        key,
        value: { enabled },
        updatedBy: session.user.id,
      },
      update: {
        value: { enabled },
        updatedBy: session.user.id,
      },
    });

    revalidatePath("/[locale]/super-admin/settings", "page");
    revalidatePath("/api/ai/*", "layout");

    return { success: true };
  } catch (error) {
    console.error("Failed to update feature flag:", error);
    return { success: false, error: "failedToUpdateFeatureFlag" };
  }
}

/**
 * Batch update multiple feature flags (super admin only)
 */
export async function updateFeatureFlagsBatch(
  updates: Array<{ key: FeatureFlagKey; enabled: boolean }>
) {
  const session = await requireSuperAdmin();

  try {
    for (const update of updates) {
      if (!Object.values(FEATURE_FLAGS).includes(update.key)) {
        continue;
      }

      await prisma.systemSettings.upsert({
        where: { key: update.key },
        create: {
          key: update.key,
          value: { enabled: update.enabled },
          updatedBy: session.user.id,
        },
        update: {
          value: { enabled: update.enabled },
          updatedBy: session.user.id,
        },
      });
    }

    revalidatePath("/[locale]/super-admin/settings", "page");
    revalidatePath("/api/ai/*", "layout");

    return { success: true };
  } catch (error) {
    console.error("Failed to update feature flags:", error);
    return { success: false, error: "failedToUpdateFeatureFlags" };
  }
}

/**
 * Initialize default feature flags if they don't exist
 */
export async function initializeFeatureFlags() {
  await requireSuperAdmin();

  try {
    for (const [key, defaultValue] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      await prisma.systemSettings.upsert({
        where: { key },
        create: {
          key,
          value: { enabled: defaultValue },
        },
        update: {},
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to initialize feature flags:", error);
    return { success: false, error: "failedToInitializeFeatureFlags" };
  }
}
