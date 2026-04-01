// lib/config/validation.ts - Zod validation schemas for configuration

import { z } from 'zod';

// Color validation - accepts HSL format like "215 62% 30%" or hex "#1e40af"
const colorSchema = z.string().refine(
  (val) => {
    // HSL format: "H S% L%"
    const hslPattern = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
    // Hex format: "#RRGGBB"
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    return hslPattern.test(val) || hexPattern.test(val);
  },
  { message: 'Color must be in HSL format (e.g., "215 62% 30%") or hex format (e.g., "#1e40af")' }
);

// Font family validation
const fontFamilySchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().optional(),
  monospace: z.string().optional(),
});

// Border radius options
const borderRadiusSchema = z.enum(['none', 'small', 'medium', 'large', 'full']);

// Density options
const densitySchema = z.enum(['compact', 'comfortable', 'spacious']);

// Theme schema
export const themeSchema = z.object({
  primary: colorSchema,
  secondary: colorSchema,
  accent: colorSchema,
  success: colorSchema,
  warning: colorSchema,
  error: colorSchema,
  info: colorSchema,
  fontFamily: fontFamilySchema,
  borderRadius: borderRadiusSchema,
  density: densitySchema,
});

// Branding schema
export const brandingSchema = z.object({
  appName: z.string().min(1).max(100),
  shortName: z.string().min(1).max(50),
  tagline: z.string().max(200).optional(),
  metaTitleTemplate: z.string().max(200).default('%s | Strategy Execution'),
  defaultMetaDescription: z.string().max(500).optional(),
  companyName: z.string().min(1).max(100),
  copyrightText: z.string().max(200).default('© {year} Your Organization. All rights reserved.'),
  privacyPolicyUrl: z.string().url().optional().or(z.literal('')),
  termsUrl: z.string().url().optional().or(z.literal('')),
  supportEmail: z.string().email().optional().or(z.literal('')),
  helpCenterUrl: z.string().url().optional().or(z.literal('')),
});

// Header elements schema
const headerElementsSchema = z.object({
  search: z.boolean().default(true),
  notifications: z.boolean().default(true),
  languageToggle: z.boolean().default(true),
  themeToggle: z.boolean().default(true),
  userMenu: z.boolean().default(true),
  aiAssistant: z.boolean().default(true),
});

// Navigation item schema
const navItemSchema = z.object({
  feature: z.string(),
  icon: z.string(),
  visible: z.boolean(),
  order: z.number().int().min(0),
});

// Navigation section schema
const navSectionSchema = z.object({
  key: z.string(),
  labelKey: z.string(),
  items: z.array(navItemSchema),
});

// Layout schema
export const layoutSchema = z.object({
  sidebar: z.object({
    position: z.enum(['left', 'right']).default('left'),
    variant: z.enum(['drawer', 'rail', 'mini']).default('drawer'),
    collapsible: z.boolean().default(true),
    defaultCollapsed: z.boolean().default(false),
    sections: z.array(navSectionSchema),
  }),
  header: z.object({
    variant: z.enum(['fixed', 'static', 'hidden']).default('fixed'),
    elements: headerElementsSchema,
  }),
  content: z.object({
    maxWidth: z.enum(['full', 'xl', 'lg', 'md']).default('xl'),
    padding: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
  }),
});

// Feature config schema
const featureConfigSchema = z.object({
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// Complete organization config schema
export const organizationConfigSchema = z.object({
  theme: themeSchema,
  branding: brandingSchema,
  layout: layoutSchema,
  navigation: z.array(navSectionSchema),
  features: z.record(z.string(), featureConfigSchema),
  customCSS: z.string().max(10000).optional(),
});

// Partial update schema (for PATCH requests)
export const organizationConfigPartialSchema = organizationConfigSchema.partial();

// Feature flag update schema
export const featureFlagUpdateSchema = z.object({
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// Branding asset upload schema
export const brandingAssetSchema = z.object({
  type: z.enum(['logo-light', 'logo-dark', 'favicon', 'icon-512']),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

// Dashboard template schema
export const dashboardWidgetSchema = z.object({
  id: z.string(),
  type: z.enum(['kpi-summary', 'objective-progress', 'approval-pending', 'recent-activity', 'custom-html', 'iframe', 'chart']),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
  }),
  config: z.record(z.string(), z.unknown()),
});

export const dashboardTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  layout: z.enum(['grid', 'freeform']).default('grid'),
  widgets: z.array(dashboardWidgetSchema),
});

// Type exports inferred from schemas
export type ThemeConfigInput = z.infer<typeof themeSchema>;
export type BrandingConfigInput = z.infer<typeof brandingSchema>;
export type LayoutConfigInput = z.infer<typeof layoutSchema>;
export type OrganizationConfigInput = z.infer<typeof organizationConfigSchema>;
