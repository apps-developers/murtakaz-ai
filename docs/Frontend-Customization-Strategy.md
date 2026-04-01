# Frontend Customization Strategy for Multi-Tenant Customers

## Executive Summary

This document outlines architectural approaches to make the Rafed strategy execution platform customizable for different enterprise customers (tenants), enabling white-labeling, theme variations, feature toggles, and custom workflows without maintaining separate codebases.

---

## 1. Current Architecture Analysis

### Existing Customization Points
| Feature | Current Implementation | Customization Level |
|---------|----------------------|---------------------|
| Color Themes | 6 CSS theme variants (blue, emerald, violet, rose, orange, slate) | ✅ User-selectable |
| Dark/Light Mode | CSS class-based with localStorage persistence | ✅ User-selectable |
| RTL/LTR | Locale-based (ar/en) with HTML dir attribute | ✅ Automatic |
| Organization Logo | Dynamic from `getOrgLogo()` action | ✅ Per-tenant |
| Feature Flags | `feature-flags.ts` + `feature-flag-guard.tsx` | ✅ Per-deployment |
| AI Features | `ai-features.ts` with granular toggles | ✅ Configurable |
| Entity Types | Dynamic from `getMyOrganizationEntityTypes()` | ✅ Runtime-driven |

### Architecture Strengths
- **CSS Variables**: All colors use CSS custom properties enabling runtime theming
- **Component Modularization**: shadcn/ui components with `class-variance-authority`
- **Server Actions**: Business logic separation from presentation
- **i18n**: Message-based translation system (`messages/ar.json`, `messages/en.json`)

---

## 2. Recommended Customization Architecture

### 2.1 Theme System Enhancement

#### Current: Static CSS Themes
```css
[data-color-theme="emerald"]:root { --primary: 160 84% 24%; }
```

#### Proposed: Dynamic Theme Configuration
```typescript
// types/theme.ts
interface CustomerTheme {
  // Brand Colors
  primary: string;           // HSL or hex
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
  
  // Custom CSS overrides
  customCSS?: string;
}
```

**Implementation Approach:**
1. Store theme config in database per organization
2. Inject CSS variables via inline `<style>` tag in layout
3. Use CSS cascade layers for customer overrides

```tsx
// app/[locale]/layout.tsx
export default async function Layout({ params, children }) {
  const org = await getOrganization(params.locale);
  const theme = await getOrgTheme(org.id);
  
  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

### 2.2 White-Label Branding System

#### Logo Management
| Asset Type | Storage | Delivery |
|------------|---------|----------|
| Logo Light | R2/S3 + CDN | `/api/branding/[orgId]/logo-light` |
| Logo Dark | R2/S3 + CDN | `/api/branding/[orgId]/logo-dark` |
| Favicon | R2/S3 + CDN | `/api/branding/[orgId]/favicon.ico` |
| App Icon (PWA) | R2/S3 + CDN | `/api/branding/[orgId]/icon-512.png` |

#### Brand Strings Configuration
```typescript
// types/branding.ts
interface BrandingConfig {
  // App Identity
  appName: string;           // "Al Mousa Strategy Portal"
  shortName: string;         // "Mousa Strategy"
  tagline?: string;          // "Execute with Excellence"
  
  // Meta Information
  metaTitleTemplate: string; // "%s | {appName}"
  defaultMetaDescription: string;
  
  // Legal
  companyName: string;
  copyrightText: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  
  // Support
  supportEmail?: string;
  helpCenterUrl?: string;
  
  // Custom Domain (future)
  customDomain?: string;
}
```

---

### 2.3 Feature Modules Architecture

#### Modular Feature System
```
src/
├── features/
│   ├── core/              # Always-on features
│   │   ├── overview/
│   │   ├── dashboards/
│   │   └── reports/
│   ├── strategy/          # Strategy management
│   │   ├── pillars/
│   │   ├── objectives/
│   │   └── initiatives/
│   ├── governance/        # Approval workflows
│   │   ├── approvals/
│   │   └── responsibilities/
│   ├── ai/                # AI assistant features
│   │   ├── chat/
│   │   └── insights/
│   └── admin/             # Administration
│       ├── users/
│       └── organization/
```

#### Feature Registry
```typescript
// lib/features/registry.ts
export const featureRegistry = {
  'strategy.pillars': {
    name: 'Strategy Pillars',
    description: 'Manage organizational strategic pillars',
    icon: 'tabler:columns-3',
    defaultEnabled: true,
    requires: ['core.overview'],
    routes: ['/pillars'],
    navigation: { section: 'strategy', order: 1 }
  },
  'governance.approvals': {
    name: 'Approval Workflows',
    description: 'Multi-stage approval processes',
    icon: 'tabler:gavel',
    defaultEnabled: false,
    requires: ['core.overview'],
    routes: ['/approvals'],
    navigation: { section: 'governance', order: 1 }
  },
  // ... more features
};

