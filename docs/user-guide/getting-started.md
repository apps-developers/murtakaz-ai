# Getting Started

## Supported Languages

The UI supports:

- English (LTR): `/en`
- Arabic (RTL): `/ar`

Visiting `/` redirects to `/en` by default.

## Sign In

1. Navigate to `/<locale>/auth/login`
2. Enter your email and password
3. Click **Sign In**

After signing in, you will be redirected based on your role:
- **SUPER_ADMIN** → `/<locale>/super-admin`
- All other roles → `/<locale>/overview`

## Primary Navigation

Once signed in, the left sidebar navigation provides access to:

### Main
- **Overview** — Dashboard with key metrics and "needs attention" items

### Strategy (Dynamic based on organization entity types)
- **Pillars** — Strategic pillars catalog
- **Objectives** — Organization objectives
- **Departments** — Department management
- Additional entity types are configured per organization

### Workflow
- **Dashboards** — Role-based analytics dashboards
- **Reports** — Executive, strategic, KPI, and tabular reports
- **Responsibilities** — Entity assignment management
- **Approvals** — Governance request queue

### Admin (Admin users only)
- **Admin** — Organization settings and audit
- **Organization** — Organization configuration
- **Users** — User directory and management
- **Departments** — Department administration

### Super Admin (SUPER_ADMIN only)
- **Super Admin Overview** — System-wide statistics
- **Organizations** — Multi-tenant organization management
- **Users** — Cross-organization user management
- **Settings** — System settings and feature flags

## Data Storage

The application uses a PostgreSQL database with Prisma ORM:

- All data is persisted server-side
- Real-time updates via Server Actions
- File uploads stored in `/public/uploads/`

## AI Assistant

When enabled, an AI Assistant panel is available in the workspace:
- Click the **AI Assistant** button in the header to toggle the panel
- Provides context-aware help and guidance
- Can be collapsed/expanded and persists state in localStorage

## Feature Flags

System administrators can enable/disable features via **Super Admin Settings**:

- AI Features
- Diagrams
- Advanced Features
- Approvals Workflow
- File Attachments
- Dashboards
- Notifications
- Audit Logs

## Theme & Language

- **Theme Toggle** — Switch between light/dark mode (persisted in localStorage)
- **Language Toggle** — Switch between English and Arabic
- **Color Theme** — Customize primary color accent (via Settings)
