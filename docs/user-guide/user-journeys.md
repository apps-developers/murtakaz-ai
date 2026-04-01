# User Journeys

This document describes the end-to-end workflows supported by the application.

## Journey A — Executive (Situational Awareness → Drill-down)

1. Enter the product at `/<locale>`
2. Sign in via `/<locale>/auth/login` as an `EXECUTIVE`
3. Review the snapshot at `/<locale>/overview`
4. Open reports at `/<locale>/reports` and view:
   - Executive Summary — High-level organizational performance
   - Strategic Alignment — Pillar and objective achievement
   - KPI Performance — Detailed KPI analysis with trends
   - Tabular Report — Cross-entity performance view
5. Open dashboards at `/<locale>/dashboards` and select:
   - `/<locale>/dashboards/executive`
   - `/<locale>/dashboards/risk-escalation`
   - `/<locale>/dashboards/kpi-performance`
6. Drill down to entities via `/<locale>/entities/<entityTypeCode>/<entityId>`
7. Review measurements and trends
8. Review and approve/reject requests at `/<locale>/approvals`

## Journey B — Manager (Team & Execution Tracking)

1. Sign in as `MANAGER`
2. Open `/<locale>/responsibilities` to view team assignments
   - See subordinates and their assigned entities
   - View assignments by user or by entity
3. Open `/<locale>/reports` for team performance insights
4. Review `/<locale>/dashboards/manager` for execution status
5. Process approval requests at `/<locale>/approvals`

## Journey C — Admin (Organization Management)

1. Sign in as `ADMIN`
2. Open `/<locale>/users` to manage organization users:
   - Create new users with role assignment
   - Edit user details (name, email, role, manager)
   - Delete users
3. Open `/<locale>/departments` to manage departments:
   - Create/edit/delete departments
   - Assign department managers
4. Open `/<locale>/responsibilities` to assign entities to users
   - Bulk assign entities to users
   - Manage user-entity relationships
5. Open `/<locale>/admin` for organization settings
6. Open `/<locale>/organization` for configuration

## Journey D — Super Admin (System Administration)

1. Sign in as `SUPER_ADMIN`
2. Redirected to `/<locale>/super-admin` with system overview
3. Open `/<locale>/super-admin/organizations` to:
   - View all organizations
   - Create new organizations
   - Manage organization details
4. Open `/<locale>/super-admin/users` for cross-organization user management
5. Open `/<locale>/super-admin/settings` to:
   - Toggle feature flags (AI, Dashboards, Approvals, etc.)
   - Customize color theme

## Journey E — Approvals (Governance Queue)

1. Any authenticated user can access `/<locale>/approvals`
2. View pending approval requests
3. Open `/<locale>/approvals/<requestId>` for detail view
4. Review request details and add comments
5. Approve or reject requests
6. Approved changes are applied to the database

## Journey F — Responsibilities (Entity Assignment)

1. Access `/<locale>/responsibilities`
2. View mode options:
   - **By User** — See which entities are assigned to each user
   - **By Entity** — See which users are assigned to each entity
3. For Admin users:
   - Click **Assign** to open assignment dialog
   - Select multiple users to bulk assign
   - Click **X** to unassign users
4. For Managers:
   - View subordinates and their assignments
   - Cannot modify assignments (read-only)
