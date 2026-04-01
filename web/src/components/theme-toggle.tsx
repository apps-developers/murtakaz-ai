"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useTheme } from "@/providers/theme-provider";

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      className="text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={toggleMode}
      aria-label="Toggle theme"
    >
      <Icon name={mode === "dark" ? "tabler:sun" : "tabler:moon"} className="h-4 w-4" />
    </Button>
  );
}
