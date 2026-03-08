# UC-06 — Super Admin Creates a New Organization

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-06 |
| **Title** | Super Admin creates a new organization with entity types and initial users |
| **Primary Actor** | Super Admin (SUPER_ADMIN) |
| **Secondary Actors** | Organization Admin (created as part of setup), System |
| **Trigger** | A new client organization is onboarded onto the Rafed KPI platform |
| **Preconditions** | Super Admin is signed in with `SUPER_ADMIN` role |
| **Postconditions** | New organization exists; entity types configured; at least one Admin user can sign in and manage the org |
| **Priority** | Medium |

---

## User Journey

```
Super Admin signs in
      │
      ▼
Navigates to Super Admin panel
      │
      ▼
Clicks "Organizations"
      │
      ▼
Organizations list loads
      │
      ▼
Clicks "+ New Organization"
      │
      ▼
Create organization form opens
      │
      ▼
Fills in org identity
      │  Name (EN + AR), Domain, Logo URL
      │  Mission, Vision, About (EN + AR)
      ▼
Sets KPI Approval Level
      │  (MANAGER / EXECUTIVE / ADMIN)
      ▼
Configures Entity Types
      │  Default types pre-filled: Pillars, Objectives,
      │  Departments, Initiatives, KPIs
      │  Super Admin adds/removes/reorders as needed
      ▼
Adds initial users
      │  At least one ADMIN user required
      │  Fills: Name, Email, Password, Role
      ▼
Clicks "Create Organization"
      │
      ▼
System creates org + entity types + users atomically
      │
      ▼
Redirected to new org detail page
      │
      ▼
Super Admin reviews and optionally seeds data
      │
      ▼
Shares Admin credentials with client
      │
      ▼
Journey complete — org is live
```

---

## Main Flow (Step-by-Step)

1. Super Admin signs in. The sidebar shows **Super Admin** section (only visible to `SUPER_ADMIN` role).
2. Super Admin navigates to **Super Admin → Organizations** (`/<locale>/super-admin/organizations`).
3. The organizations list loads showing all existing organizations.
4. Super Admin clicks **+ New Organization**.
5. The **Create Organization** form opens (`/<locale>/super-admin/organizations/create`).
6. Super Admin fills in **Organization Identity**:
   - **Name** (English) — required, e.g., "Al-Mosa Group"
   - **Name (Arabic)** — e.g., "مجموعة الموسى"
   - **Domain** — email domain for user scoping, e.g., `almousa.com.sa`
   - **Logo URL** — optional link to the organization's logo image
   - **Mission** (EN + AR) — organization mission statement
   - **Vision** (EN + AR) — organization vision statement
   - **About** (EN + AR) — brief organizational description
7. Super Admin sets the **KPI Approval Level** — which role approves submitted KPI values:
   - `MANAGER` — a Manager approves
   - `EXECUTIVE` — an Executive approves
   - `ADMIN` — an Admin approves
8. Super Admin reviews and configures **Entity Types**. The form pre-fills with 5 default types:

   | Code | Name (EN) | Name (AR) |
   |------|-----------|-----------|
   | `pillar` | Pillars | الركائز |
   | `objective` | Objectives | الأهداف |
   | `department` | Departments | الإدارات |
   | `initiative` | Initiatives | المبادرات |
   | `kpi` | KPIs | مؤشرات الأداء |

   Super Admin can: add new types, remove unneeded ones, reorder using the up/down arrows, and edit names.

9. Super Admin adds **Initial Users** (at least one with role `ADMIN` is required):
   - **Name** — full name
   - **Email** — unique email address
   - **Password** — initial password
   - **Role** — `ADMIN`, `EXECUTIVE`, or `MANAGER`
   - Additional users can be added with the **+ Add User** button.

10. Super Admin clicks **Create Organization**.
11. The system validates all inputs (unique entity type codes, at least one Admin user, required fields filled).
12. On success, the organization is created atomically with all entity types and users.
13. Super Admin is redirected to the new organization's detail page (`/<locale>/super-admin/organizations/<orgId>`).
14. Super Admin reviews the created organization, entity types, and users.
15. Optionally, Super Admin seeds the organization with starter data via the seed interface.
16. Super Admin securely shares the Admin user's credentials with the client organization.

---

## Alternative Flows

### Alt A — Validation fails (duplicate entity type code)
At step 11, the system detects two entity types with the same code.
- An error is shown: "Entity type codes must be unique."
- Super Admin corrects the duplicate code and resubmits.

### Alt B — No Admin user added
At step 11, the system detects no user with role `ADMIN` in the users list.
- An error is shown: "At least one Admin user is required."
- Super Admin adds an Admin user and resubmits.

### Alt C — Super Admin wants to edit an existing organization
Super Admin navigates to the organization list, clicks an existing org row.
- The org detail page opens with edit dialogs for: Name, Domain, KPI Approval Level, Mission/Vision/About, Entity Types, and Users.
- Each section can be edited independently.

### Alt D — Super Admin needs to delete an organization
On the org detail page, Super Admin clicks **Delete Organization**.
- A confirmation dialog warns that this action is destructive.
- On confirm, the organization and all associated data are soft-deleted.

---

## Business Rules

- Organization creation is **atomic** — if any part fails (e.g., duplicate email), the entire creation rolls back.
- Entity type **codes** must be lowercase, unique within the organization, and are immutable once entities reference them.
- At least **one user with role `ADMIN`** must be included at creation time.
- The `domain` field is used to scope users — users with matching email domains are associated with this org.
- Super Admin users cannot access any organization's regular workspace (`/overview`, `/entities`, etc.) — they only operate in the `/super-admin` panel.
- Seed data operations append to or overwrite the org's data — should only be used during initial setup or for demo purposes.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Super Admin Organizations List | `/<locale>/super-admin/organizations` |
| Create Organization Form | `/<locale>/super-admin/organizations/create` |
| Organization Detail | `/<locale>/super-admin/organizations/<orgId>` |
| Super Admin Users | `/<locale>/super-admin/users` |
