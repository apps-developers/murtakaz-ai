// components/admin/config/branding-config-panel.tsx - Branding configuration UI

"use client";

import { useState, useCallback } from "react";
import { useOrgConfig } from "@/hooks/use-org-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrandingConfig } from "@/types/config";

export function BrandingConfigPanel() {
  const { branding, isLoading, mutate } = useOrgConfig();
  const [saving, setSaving] = useState(false);
  const [localBranding, setLocalBranding] = useState<BrandingConfig | undefined>(branding);

  const handleSave = useCallback(async () => {
    if (!localBranding) return;
    
    setSaving(true);
    try {
      const response = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branding: localBranding }),
      });

      if (response.ok) {
        await mutate();
      } else {
        console.error("Failed to save branding");
      }
    } finally {
      setSaving(false);
    }
  }, [localBranding, mutate]);

  const handleChange = useCallback((key: keyof BrandingConfig, value: string) => {
    setLocalBranding(prev => prev ? { ...prev, [key]: value } : undefined);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Branding Configuration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentBranding = localBranding || branding;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding Configuration</CardTitle>
          <CardDescription>
            Customize your organization&apos;s identity and legal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="app-name">Application Name</Label>
            <Input
              id="app-name"
              value={currentBranding?.appName || ""}
              onChange={(e) => handleChange("appName", e.target.value)}
              placeholder="Strategy Execution"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short-name">Short Name</Label>
            <Input
              id="short-name"
              value={currentBranding?.shortName || ""}
              onChange={(e) => handleChange("shortName", e.target.value)}
              placeholder="Strategy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={currentBranding?.companyName || ""}
              onChange={(e) => handleChange("companyName", e.target.value)}
              placeholder="Your Organization"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
