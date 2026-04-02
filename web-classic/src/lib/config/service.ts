// lib/config/service.ts - Configuration database service

import { prisma } from '@/lib/prisma';
import { unstable_cache, revalidateTag } from 'next/cache';
import type {
  OrganizationConfig as OrganizationConfigType,
  CustomerTheme,
  BrandingConfig,
  LayoutConfig,
  NavSectionConfig,
} from '@/types/config';
import { getDefaultConfig, featureRegistry, buildDefaultFeatures } from './defaults';

const CACHE_TTL = 60; // 60 seconds

/**
 * Get organization configuration with caching
 */
export const getOrgConfig = unstable_cache(
  async (orgId: string): Promise<OrganizationConfigType> => {
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
    });

    const features = await prisma.orgFeatureFlag.findMany({
      where: { organizationId: orgId },
    });

    // Build features map from database or defaults
    const featuresMap: Record<string, { enabled: boolean; config?: Record<string, unknown> }> =
      buildDefaultFeatures();

    for (const flag of features) {
      if (featuresMap[flag.featureKey]) {
        featuresMap[flag.featureKey] = {
          enabled: flag.enabled,
          config: (flag.config as Record<string, unknown>) || {},
        };
      }
    }

    // Merge with defaults
    const defaults = getDefaultConfig();

    return {
      theme: (config?.theme as unknown as CustomerTheme) || defaults.theme,
      branding: (config?.branding as unknown as BrandingConfig) || defaults.branding,
      layout: (config?.layout as unknown as LayoutConfig) || defaults.layout,
      navigation: (config?.navigation as unknown as NavSectionConfig[]) || defaults.navigation,
      features: featuresMap,
      customCSS: config?.customCSS || undefined,
    };
  },
  ['org-config'],
  { revalidate: CACHE_TTL, tags: ['org-config'] }
);

/**
 * Get organization theme only (lightweight)
 */
export const getOrgTheme = unstable_cache(
  async (orgId: string): Promise<CustomerTheme> => {
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: { theme: true },
    });

    return (config?.theme as unknown as CustomerTheme) || getDefaultConfig().theme;
  },
  ['org-theme'],
  { revalidate: CACHE_TTL, tags: ['org-theme'] }
);

/**
 * Get organization branding only
 */
export const getOrgBranding = unstable_cache(
  async (orgId: string): Promise<BrandingConfig> => {
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: { branding: true },
    });

    return (config?.branding as unknown as BrandingConfig) || getDefaultConfig().branding;
  },
  ['org-branding'],
  { revalidate: CACHE_TTL, tags: ['org-branding'] }
);

/**
 * Get organization layout configuration
 */
export const getOrgLayout = unstable_cache(
  async (orgId: string): Promise<LayoutConfig> => {
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: { layout: true, navigation: true },
    });

    const defaults = getDefaultConfig();
    const layout = (config?.layout as unknown as LayoutConfig) || defaults.layout;

    // Merge navigation into layout if available
    if (config?.navigation) {
      layout.sidebar.sections = config.navigation as unknown as NavSectionConfig[];
    }

    return layout;
  },
  ['org-layout'],
  { revalidate: CACHE_TTL, tags: ['org-layout'] }
);

/**
 * Get feature flags for organization
 */
export const getOrgFeatures = unstable_cache(
  async (orgId: string): Promise<Record<string, { enabled: boolean; config?: Record<string, unknown> }>> => {
    const flags = await prisma.orgFeatureFlag.findMany({
      where: { organizationId: orgId },
    });

    const featuresMap = buildDefaultFeatures();

    for (const flag of flags) {
      if (featuresMap[flag.featureKey]) {
        featuresMap[flag.featureKey] = {
          enabled: flag.enabled,
          config: (flag.config as Record<string, unknown>) || {},
        };
      }
    }

    return featuresMap;
  },
  ['org-features'],
  { revalidate: CACHE_TTL, tags: ['org-features'] }
);

/**
 * Check if a specific feature is enabled for an organization
 */
export async function isFeatureEnabled(
  orgId: string,
  featureKey: string
): Promise<boolean> {
  const flag = await prisma.orgFeatureFlag.findUnique({
    where: {
      org_feature_flag_unique: {
        organizationId: orgId,
        featureKey,
      },
    },
  });

  if (flag) {
    return flag.enabled;
  }

  // Return default if not configured
  return featureRegistry[featureKey]?.defaultEnabled ?? false;
}

