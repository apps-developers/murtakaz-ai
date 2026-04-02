import { useState, useEffect } from "react";
import {
  getDiagramsFeatureEnabled,
  getAdvancedFeaturesEnabled,
  getApprovalsWorkflowEnabled,
  getFileAttachmentsEnabled,
  getDashboardsEnabled,
  getNotificationsEnabled,
  getAuditLogsEnabled,
} from "@/actions/feature-flags";

export function isAiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_ENABLED === "true";
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

// Returns false on first render, then checks backend feature flag for approvals workflow.
export function useApprovalsWorkflowEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getApprovalsWorkflowEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

// Returns false on first render, then checks backend feature flag for file attachments.
export function useFileAttachmentsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getFileAttachmentsEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

// Returns false on first render, then checks backend feature flag for dashboards.
export function useDashboardsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getDashboardsEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

// Returns false on first render, then checks backend feature flag for notifications.
export function useNotificationsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getNotificationsEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

// Returns false on first render, then checks backend feature flag for audit logs.
export function useAuditLogsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getAuditLogsEnabled()
      .then((isEnabled) => setEnabled(isEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}
