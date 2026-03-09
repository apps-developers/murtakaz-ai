import { useState, useEffect } from "react";

export function isAiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_ENABLED === "true";
}

// Returns false on first render (matches SSR), then the real value after mount.
export function useAiEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(isAiEnabled());
  }, []);
  return enabled;
}
