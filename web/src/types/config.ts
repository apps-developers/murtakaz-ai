// types/config.ts - Organization Configuration Types

export interface CustomerTheme {
  // Brand Colors (HSL format: "215 62% 30%")
  primary: string;
  secondary: string;
  accent: string;

  // Semantic Colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Typography
  fontFamily: {
    primary: string;
    secondary?: string;
    monospace?: string;
  };

  // Spacing & Shapes
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface BrandingConfig {
  // App Identity
  appName: string;
  shortName: string;
  tagline?: string;

  // Meta Information
  metaTitleTemplate: string;
  defaultMetaDescription: string;

  // Legal
  companyName: string;
  copyrightText: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;

  // Support
  supportEmail?: string;
  helpCenterUrl?: string;
}

export interface LayoutConfig {
  // Navigation
  sidebar: {
    position: 'left' | 'right';
    variant: 'drawer' | 'rail' | 'mini';
    collapsible: boolean;
    defaultCollapsed: boolean;
    sections: NavSectionConfig[];
  };

  // Header
  header: {
    variant: 'fixed' | 'static' | 'hidden';
    elements: {
      search: boolean;
      notifications: boolean;
      languageToggle: boolean;
      themeToggle: boolean;
      userMenu: boolean;
      aiAssistant: boolean;
    };
  };

  // Content
  content: {
    maxWidth: 'full' | 'xl' | 'lg' | 'md';
    padding: 'none' | 'small' | 'medium' | 'large';
  };
}

export interface NavSectionConfig {
  key: string;
  labelKey: string;
  items: NavItemConfig[];
}

export interface NavItemConfig {
  feature: string;
  icon: string;
  visible: boolean;
  order: number;
}

// Feature Types
export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  requires: string[];
  routes: string[];
  navigation?: {
    section: string;
    order: number;
  };
}

export interface OrgFeatureConfig {
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Dashboard Types
export interface DashboardTemplateConfig {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  layout: 'grid' | 'freeform';
  widgets: WidgetConfig[];
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: Record<string, unknown>;
}

export type WidgetType =
  | 'kpi-summary'
  | 'objective-progress'
  | 'approval-pending'
  | 'recent-activity'
  | 'custom-html'
  | 'iframe'
  | 'chart';

// Entity Types
export interface EntityTypeConfig {
  key: string;
  label: Record<string, string>;
  pluralLabel: Record<string, string>;
  icon: string;
  color: string;
  fields: EntityFieldConfig[];
  parentTypes: string[];
  childTypes: string[];
  hasStatus: boolean;
  statuses?: EntityStatusConfig[];
  hasApproval: boolean;
}

export interface EntityFieldConfig {
  key: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'user' | 'entity';
  label: Record<string, string>;
  required: boolean;
  visible: {
    list: boolean;
    detail: boolean;
    create: boolean;
    edit: boolean;
  };
  options?: Array<{ value: string; label: Record<string, string> }>;
}

export interface EntityStatusConfig {
  key: string;
  label: Record<string, string>;
  color: string;
}

// Complete Organization Configuration
export interface OrganizationConfig {
  theme: CustomerTheme;
  branding: BrandingConfig;
  layout: LayoutConfig;
  navigation: NavSectionConfig[];
  features: Record<string, OrgFeatureConfig>;
  customCSS?: string;
}

// API Response Types
export interface ConfigResponse {
  theme: CustomerTheme;
  branding: BrandingConfig;
  layout: LayoutConfig;
  navigation: NavSectionConfig[];
  features: Record<string, OrgFeatureConfig>;
  customCSS?: string;
}
