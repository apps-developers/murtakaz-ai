// components/admin/config/theme-config-panel.tsx - Theme configuration UI

"use client";

import { useState, useCallback } from "react";
import { useOrgConfig } from "@/hooks/use-org-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { colorPresets, hexToHSL, generateThemeFromPrimary } from "@/lib/config/theme";
import type { CustomerTheme } from "@/types/config";
import { Icon } from "@/components/icon";

export function ThemeConfigPanel() {
  const { theme, isLoading, mutate } = useOrgConfig();
  const [saving, setSaving] = useState(false);
  const [localTheme, setLocalTheme] = useState<CustomerTheme | undefined>(theme);

  const handleSave = useCallback(async () => {
    if (!localTheme) return;
    
    setSaving(true);
    try {
      const response = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: localTheme }),
      });

      if (response.ok) {
        await mutate();
      } else {
        console.error("Failed to save theme");
      }
    } finally {
      setSaving(false);
    }
  }, [localTheme, mutate]);

  const handlePresetSelect = useCallback((presetKey: string) => {
    const preset = colorPresets[presetKey];
    if (preset) {
      setLocalTheme(generateThemeFromPrimary(preset.primary));
    }
  }, []);

  const handleColorChange = useCallback((key: keyof CustomerTheme, value: string) => {
    setLocalTheme(prev => prev ? { ...prev, [key]: value } : undefined);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme Configuration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentTheme = localTheme || theme;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Configuration</CardTitle>
          <CardDescription>
            Customize your organization&apos;s color theme, typography, and visual style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(colorPresets).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(key)}
                  className="gap-2"
                >
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: `hsl(${preset.primary})` }}
                  />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={currentTheme?.primary ? hslToHex(currentTheme.primary) : "#1e40af"}
                onChange={(e) => {
                  const hsl = hexToHSL(e.target.value);
                  const newTheme = generateThemeFromPrimary(hsl);
                  setLocalTheme(newTheme);
                }}
                className="w-16 h-10 p-1"
              />
              <Input
                value={currentTheme?.primary || ""}
                readOnly
                className="flex-1"
                placeholder="HSL value"
              />
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <Label htmlFor="border-radius">Border Radius</Label>
            <Select
              value={currentTheme?.borderRadius || "medium"}
              onValueChange={(value) => handleColorChange("borderRadius", value as CustomerTheme["borderRadius"])}
            >
              <SelectTrigger id="border-radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Sharp)</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="full">Full (Pill)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Density */}
          <div className="space-y-2">
            <Label htmlFor="density">UI Density</Label>
            <Select
              value={currentTheme?.density || "comfortable"}
              onValueChange={(value) => handleColorChange("density", value as CustomerTheme["density"])}
            >
              <SelectTrigger id="density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {currentTheme && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="p-4 rounded-lg border space-y-2"
                style={{
                  backgroundColor: `hsl(${currentTheme.secondary})`,
                  borderRadius: getRadiusValue(currentTheme.borderRadius),
                }}
              >
                <div
                  className="px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: `hsl(${currentTheme.primary})` }}
                >
                  Primary Button Style
                </div>
                <div
                  className="px-4 py-2 rounded border"
                  style={{
                    backgroundColor: `hsl(${currentTheme.accent})`,
                    borderColor: `hsl(${currentTheme.primary})`,
                  }}
                >
                  Accent Element
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !localTheme}>
              {saving ? (
                <>
                  <Icon name="tabler:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="tabler:device-floppy" className="mr-2 h-4 w-4" />
                  Save Theme
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function hslToHex(hsl: string): string {
  const parts = hsl.split(" ");
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1].replace("%", "")) / 100;
  const l = parseInt(parts[2].replace("%", "")) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getRadiusValue(radius: string): string {
  const map: Record<string, string> = {
    none: "0",
    small: "0.25rem",
    medium: "0.5rem",
    large: "0.75rem",
    full: "9999px",
  };
  return map[radius] || "0.5rem";
}
