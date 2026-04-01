"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme, type ColorTheme } from "@/providers/theme-provider";
import { Check, Palette, Loader2 } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { updateOrgColorTheme } from "@/actions/org-admin";

const COLOR_THEME_CONFIG: Array<{
  value: ColorTheme;
  label: string;
  gradient: string;
}> = [
  { value: "blue", label: "Blue", gradient: "from-blue-500 to-blue-700" },
  { value: "emerald", label: "Emerald", gradient: "from-emerald-500 to-emerald-700" },
  { value: "violet", label: "Violet", gradient: "from-violet-500 to-violet-700" },
  { value: "rose", label: "Rose", gradient: "from-rose-500 to-rose-700" },
  { value: "orange", label: "Orange", gradient: "from-orange-500 to-orange-700" },
  { value: "slate", label: "Slate", gradient: "from-slate-500 to-slate-700" },
];

interface ColorThemeSelectorProps {
  className?: string;
}

export function ColorThemeSelector({ className }: ColorThemeSelectorProps) {
  const { color, setColor } = useTheme();
  const [saving, setSaving] = useState<ColorTheme | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleColorChange = useCallback(async (newColor: ColorTheme) => {
    setColor(newColor);
    setSaving(newColor);
    try {
      const result = await updateOrgColorTheme({ colorTheme: newColor });
      if (!result.success) {
        console.error("Failed to save color theme:", result.error);
      }
    } catch (err) {
      console.error("Error saving color theme:", err);
    } finally {
      setSaving(null);
    }
  }, [setColor]);

  // SSR-safe: render static placeholder during server render to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Palette className="h-4 w-4" />
          <span className="text-sm font-medium">Color Theme</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {COLOR_THEME_CONFIG.map((theme) => (
            <div
              key={theme.value}
              className="relative h-14 w-full overflow-hidden rounded-md border-2 border-border"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", theme.gradient)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Palette className="h-4 w-4" />
        <span className="text-sm font-medium">Color Theme</span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {COLOR_THEME_CONFIG.map((theme) => (
          <Button
            key={theme.value}
            variant="outline"
            onClick={() => handleColorChange(theme.value)}
            disabled={saving === theme.value}
            className={cn(
              "relative h-14 w-full overflow-hidden border-2 p-0 transition-all hover:scale-105",
              color === theme.value
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            )}
            aria-label={`Select ${theme.label} theme`}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br", theme.gradient)} />
            {color === theme.value && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                {saving === theme.value ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white drop-shadow-md" />
                ) : (
                  <Check className="h-5 w-5 text-white drop-shadow-md" />
                )}
              </div>
            )}
            <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-white drop-shadow-md">
              {theme.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
