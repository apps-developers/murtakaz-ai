import { useState, useEffect } from "react";
import { getAiFeatureEnabled, getDiagramsFeatureEnabled, getAdvancedFeaturesEnabled } from "@/actions/feature-flags";

export function isAiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_ENABLED === "true";
}

// Returns false on first render (matches SSR), then the real value after mount.
// Also checks backend feature flag to sync with admin settings.
export function useAiEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // First check env var (quick check)
    if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
      setEnabled(false);
      return;
    }

    // Then check backend feature flag
    getAiFeatureEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

// Returns false on first render, then checks backend feature flag for diagrams.
export function useDiagramsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getDiagramsFeatureEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

// Returns false on first render, then checks backend feature flag for advanced features.
export function useAdvancedFeaturesEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getAdvancedFeaturesEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}
