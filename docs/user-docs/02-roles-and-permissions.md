# Roles & Permissions

Rafed KPI uses **Role-Based Access Control (RBAC)**. Every user is assigned exactly one role within their organization. Your role determines what pages you can visit, what data you can see, and what actions you can perform.

---

## Roles Overview

| Role | Who It's For | Access Level |
|------|-------------|--------------|
| **SUPER_ADMIN** | Platform-level administrators | Full platform access across all organizations |
| **ADMIN** | Organization administrators | Full access within the organization |
| **EXECUTIVE** | CEO, C-suite, senior leadership | Read-only org-wide view; dashboards; no data entry |
| **MANAGER** | Department heads, team leads | Can enter and submit KPI values; sees assigned entities |

> **Note:** There is no separate "Employee" role in the current schema. Employees use the **MANAGER** role level or are managed through user–entity assignments.

---

## Role Capabilities Matrix

| Capability | SUPER_ADMIN | ADMIN | EXECUTIVE | MANAGER |
|-----------|:-----------:|:-----:|:---------:|:-------:|
| View all entities (org-wide) | ✅ | ✅ | ✅ | Assigned only |
| Create / edit entities | ✅ | ✅ | ❌ | ❌ |
| Delete entities | ✅ | ✅ | ❌ | ❌ |
| Enter KPI values (Draft) | ✅ | ✅ | ❌ | ✅ |
| Submit KPI values for approval | ✅ | ✅ | ❌ | ✅ |
| Approve / reject KPI values | ✅ | ✅ | ✅ (if approval level = EXECUTIVE) | ✅ (if approval level = MANAGER) |
| View dashboards | ✅ | ✅ | ✅ | ✅ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| Access Admin panel | ✅ | ✅ | ❌ | ❌ |
| Manage organization settings | ✅ | ✅ | ❌ | ❌ |
| Access Super Admin panel | ✅ | ❌ | ❌ | ❌ |

---

## KPI Approval Levels

The organization-wide **KPI Approval Level** setting controls who is the designated approver for submitted KPI values:

| Setting | Approver |
|---------|----------|
| `MANAGER` | A user with role MANAGER approves |
| `EXECUTIVE` | A user with role EXECUTIVE approves |
| `ADMIN` | A user with role ADMIN approves |

This setting is configured by the Admin at the organization level (`/en/admin`).

---

## Entity Visibility

- **ADMIN / EXECUTIVE**: can see **all entities** across the entire organization.
- **MANAGER**: sees entities they are **assigned to** via `UserEntityAssignment`, plus any entities they **own** (`ownerUserId`).
- Users not assigned to an entity cannot view or interact with it.

---

## Role-Specific Navigation

### ADMIN
Full sidebar with all sections, including:
- Admin panel (`/admin`)
- User management (`/admin/users`)
- All entities, KPIs, dashboards, approvals

### EXECUTIVE
- Overview, Dashboards, Entities (read-only), Approvals (as approver)
- No create/edit/delete on entities or KPI values

### MANAGER
- Overview, Entities (assigned), KPIs (assigned), Approvals (as submitter)
- Dashboards (manager-level views)
- Can enter and submit KPI data for assigned entities

---

## Changing a User's Role

Only **ADMIN** or **SUPER_ADMIN** can change user roles:

1. Navigate to **Admin** → **Users** (`/admin/users`).
2. Select the user.
3. Update their role using the role selector.
4. Save changes.

Role changes take effect on the user's next page load (no session restart required in most cases).
