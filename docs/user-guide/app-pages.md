# App Pages

This is a page-by-page guide to the application.

## Marketing / Public

- `/<locale>` — Landing page with product positioning and section anchors
- `/<locale>/pricing`, `/<locale>/faq`, `/<locale>/about`, `/<locale>/contact`, `/<locale>/careers`
- `/<locale>/privacy`, `/<locale>/terms`

## Authentication

- `/<locale>/auth/login` — Email/password sign in
- `/<locale>/login` — Alternative login entry point

## Workspace (Authenticated)

### Overview

- `/<locale>/overview`
  - Key metrics snapshot (pillars / initiatives / projects / KPIs)
  - "Needs attention" queue (open risks, escalations, stale KPIs, pending approvals)
  - Quick links into Strategy, KPI drill-down, and Approvals

### Strategy — Pillars

- `/<locale>/pillars` — Strategic pillars catalog

### Strategy — Objectives

- `/<locale>/objectives` — Organization objectives listing

### Strategy — Departments

- `/<locale>/departments` — Department directory with managers and users
- `/<locale>/departments/new` — Create new department (Admin only)

### Dynamic Entities

- `/<locale>/entities/<entityTypeCode>` — Entity type catalog (KPIs, Initiatives, Projects, Tasks)
- `/<locale>/entities/<entityTypeCode>/<entityId>` — Entity detail view

### Dashboards

- `/<locale>/dashboards` — Dashboard catalog
- `/<locale>/dashboards/executive` — Executive summary dashboard
- `/<locale>/dashboards/pmo` — PMO dashboard
- `/<locale>/dashboards/pillar` — Pillar performance dashboard
- `/<locale>/dashboards/initiative-health` — Initiative health tracking
- `/<locale>/dashboards/project-execution` — Project execution dashboard
- `/<locale>/dashboards/kpi-performance` — KPI performance analytics
- `/<locale>/dashboards/risk-escalation` — Risk escalation dashboard
- `/<locale>/dashboards/governance` — Governance dashboard
- `/<locale>/dashboards/manager` — Manager dashboard
- `/<locale>/dashboards/employee-contribution` — Employee contribution view

### Reports

- `/<locale>/reports` — Reports hub with tabs:
  - **Executive Summary** — High-level organizational performance
  - **Strategic Alignment** — Pillar and objective achievement tracking
  - **KPI Performance** — Detailed KPI analysis with trends
  - **Tabular Report** — Cross-entity KPI performance with filters and export

### Responsibilities

- `/<locale>/responsibilities` — Entity assignment management
  - **By User** tab — View and manage assignments per user
  - **By Entity** tab — View and manage users per entity
  - Bulk assign/unassign capabilities (Admin only)

### Approvals (Governance)

- `/<locale>/approvals` — Approval requests queue
- `/<locale>/approvals/<requestId>` — Request detail view with approve/reject actions

### Nodes

- `/<locale>/nodes/<code>` — Node detail pages for organizational structure

### Admin (Organization Admin)

- `/<locale>/admin` — Organization admin dashboard
- `/<locale>/admin/users` — User directory with create/edit/delete
- `/<locale>/admin/users/<userId>` — User detail view

### Organization

- `/<locale>/organization` — Organization settings and configuration

### Users

- `/<locale>/users` — Organization user directory (Admin only)
  - Create new users with role assignment
  - Edit user details (name, email, role, manager)
  - Delete users
  - Manager hierarchy support

### Profile

- `/<locale>/profile` — Current user profile and settings

### Super Admin (SUPER_ADMIN only)

- `/<locale>/super-admin` — System overview with organization and user counts
- `/<locale>/super-admin/organizations` — Multi-tenant organization listing
- `/<locale>/super-admin/organizations/create` — Create new organization
- `/<locale>/super-admin/organizations/<orgId>` — Organization detail
- `/<locale>/super-admin/users` — Cross-organization user management
- `/<locale>/super-admin/users/<userId>` — User detail
- `/<locale>/super-admin/settings` — System settings:
  - Feature flags toggle (AI, Diagrams, Dashboards, Approvals, etc.)
  - Color theme customization
- `/<locale>/super-admin/profile` — Super admin profile
