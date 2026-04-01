"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { updateFeatureFlag } from "@/actions/feature-flags";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/feature-flags";
import { useState, useCallback } from "react";
import { Loader2, Sparkles, Workflow, Wand2, FileText, LayoutDashboard, Bell, ScrollText } from "lucide-react";

const FEATURE_CONFIG: Array<{
  key: FeatureFlagKey;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}> = [
  {
    key: FEATURE_FLAGS.AI_FEATURES,
    labelKey: "aiFeatures",
    descriptionKey: "aiFeaturesDesc",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.DIAGRAMS,
    labelKey: "diagramsFeature",
    descriptionKey: "diagramsFeatureDesc",
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.ADVANCED_FEATURES,
    labelKey: "advancedFeatures",
    descriptionKey: "advancedFeaturesDesc",
    icon: <Wand2 className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.APPROVALS_WORKFLOW,
    labelKey: "approvalsWorkflow",
    descriptionKey: "approvalsWorkflowDesc",
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.FILE_ATTACHMENTS,
    labelKey: "fileAttachments",
    descriptionKey: "fileAttachmentsDesc",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.DASHBOARDS,
    labelKey: "dashboards",
    descriptionKey: "dashboardsDesc",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.NOTIFICATIONS,
    labelKey: "notifications",
    descriptionKey: "notificationsDesc",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    key: FEATURE_FLAGS.AUDIT_LOGS,
    labelKey: "auditLogs",
    descriptionKey: "auditLogsDesc",
    icon: <ScrollText className="h-5 w-5" />,
  },
];

export default function SystemSettingsPage() {
  const { t } = useLocale();
  const { flags, loading, error, refresh } = useFeatureFlags();
  const [saving, setSaving] = useState<Record<FeatureFlagKey, boolean>>({
    [FEATURE_FLAGS.AI_FEATURES]: false,
    [FEATURE_FLAGS.DIAGRAMS]: false,
    [FEATURE_FLAGS.ADVANCED_FEATURES]: false,
    [FEATURE_FLAGS.APPROVALS_WORKFLOW]: false,
    [FEATURE_FLAGS.FILE_ATTACHMENTS]: false,
    [FEATURE_FLAGS.DASHBOARDS]: false,
    [FEATURE_FLAGS.NOTIFICATIONS]: false,
    [FEATURE_FLAGS.AUDIT_LOGS]: false,
  });

  const handleToggle = useCallback(async (key: FeatureFlagKey, enabled: boolean) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await updateFeatureFlag({ key, enabled });
      if (result.success) {
        await refresh();
      } else {
        console.error("Failed to update feature flag:", result.error);
      }
    } catch (err) {
      console.error("Error updating feature flag:", err);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }, [refresh]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("systemSettings")}
        subtitle={t("systemSettingsSubtitle")}
      />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("featureToggles")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("featureTogglesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                {t("failedToLoadFeatureFlags")}
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            FEATURE_CONFIG.map((feature) => {
              const isEnabled = flags?.[feature.key] ?? true;
              const isSaving = saving[feature.key];

              return (
                <div
                  key={feature.key}
                  className="flex items-start justify-between rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">{feature.icon}</div>
                    <div>
                      <Label htmlFor={feature.key} className="font-semibold text-foreground">
                        {t(feature.labelKey as any)}
                      </Label>
                      <p className="text-sm text-muted-foreground">{t(feature.descriptionKey as any)}</p>
                    </div>
                  </div>
                  <div dir="ltr">
                    <Switch
                      id={feature.key}
                      checked={isEnabled}
                      disabled={isSaving}
                      onCheckedChange={(checked: boolean) => handleToggle(feature.key, checked)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
