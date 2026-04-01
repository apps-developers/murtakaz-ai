// components/admin/config/features-config-panel.tsx - Feature flags configuration UI

"use client";

import { useState, useCallback } from "react";
import { useOrgConfig, useOrgFeatures } from "@/hooks/use-org-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { featureRegistry } from "@/lib/config/defaults";
import { Icon } from "@/components/icon";

export function FeaturesConfigPanel() {
  const { features, isLoading } = useOrgFeatures();
  const { mutate } = useOrgConfig();
  const [saving, setSaving] = useState(false);
  const [localFeatures, setLocalFeatures] = useState<Record<string, { enabled: boolean }>>({});

  const handleToggle = useCallback((featureKey: string, enabled: boolean) => {
    setLocalFeatures(prev => ({
      ...prev,
      [featureKey]: { enabled },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(localFeatures).length === 0) return;

    setSaving(true);
    try {
      const featuresPayload = Object.fromEntries(
        Object.entries(localFeatures).map(([key, value]) => [
          key,
          { enabled: value.enabled, config: features[key]?.config || {} },
        ])
      );

      const response = await fetch("/api/config/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: featuresPayload }),
      });

      if (response.ok) {
        await mutate();
        setLocalFeatures({});
      } else {
        console.error("Failed to save feature flags");
      }
    } finally {
      setSaving(false);
    }
  }, [localFeatures, features, mutate]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Configuration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group features by section
  const groupedFeatures = Object.entries(featureRegistry).reduce((acc, [featureKey, def]) => {
    const section = def.navigation?.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push({ 
      key: featureKey, 
      name: def.name,
      description: def.description,
      icon: def.icon,
      defaultEnabled: def.defaultEnabled,
      requires: def.requires,
      currentEnabled: features[featureKey]?.enabled ?? def.defaultEnabled 
    });
    return acc;
  }, {} as Record<string, Array<{
    key: string;
    name: string;
    description: string;
    icon: string;
    defaultEnabled: boolean;
    requires: string[];
    currentEnabled: boolean;
  }>>);

  const sectionLabels: Record<string, string> = {
    core: 'Core Features',
    strategy: 'Strategy Management',
    governance: 'Governance',
    admin: 'Administration',
    super: 'Super Admin',
    other: 'Other Features',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Configuration</CardTitle>
          <CardDescription>
            Enable or disable features for your organization. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedFeatures).map(([section, sectionFeatures]) => (
            <div key={section} className="space-y-3">
              <h3 className="text-lg font-medium">{sectionLabels[section] || section}</h3>
              <div className="space-y-2">
                {sectionFeatures.map((feature) => {
                  const localState = localFeatures[feature.key];
                  const isEnabled = localState ? localState.enabled : feature.currentEnabled;
                  const hasChanges = localState && localState.enabled !== feature.currentEnabled;

                  return (
                    <div
                      key={feature.key}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        hasChanges ? 'border-yellow-500/50 bg-yellow-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon name={feature.icon} className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={feature.key} className="font-medium cursor-pointer">
                              {feature.name}
                            </Label>
                            {feature.defaultEnabled && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                          {feature.requires.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Requires: {feature.requires.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        id={feature.key}
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(localFeatures).length > 0 && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setLocalFeatures({})}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : `Save ${Object.keys(localFeatures).length} Change(s)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