// Database-driven feature flags per organization
type OrgFeatureFlag = {
  organizationId: string;
  featureKey: string;
  enabled: boolean;
  config?: Record<string, unknown>;  // Feature-specific settings
};
```

---

### 2.4 Layout Customization System

#### Configurable Layout Components
```typescript
// types/layout.ts
interface LayoutConfig {
  // Navigation
  sidebar: {
    position: 'left' | 'right';  // RTL-aware
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

type NavSectionConfig = {
  key: string;
  labelKey: TranslationKey;
  items: Array<{
    feature: string;        // Links to feature registry
    icon: string;
    visible: boolean;
    order: number;
  }>;
};
```

---

### 2.5 Dashboard & Widget System

#### Customizable Dashboards
```typescript
// types/dashboard.ts
interface DashboardConfig {
  id: string;
  organizationId: string;
  userId?: string;           // null = organization default
  name: string;
  layout: 'grid' | 'freeform';
  widgets: WidgetConfig[];
}

type WidgetConfig = {
  id: string;
  type: WidgetType;
  position: { x: number; y: number; w: number; h: number };
  config: WidgetSpecificConfig;
};

type WidgetType = 
  | 'kpi-summary' 
  | 'objective-progress' 
  | 'approval-pending'
  | 'recent-activity'
  | 'custom-html'           // Customer-specific content
  | 'iframe'                // External embed
  | 'chart';                // Custom chart configuration
```

---

### 2.6 Custom Entity Types

#### Dynamic Entity Configuration
Currently, entity types are partially dynamic. Full customization:

```typescript
// types/entity.ts
interface EntityTypeConfig {
  key: string;               // 'initiative', 'project', 'milestone'
  organizationId?: string;   // null = system default
  
  // Display
  label: Record<Locale, string>;  // {"ar": "المبادرة", "en": "Initiative"}
  pluralLabel: Record<Locale, string>;
  icon: string;              // Iconify identifier
  color: string;             // Hex color for visual distinction
  
  // Fields
  fields: EntityField[];
  
  // Relationships
  parentTypes: string[];     // Can be child of these
  childTypes: string[];      // Can have these as children
  
  // Workflow
  hasStatus: boolean;
  statuses?: EntityStatus[];
  hasApproval: boolean;
  
  // Permissions
  permissions: EntityPermissions;
}

type EntityField = {
  key: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'user' | 'entity';
  label: Record<Locale, string>;
  required: boolean;
  visible: {
    list: boolean;
    detail: boolean;
    create: boolean;
    edit: boolean;
  };
  options?: Array<{ value: string; label: Record<Locale, string> }>;
};
```

---

### 2.7 Workflow Customization

#### Configurable Approval Workflows
```typescript
// types/workflow.ts
interface WorkflowConfig {
  id: string;
  organizationId: string;
  name: string;
  appliesTo: {
    entityTypes: string[];
    departments?: string[];
  };
  
  stages: WorkflowStage[];
  
  // Rules
  autoApproveIf?: {
    threshold?: number;      // Auto-approve if value < threshold
    departments?: string[];  // Auto-approve for these departments
  };
  
  notifications: {
    onSubmit: boolean;
    onApproval: boolean;
    onRejection: boolean;
    reminderFrequency: 'daily' | 'weekly' | 'never';
  };
}

type WorkflowStage = {
  order: number;
  name: string;
  approvers: {
    type: 'user' | 'role' | 'department_head' | 'matrix';
    value: string;
  }[];
  condition?: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'contains';
    value: unknown;
  };
};
```

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema for org-level configuration
- [ ] Theme service with CSS generation
- [ ] Branding asset storage API
- [ ] Feature flag persistence layer

### Phase 2: Core Customization (Weeks 3-4)
- [ ] Dynamic theme injection in layout
- [ ] Configurable navigation structure
- [ ] Feature-guarded routing
- [ ] Organization branding UI

### Phase 3: Advanced Customization (Weeks 5-6)
- [ ] Widget-based dashboard builder
- [ ] Custom field management
- [ ] Workflow visual editor
- [ ] Layout preferences persistence

### Phase 4: Enterprise Features (Weeks 7-8)
- [ ] Custom domain support
- [ ] SSO branding customization
- [ ] Email template customization
- [ ] Export branding configuration

---

## 4. Technical Implementation Details

### 4.1 Database Schema Additions

```prisma
// prisma/schema.prisma additions

model OrganizationConfig {
  id              String   @id @default(uuid())
  organizationId  String   @unique
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  // JSON configs
  theme           Json?
  branding        Json?
  layout          Json?
  features        Json?    // Enabled features and their configs
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model FeatureFlag {
  id              String   @id @default(uuid())
  organizationId  String
  featureKey      String
  enabled         Boolean  @default(false)
  config          Json?    // Feature-specific configuration
  
  @@unique([organizationId, featureKey])
}

model CustomEntityType {
  id              String   @id @default(uuid())
  organizationId  String?
  key             String
  config          Json     // Full entity type configuration
  
  @@unique([organizationId, key])
}

model DashboardTemplate {
  id              String   @id @default(uuid())
  organizationId  String
  name            String
  isDefault       Boolean  @default(false)
  config          Json     // Widget layout and configuration
  
  userDashboards  UserDashboard[]
}

model UserDashboard {
  id              String   @id @default(uuid())
  userId          String
  templateId      String?
  template        DashboardTemplate? @relation(fields: [templateId], references: [id])
  config          Json?
}
```

### 4.2 API Structure

```
/api/config/
├── theme              # GET/PUT organization theme
├── branding           # GET/PUT branding config + logo upload
├── layout             # GET/PUT layout configuration
└── features           # GET/PUT feature flags

/api/admin/
├── entity-types       # CRUD custom entity types
├── workflows          # CRUD custom workflows
└── dashboards/
    ├── templates      # CRUD dashboard templates
    └── clone          # Clone system template
```

### 4.3 Client-Side Hooks

```typescript
// hooks/use-org-config.ts
export function useOrgConfig() {
  const { data: config } = useSWR('/api/config', fetcher);
  
  return {
    theme: config?.theme,
    branding: config?.branding,
    features: config?.features || {},
    isFeatureEnabled: (key: string) => config?.features?.[key]?.enabled ?? false,
    layout: config?.layout,
  };
}

// hooks/use-theme-vars.ts
export function useThemeVars() {
  const { theme } = useOrgConfig();
  
  useEffect(() => {
    if (!theme) return;
    
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    // ... set all CSS variables
  }, [theme]);
}

// hooks/use-feature-gate.ts (enhancement)
export function useFeatureGate(featureKey: string) {
  const { isFeatureEnabled } = useOrgConfig();
  const { user } = useAuth();
  
  // Check org-level + user-level + permission-level
  return {
    enabled: isFeatureEnabled(featureKey) && checkUserPermission(user, featureKey),
    reason: !isFeatureEnabled(featureKey) ? 'org_disabled' : 
            !checkUserPermission(user, featureKey) ? 'no_permission' : null
  };
}
```

---

## 5. Customer-Specific Customization Scenarios

### Scenario 1: Different Industry Verticals

| Vertical | Customization |
|----------|---------------|
| Healthcare | Custom entity types: "Clinical Initiative", "Compliance Objective" |
| Finance | Additional workflow stages for regulatory approval |
| Manufacturing | KPIs focused on production metrics, supply chain |
| Education | Semester-based timelines, academic department structure |

### Scenario 2: Regional Variations

| Region | Customization |
|--------|---------------|
| Saudi Arabia | Full RTL, Hijri calendar, Saudi-specific compliance |
| UAE | English default, specific free zone entity types |
| Egypt | Arabic-first, government-specific workflow patterns |

### Scenario 3: Organizational Maturity

| Maturity | Features Enabled |
|----------|------------------|
| Startup | Basic objectives, simple approvals, minimal governance |
| Growth | Full strategy cascade, department-level KPIs |
| Enterprise | Multi-level workflows, advanced analytics, custom dashboards |

---

## 6. Security & Isolation Considerations

### Data Isolation
```typescript
// middleware.ts enhancement
export function middleware(request: NextRequest) {
  // Extract organization from:
  // 1. Custom subdomain (customer.rafed.app)
  // 2. Header (X-Organization-ID)
  // 3. User's session (fallback)
  
  const orgId = resolveOrganization(request);
  request.headers.set('x-organization-id', orgId);
  
  return NextResponse.next({
    request: { headers: request.headers }
  });
}
```

### Configuration Validation
```typescript
// lib/config/validation.ts
const themeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),  // Hex color only
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  // ... other validations
});

