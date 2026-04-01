// Feature flag constants - extracted from server actions to avoid "use server" restrictions

export const FEATURE_FLAGS = {
  AI_FEATURES: "ai_features",
  DIAGRAMS: "diagrams",
  ADVANCED_FEATURES: "advanced_features",
  APPROVALS_WORKFLOW: "approvals_workflow",
  FILE_ATTACHMENTS: "file_attachments",
  DASHBOARDS: "dashboards",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "audit_logs",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

// Default values for feature flags
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  [FEATURE_FLAGS.AI_FEATURES]: true,
  [FEATURE_FLAGS.DIAGRAMS]: true,
  [FEATURE_FLAGS.ADVANCED_FEATURES]: true,
  [FEATURE_FLAGS.APPROVALS_WORKFLOW]: true,
  [FEATURE_FLAGS.FILE_ATTACHMENTS]: true,
  [FEATURE_FLAGS.DASHBOARDS]: true,
  [FEATURE_FLAGS.NOTIFICATIONS]: true,
  [FEATURE_FLAGS.AUDIT_LOGS]: true,
};