/**
 * Update organization configuration (creates if not exists)
 */
export async function updateOrgConfig(
  orgId: string,
  config: Partial<OrganizationConfigType>
): Promise<void> {
  const data: Record<string, unknown> = {};

  if (config.theme) data.theme = config.theme;
  if (config.branding) data.branding = config.branding;
  if (config.layout) data.layout = config.layout;
  if (config.navigation) data.navigation = config.navigation;
  if (config.customCSS !== undefined) data.customCSS = config.customCSS;

  await prisma.organizationConfig.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      ...data,
    },
    update: data,
  });

  // Revalidate cache
  revalidateTag('org-config');
  revalidateTag('org-theme');
  revalidateTag('org-branding');
  revalidateTag('org-layout');
}

/**
 * Update a single feature flag
 */
export async function updateFeatureFlag(
  orgId: string,
  featureKey: string,
  enabled: boolean,
  config?: Record<string, unknown>
): Promise<void> {
  await prisma.orgFeatureFlag.upsert({
    where: {
      org_feature_flag_unique: {
        organizationId: orgId,
        featureKey,
      },
    },
    create: {
      organizationId: orgId,
      featureKey,
      enabled,
      config: (config || {}) as unknown as NonNullable<unknown>,
    },
    update: {
      enabled,
      config: (config || {}) as unknown as NonNullable<unknown>,
    },
  });

  // Revalidate cache
  revalidateTag('org-config');
  revalidateTag('org-features');
}

/**
 * Bulk update feature flags
 */
export async function updateFeatureFlags(
  orgId: string,
  flags: Record<string, { enabled: boolean; config?: Record<string, unknown> }>
): Promise<void> {
  const operations = Object.entries(flags).map(([featureKey, { enabled, config }]) =>
    prisma.orgFeatureFlag.upsert({
      where: {
        org_feature_flag_unique: {
          organizationId: orgId,
          featureKey,
        },
      },
      create: {
        organizationId: orgId,
        featureKey,
        enabled,
        config: (config || {}) as unknown as NonNullable<unknown>,
      },
      update: {
        enabled,
        config: (config || {}) as unknown as NonNullable<unknown>,
      },
    })
  );

  await prisma.$transaction(operations);

  // Revalidate cache
  revalidateTag('org-config');
  revalidateTag('org-features');
}

/**
 * Initialize default configuration for a new organization
 */
export async function initializeOrgConfig(orgId: string): Promise<void> {
  const defaults = getDefaultConfig();

  // Create base config
  await prisma.organizationConfig.create({
    data: {
      organizationId: orgId,
      theme: defaults.theme as unknown as NonNullable<unknown>,
      branding: defaults.branding as unknown as NonNullable<unknown>,
      layout: defaults.layout as unknown as NonNullable<unknown>,
      navigation: defaults.navigation as unknown as NonNullable<unknown>,
    },
  });

  // Create default feature flags
  const featureEntries = Object.entries(defaults.features).map(([key, value]) => ({
    organizationId: orgId,
    featureKey: key,
    enabled: value.enabled,
    config: (value.config as unknown as NonNullable<unknown>) || ({} as unknown as NonNullable<unknown>),
  }));

  await prisma.orgFeatureFlag.createMany({
    data: featureEntries,
    skipDuplicates: true,
  });

  // Revalidate all config caches
  revalidateTag('org-config');
  revalidateTag('org-theme');
  revalidateTag('org-branding');
  revalidateTag('org-layout');
  revalidateTag('org-features');
}

/**
 * Delete organization configuration (cleanup)
 */
export async function deleteOrgConfig(orgId: string): Promise<void> {
  await prisma.organizationConfig.deleteMany({
    where: { organizationId: orgId },
  });

  await prisma.orgFeatureFlag.deleteMany({
    where: { organizationId: orgId },
  });

  await prisma.dashboardTemplate.deleteMany({
    where: { organizationId: orgId },
  });

  await prisma.brandingAsset.deleteMany({
    where: { organizationId: orgId },
  });

  // Revalidate caches
  revalidateTag('org-config');
  revalidateTag('org-theme');
  revalidateTag('org-branding');
  revalidateTag('org-layout');
  revalidateTag('org-features');
}
