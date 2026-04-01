// components/feature-gate.tsx - Enhanced feature gating with org configuration

"use client";

import { useOrgFeatures } from "@/hooks/use-org-config";
import { featureRegistry } from "@/lib/config/defaults";

type FeatureGateProps = {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null,
}: FeatureGateProps) {
  const { isFeatureEnabled } = useOrgFeatures();

  // Check if feature is enabled in org config
  const featureEnabled = isFeatureEnabled(feature);

  // Check if feature exists in registry
  const featureDef = featureRegistry[feature];
  if (!featureDef) {
    console.warn(`Feature "${feature}" not found in registry`);
    return <>{fallback}</>;
  }

  // Check dependencies
  const dependenciesMet = featureDef.requires.every(dep => isFeatureEnabled(dep));

  if (!featureEnabled || !dependenciesMet) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Navigation item gate - hides nav items based on feature flags
 */
type NavItemGateProps = {
  feature: string;
  children: React.ReactNode;
};

export function NavItemGate({ feature, children }: NavItemGateProps) {
  const { isFeatureEnabled } = useOrgFeatures();

  if (!isFeatureEnabled(feature)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook for route guards - use in page components
 */
export function useRouteGuard(feature: string): { allowed: boolean; reason: string | null } {
  const { isFeatureEnabled } = useOrgFeatures();
  const featureDef = featureRegistry[feature];

  if (!featureDef) {
    return { allowed: false, reason: 'feature_not_found' };
  }

  if (!isFeatureEnabled(feature)) {
    return { allowed: false, reason: 'feature_disabled' };
  }

  // Check dependencies
  const missingDeps = featureDef.requires.filter(dep => !isFeatureEnabled(dep));
  if (missingDeps.length > 0) {
    return { allowed: false, reason: 'missing_dependencies' };
  }

  return { allowed: true, reason: null };
}
