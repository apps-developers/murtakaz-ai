"use client";

import { useFeatureFlag, type FeatureFlagKey } from "@/hooks/use-feature-flags";
import { Loader2 } from "lucide-react";

interface FeatureFlagGuardProps {
  flag: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on feature flag
 */
export function FeatureFlagGuard({
  flag,
  children,
  fallback = null,
  loadingComponent,
}: FeatureFlagGuardProps) {
  const { enabled, loading } = useFeatureFlag(flag);

  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface FeatureFlagDisabledProps {
  title?: string;
  description?: string;
}

/**
 * Default fallback component when a feature is disabled
 */
export function FeatureFlagDisabled({
  title = "Feature Unavailable",
  description = "This feature is currently disabled by the system administrator.",
}: FeatureFlagDisabledProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
