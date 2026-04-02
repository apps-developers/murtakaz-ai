// lib/config/defaults.ts - Default configuration values

import type {
  CustomerTheme,
  BrandingConfig,
  LayoutConfig,
  OrganizationConfig,
  NavSectionConfig,
  FeatureDefinition,
} from '@/types/config';

// Default theme configuration (Blue theme from globals.css)
export const defaultTheme: CustomerTheme = {
  primary: '215 62% 30%',
  secondary: '215 30% 92%',
  accent: '215 35% 90%',
  success: '160 84% 39%',
  warning: '38 92% 50%',
  error: '0 84% 60%',
  info: '215 62% 50%',
  fontFamily: {
    primary: '"Rubik", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    secondary: undefined,
    monospace: undefined,
  },
  borderRadius: 'medium',
  density: 'comfortable',
};

// Default branding configuration
export const defaultBranding: BrandingConfig = {
  appName: 'Strategy Execution & Performance',
  shortName: 'Strategy',
  tagline: 'Execute with Excellence',
  metaTitleTemplate: '%s | Strategy Execution',
  defaultMetaDescription: 'Executive-grade platform for strategy execution, KPIs, and governance',
  companyName: 'Your Organization',
  copyrightText: '© {year} Your Organization. All rights reserved.',
  privacyPolicyUrl: undefined,
  termsUrl: undefined,
  supportEmail: undefined,
  helpCenterUrl: undefined,
};

// Default layout configuration
export const defaultLayout: LayoutConfig = {
  sidebar: {
    position: 'left',
    variant: 'drawer',
    collapsible: true,
    defaultCollapsed: false,
    sections: [], // Will be populated from navigation
  },
  header: {
    variant: 'fixed',
    elements: {
      search: true,
      notifications: true,
      languageToggle: true,
      themeToggle: true,
      userMenu: true,
      aiAssistant: true,
    },
  },
  content: {
    maxWidth: 'xl',
    padding: 'medium',
  },
};

// Feature Registry - All available features
export const featureRegistry: Record<string, FeatureDefinition> = {
  'core.overview': {
    key: 'core.overview',
    name: 'Overview',
    description: 'Main dashboard and overview page',
    icon: 'tabler:layout-dashboard',
    defaultEnabled: true,
    requires: [],
    routes: ['/overview'],
    navigation: { section: 'core', order: 1 },
  },
  'strategy.pillars': {
    key: 'strategy.pillars',
    name: 'Strategy Pillars',
    description: 'Manage organizational strategic pillars',
    icon: 'tabler:columns-3',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/pillars'],
    navigation: { section: 'strategy', order: 1 },
  },
  'strategy.objectives': {
    key: 'strategy.objectives',
    name: 'Objectives',
    description: 'Manage strategic objectives',
    icon: 'tabler:flag-3',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/objectives'],
    navigation: { section: 'strategy', order: 2 },
  },
  'core.dashboards': {
    key: 'core.dashboards',
    name: 'Dashboards',
    description: 'Custom dashboards and analytics',
    icon: 'tabler:layout-dashboard',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/dashboards'],
    navigation: { section: 'core', order: 2 },
  },
  'core.reports': {
    key: 'core.reports',
    name: 'Reports',
    description: 'Generate and view reports',
    icon: 'tabler:table',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/reports'],
    navigation: { section: 'core', order: 3 },
  },
  'governance.responsibilities': {
    key: 'governance.responsibilities',
    name: 'Responsibilities',
    description: 'Manage entity assignments and responsibilities',
    icon: 'tabler:user-check',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/responsibilities'],
    navigation: { section: 'governance', order: 1 },
  },
  'governance.approvals': {
    key: 'governance.approvals',
    name: 'Approval Workflows',
    description: 'Multi-stage approval processes',
    icon: 'tabler:gavel',
    defaultEnabled: false,
    requires: ['core.overview'],
    routes: ['/approvals'],
    navigation: { section: 'governance', order: 2 },
  },
  'admin.users': {
    key: 'admin.users',
    name: 'Users',
    description: 'Manage organization users',
    icon: 'tabler:users',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/users'],
    navigation: { section: 'admin', order: 1 },
  },
  'admin.organization': {
    key: 'admin.organization',
    name: 'Organization',
    description: 'Organization settings and configuration',
    icon: 'tabler:building',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/organization'],
    navigation: { section: 'admin', order: 2 },
  },
  'admin.settings': {
    key: 'admin.settings',
    name: 'Settings',
    description: 'System settings and customization',
    icon: 'tabler:settings',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/admin/settings'],
    navigation: { section: 'admin', order: 3 },
  },
  'super.overview': {
    key: 'super.overview',
    name: 'Super Admin Overview',
    description: 'Super admin dashboard',
    icon: 'tabler:home',
    defaultEnabled: false,
    requires: [],
    routes: ['/super-admin'],
    navigation: { section: 'super', order: 1 },
  },
  'super.organizations': {
    key: 'super.organizations',
    name: 'Organizations',
    description: 'Manage all organizations',
    icon: 'tabler:building-community',
    defaultEnabled: false,
    requires: [],
    routes: ['/super-admin/organizations'],
    navigation: { section: 'super', order: 2 },
  },
  'ai.assistant': {
    key: 'ai.assistant',
    name: 'AI Assistant',
    description: 'AI-powered chat and insights',
    icon: 'tabler:robot',
    defaultEnabled: false,
    requires: ['core.overview'],
    routes: [],
    navigation: undefined,
  },
  'diagrams.visualization': {
    key: 'diagrams.visualization',
    name: 'Diagrams',
    description: 'Visual entity relationship diagrams',
    icon: 'tabler:graph',
    defaultEnabled: false,
    requires: ['core.overview'],
    routes: [],
    navigation: undefined,
  },
};