const featureSchema = z.object({
  key: z.enum(Object.keys(featureRegistry) as [string, ...string[]]),
  enabled: z.boolean(),
  config: z.record(z.unknown()).optional(),
});
```

---

## 7. Migration Strategy

### From Current to Customizable

1. **Extract Hardcoded Values**
   - Brand strings → Database config
   - Navigation items → Config-driven array
   - Theme CSS → Dynamic generation

2. **Backward Compatibility**
   ```typescript
   // lib/config/defaults.ts
   export const defaultConfig: OrganizationConfig = {
     theme: { primary: '#1e40af', ...blueTheme },
     branding: { appName: 'Strategy Execution', ... },
     features: Object.fromEntries(
       Object.entries(featureRegistry).map(([k, v]) => [k, v.defaultEnabled])
     ),
     layout: defaultLayoutConfig,
   };
   
   // Migration: Apply defaults to existing orgs
   // SELECT * FROM organizations WHERE NOT EXISTS (
   //   SELECT 1 FROM organization_config WHERE organization_id = organizations.id
   // )
   ```

3. **Gradual Rollout**
   - Feature flags for new customization features
   - Beta customers get early access
   - A/B testing for major layout changes

---

## 8. Performance Considerations

### Caching Strategy
```typescript
// lib/config/cache.ts
import { unstable_cache } from 'next/cache';

