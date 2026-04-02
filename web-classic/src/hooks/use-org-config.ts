// hooks/use-org-config.ts - Organization configuration hook

'use client';

import useSWR from 'swr';
import type {
  OrganizationConfig,
  CustomerTheme,
  BrandingConfig,
  LayoutConfig,
  NavSectionConfig,
} from '@/types/config';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ConfigResponse {
  theme: CustomerTheme;
  branding: BrandingConfig;
  layout: LayoutConfig;
  navigation: NavSectionConfig[];
  features: Record<string, { enabled: boolean; config?: Record<string, unknown> }>;
  customCSS?: string;
}

export function useOrgConfig() {
  const { data, error, isLoading, mutate } = useSWR<ConfigResponse>(
    '/api/config',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    theme: data?.theme,
    branding: data?.branding,
    layout: data?.layout,
    navigation: data?.navigation,
    features: data?.features || {},
    customCSS: data?.customCSS,
    isLoading,
    error,
    mutate,
  };
}

export function useOrgTheme() {
  const { theme, isLoading, error } = useOrgConfig();

  return {
    theme,
    isLoading,
    error,
  };
}

export function useOrgBranding() {
  const { branding, isLoading, error } = useOrgConfig();

  return {
    branding,
    isLoading,
    error,
  };
}

export function useOrgLayout() {
  const { layout, navigation, isLoading, error } = useOrgConfig();

  return {
    layout,
    navigation,
    isLoading,
    error,
  };
}

export function useOrgFeatures() {
  const { features, isLoading, error } = useOrgConfig();

  const isFeatureEnabled = (featureKey: string): boolean => {
    return features[featureKey]?.enabled ?? false;
  };

  const getFeatureConfig = (featureKey: string): Record<string, unknown> => {
    return features[featureKey]?.config || {};
  };

  return {
    features,
    isFeatureEnabled,
    getFeatureConfig,
    isLoading,
    error,
  };
}
