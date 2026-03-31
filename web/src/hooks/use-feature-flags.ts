"use client";

import { useEffect, useState, useCallback } from "react";
import { getFeatureFlag } from "@/actions/feature-flags";
import type { FeatureFlagKey } from "@/lib/feature-flags";

export type { FeatureFlagKey };

/**
 * Hook to check if a feature is enabled
 * Returns { enabled: boolean, loading: boolean, error: Error | null }
 */
export function useFeatureFlag(flagKey: FeatureFlagKey) {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkFeature() {
      try {
        setLoading(true);
        const isEnabled = await getFeatureFlag(flagKey);
        if (isMounted) {
          setEnabled(isEnabled);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to check feature flag"));
          setEnabled(true); // Default to enabled on error
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void checkFeature();

    return () => {
      isMounted = false;
    };
  }, [flagKey]);

  return { enabled, loading, error };
}

/**
 * Hook to get all feature flags at once
 * Returns { flags: Record<FeatureFlagKey, boolean>, loading: boolean, error: Error | null }
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const { getFeatureFlags } = await import("@/actions/feature-flags");
      const data = await getFeatureFlags();
      setFlags(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load feature flags"));
      setFlags(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { flags, loading, error, refresh };
}
