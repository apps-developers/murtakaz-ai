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
  FEATURE_FLAGS.APPROVALS_WORKFLOW,
  FEATURE_FLAGS.FILE_ATTACHMENTS,
  FEATURE_FLAGS.DASHBOARDS,
  FEATURE_FLAGS.NOTIFICATIONS,
  FEATURE_FLAGS.AUDIT_LOGS,
]);

const updateFeatureFlagSchema = z.object({
  key: featureFlagSchema,
  enabled: z.boolean(),
});

/**
 * Check if AI features are enabled via env var AND feature flag
 * This is a public action that can be called from the frontend
 */
export async function getAiFeatureEnabled(): Promise<boolean> {
  // First check environment variable
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return false;
  }

  // Then check database feature flag
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.AI_FEATURES },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.AI_FEATURES];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.AI_FEATURES];
  } catch {
    // If we can't check the feature flag, default to enabled
    return true;
  }
}

/**
 * Check if Diagram features are enabled via feature flag
 * This is a public action that can be called from the frontend
 */
export async function getDiagramsFeatureEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.DIAGRAMS },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.DIAGRAMS];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.DIAGRAMS];
  } catch {
    // If we can't check the feature flag, default to enabled
    return true;
  }
}

/**
 * Check if Advanced features are enabled via feature flag
 * This is a public action that can be called from the frontend
 */
export async function getAdvancedFeaturesEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.ADVANCED_FEATURES },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.ADVANCED_FEATURES];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.ADVANCED_FEATURES];
  } catch {
    // If we can't check the feature flag, default to enabled
    return true;
  }
}

/**
 * Check if Approvals Workflow is enabled via feature flag
 * This is a public action that can be called from the frontend
 */
export async function getApprovalsWorkflowEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.APPROVALS_WORKFLOW },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.APPROVALS_WORKFLOW];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.APPROVALS_WORKFLOW];
  } catch {
    return true;
  }
}

/**
 * Check if File Attachments is enabled via feature flag
 */
export async function getFileAttachmentsEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.FILE_ATTACHMENTS },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.FILE_ATTACHMENTS];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.FILE_ATTACHMENTS];
  } catch {
    return true;
  }
}

/**
 * Check if Dashboards is enabled via feature flag
 */
export async function getDashboardsEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.DASHBOARDS },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.DASHBOARDS];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.DASHBOARDS];
  } catch {
    return true;
  }
}

/**
 * Check if Notifications is enabled via feature flag
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.NOTIFICATIONS },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.NOTIFICATIONS];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.NOTIFICATIONS];
  } catch {
    return true;
  }
}

/**
 * Check if Audit Logs is enabled via feature flag
 */
export async function getAuditLogsEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: FEATURE_FLAGS.AUDIT_LOGS },
    });

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.AUDIT_LOGS];
    }

    const value = setting.value as { enabled: boolean };
    return value.enabled ?? DEFAULT_FEATURE_FLAGS[FEATURE_FLAGS.AUDIT_LOGS];
  } catch {
    return true;
  }
}

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