// Default navigation structure
export const defaultNavigation: NavSectionConfig[] = [
  {
    key: 'core',
    labelKey: 'nav.core',
    items: [
      { feature: 'core.overview', icon: 'tabler:layout-dashboard', visible: true, order: 1 },
      { feature: 'core.dashboards', icon: 'tabler:layout-dashboard', visible: true, order: 2 },
      { feature: 'core.reports', icon: 'tabler:table', visible: true, order: 3 },
    ],
  },
  {
    key: 'strategy',
    labelKey: 'nav.strategy',
    items: [
      { feature: 'strategy.pillars', icon: 'tabler:columns-3', visible: true, order: 1 },
      { feature: 'strategy.objectives', icon: 'tabler:flag-3', visible: true, order: 2 },
    ],
  },
  {
    key: 'governance',
    labelKey: 'nav.governance',
    items: [
      { feature: 'governance.responsibilities', icon: 'tabler:user-check', visible: true, order: 1 },
      { feature: 'governance.approvals', icon: 'tabler:gavel', visible: false, order: 2 },
    ],
  },
  {
    key: 'admin',
    labelKey: 'nav.admin',
    items: [
      { feature: 'admin.users', icon: 'tabler:users', visible: true, order: 1 },
      { feature: 'admin.organization', icon: 'tabler:building', visible: true, order: 2 },
      { feature: 'admin.settings', icon: 'tabler:settings', visible: true, order: 3 },
    ],
  },
  {
    key: 'super',
    labelKey: 'nav.superAdmin',
    items: [
      { feature: 'super.overview', icon: 'tabler:home', visible: false, order: 1 },
      { feature: 'super.organizations', icon: 'tabler:building-community', visible: false, order: 2 },
    ],
  },
];

// Build default features map from registry
export function buildDefaultFeatures(): Record<string, { enabled: boolean; config?: Record<string, unknown> }> {
  return Object.fromEntries(
    Object.entries(featureRegistry).map(([key, def]) => [
      key,
      { enabled: def.defaultEnabled, config: {} },
    ])
  );
}

// Complete default configuration
export function getDefaultConfig(): OrganizationConfig {
  return {
    theme: defaultTheme,
    branding: defaultBranding,
    layout: defaultLayout,
    navigation: defaultNavigation,
    features: buildDefaultFeatures(),
    customCSS: undefined,
  };
}
