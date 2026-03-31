// Feature flag constants - extracted from server actions to avoid "use server" restrictions

export const FEATURE_FLAGS = {
  AI_FEATURES: "ai_features",
  DIAGRAMS: "diagrams",
  ADVANCED_FEATURES: "advanced_features",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

// Default values for feature flags
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  [FEATURE_FLAGS.AI_FEATURES]: true,
  [FEATURE_FLAGS.DIAGRAMS]: true,
  [FEATURE_FLAGS.ADVANCED_FEATURES]: true,
};