export const getOrgConfig = unstable_cache(
  async (orgId: string) => {
    return prisma.organizationConfig.findUnique({ where: { organizationId: orgId } });
  },
  ['org-config'],
  { revalidate: 60, tags: ['org-config'] }
);

// On config update:
// revalidateTag('org-config')
```

### CSS Delivery
- Inline critical theme variables in `<head>`
- Lazy-load non-critical theme variations
- Use CSS containment for widget isolation

### Asset Optimization
- Logo variants pre-generated at upload (light/dark, various sizes)
- CDN with proper cache headers
- SVG logos preferred for scalability

---

## 9. Testing Strategy

### Test Matrix
| Test Type | Scope |
|-----------|-------|
| Unit | Theme CSS generation, config validation |
| Integration | Feature flag resolution, navigation rendering |
| E2E | Full tenant isolation, custom domain routing |
| Visual | Theme application across all components |
| Accessibility | RTL layouts, color contrast compliance |

### Automated Tests
```typescript
// tests/customization/theme.spec.ts
describe('Theme System', () => {
  it('applies custom primary color', async () => {
    const config = generateMockConfig({ theme: { primary: '#ff0000' } });
    const { container } = render(<TestApp config={config} />);
    
    expect(container).toHaveStyle('--primary: #ff0000');
  });
  
  it('respects feature flags', async () => {
    const config = generateMockConfig({ 
      features: { 'governance.approvals': false } 
    });
    const { queryByText } = render(<Navigation config={config} />);
    
    expect(queryByText('Approvals')).not.toBeInTheDocument();
  });
});
```

---

## 10. Conclusion & Next Steps

### Immediate Actions
1. **Database Migration**: Create `OrganizationConfig` and related tables
2. **Theme Service**: Build dynamic CSS generation utility
3. **Admin UI**: Configuration panel for super-admins
4. **Feature Gate Enhancement**: Connect to database-driven flags

### Success Metrics
- Time to onboard new tenant: < 30 minutes
- Customer satisfaction with customization: > 4.5/5
- Support tickets for "can we change X": reduced by 80%
- Custom domain adoption: > 50% of enterprise customers

### Long-term Vision
- **Marketplace**: Pre-built templates for different industries
- **Self-Service**: Customer admin panels for full customization
- **Extensions**: Plugin system for customer-specific features
- **AI-Powered**: Automatic theme suggestions based on brand assets

---

## Appendix: File Structure Proposal

```
web/src/
├── app/
│   └── [locale]/
│       ├── layout.tsx              # Injects dynamic theme/config
│       └── [...]
├── components/
│   ├── branding/
│   │   ├── dynamic-logo.tsx        # Org-aware logo component
│   │   ├── favicon-generator.tsx   # Dynamic favicon
│   │   └── meta-tags.tsx           # Dynamic metadata
│   ├── layout/
│   │   ├── configurable-shell.tsx  # Layout config consumer
│   │   ├── dynamic-nav.tsx         # Config-driven navigation
│   │   └── widget-grid.tsx         # Dashboard widget container
│   └── theme/
│       ├── css-generator.ts        # Theme → CSS string
│       ├── theme-provider.tsx      # Theme context/provider
│       └── color-picker.tsx        # Admin color selection
├── lib/
│   ├── config/
│   │   ├── defaults.ts             # Default configurations
│   │   ├── validation.ts           # Zod schemas
│   │   ├── cache.ts                # Caching utilities
│   │   └── types.ts                # TypeScript definitions
│   ├── features/
│   │   ├── registry.ts             # Feature definitions
│   │   ├── guards.tsx              # UI guards
│   │   └── hooks.ts                # Feature detection hooks
│   └── branding/
│       ├── storage.ts              # R2/S3 upload/download
│       ├── processing.ts           # Image optimization
│       └── urls.ts                 # URL generation
├── hooks/
│   ├── use-org-config.ts
│   ├── use-feature-gate.ts
│   └── use-theme-vars.ts
└── types/
    ├── theme.ts
    ├── branding.ts
    ├── layout.ts
    └── features.ts
```
