# Admin Guide

This guide covers the administrative functions available to users with the **ADMIN** or **SUPER_ADMIN** role.

---

## Accessing the Admin Panel

Navigate to `/<locale>/admin` via the **Admin** link in the left sidebar (visible only to ADMIN and SUPER_ADMIN roles).

---

## Admin Panel Sections

### 1. Organization Settings

Located at the top of the Admin page. Displays and allows editing of:

| Field | Description |
|-------|-------------|
| **Organization Name** | The display name of the organization |
| **Organization Name (Arabic)** | Arabic display name |
| **Domain** | The organization's email domain (used for user scoping) |
| **Logo URL** | URL to the organization's logo image |
| **Mission** | Organization mission statement (English) |
| **Mission (Arabic)** | Mission statement in Arabic |
| **Vision** | Vision statement (English) |
| **Vision (Arabic)** | Vision statement in Arabic |
| **KPI Approval Level** | Who approves submitted KPI values: `MANAGER`, `EXECUTIVE`, or `ADMIN` |
| **RAG Green Threshold** | Minimum achievement % to be considered Green (default: 75) |
| **RAG Amber Threshold** | Minimum achievement % to be considered Amber (default: 50). Values below this are Red. |
| **Contacts** | Organization contact info (JSON) |

> Changing the **KPI Approval Level** immediately affects which role sees submissions in the Approvals queue.

> Changing **RAG thresholds** takes effect immediately on all dashboards and health displays across the organization.

---

### 2. User Management

Navigate to **Admin → Users** (`/<locale>/admin/users`).

The user list shows all users in the organization with:
- Name and email
- Role badge
- Manager (if set)
- Title / position
- Created date

#### Creating a New User

1. Click **+ New User** on the Users page.
2. Fill in:
   - **Name** (required)
   - **Email** (required, must be unique within the organization)
   - **Role** (required): `ADMIN`, `EXECUTIVE`, or `MANAGER`
   - **Title** (optional)
   - **Manager** (optional): links this user to their manager in the org hierarchy
   - **Password** (required for email/password auth)
3. Click **Save**.

The user can sign in immediately with the provided credentials.

#### Editing a User

1. From the Users list, click the user's name or the edit action.
2. Modify fields as needed.
3. Click **Save**.

#### Changing a User's Role

1. Open the user's detail page.
2. Update the **Role** field.
3. Save.

The new role takes effect on the user's next page load.

#### Deactivating / Removing a User

Soft-delete is applied — the user is hidden from all organization views but preserved for audit purposes. Contact a SUPER_ADMIN if a permanent deletion is required.

---

### 3. Organization Entity Types

Entity Types define the configurable building blocks of your organization's strategy model. These are managed at the organization level.

Navigate to **Admin → Organizations → [Your Org] → Entity Types** (accessible via the Super Admin panel or via API).

| Field | Description |
|-------|-------------|
| **Code** | Short unique identifier, used in URLs (e.g., `kpi`, `pillar`) |
| **Name** | English display name |
| **Name (Arabic)** | Arabic display name |
| **Sort Order** | Controls the order in the sidebar navigation |

> Entity type codes are immutable once created and referenced by entities. Renaming the `name`/`nameAr` fields is safe.

---

### 4. Audit Log

The Admin page includes an **Audit Log** panel showing recent significant system events:

- KPI target updates
- Ownership reassignments
- Risk escalations

The audit log is **immutable** — entries cannot be deleted or modified. In the current version, it shows recent highlights. A full searchable audit log is available in a future release.

---

## Super Admin Panel

The **Super Admin** panel (`/<locale>/super-admin`) is only accessible to users with the `SUPER_ADMIN` role. It provides platform-level management:

### Super Admin Capabilities

| Capability | Description |
|-----------|-------------|
| **Manage Organizations** | Create, view, edit, and delete organizations |
| **Manage Users Across Orgs** | View and manage users in any organization |
| **Seed Data** | Load or reset seed data for an organization |
| **System Health** | View platform-level metrics |

### Creating a New Organization

1. Navigate to `/super-admin/organizations`.
2. Click **+ New Organization**.
3. Fill in Name, Domain, and other fields.
4. Click **Save**.

After creation, you can add users and entity types to the organization.

### Seeding an Organization

To quickly populate a new organization with demo/starter data:

1. Go to `/super-admin/organizations/<orgId>/seed`.
2. Select a seed profile or upload a seed JSON file.
3. Confirm seeding.

> **Warning:** Seeding overwrites or appends data to the organization. Review the seed content before confirming.

---

## Responsibilities (User–Entity Assignments)

Navigate to `/<locale>/responsibilities` to manage which users are assigned to which entities.

Assignments control:
- Whether a MANAGER-role user can see a specific entity
- Whether a user can enter values for that entity

### Assigning a User to an Entity

1. Open the entity detail page.
2. Go to the **Assignments** tab.
3. Click **+ Assign User**.
4. Search for and select the user.
5. Confirm.

Or from the Responsibilities page, use the assignment management interface.

### Removing an Assignment

From the entity's Assignments tab, click the remove action next to the user's name.

---

## Common Admin Tasks

### Check Why a User Can't See an Entity

1. Confirm the user's **role** — MANAGER sees only assigned entities.
2. Check the **Assignments** tab on the entity — is the user listed?
3. If not, add an assignment for that user.

### Reset a Stuck Approval

1. Open the entity's **Values** tab.
2. Find the SUBMITTED value.
3. Use the **Reject** action to reset it to DRAFT.
4. Notify the submitter to re-enter and resubmit.

### Add a New KPI Type to the Sidebar

1. Navigate to the Organization's **Entity Types** configuration.
2. Add a new entity type with the desired code, name, and sort order.
3. The new type will appear in the sidebar navigation automatically.

---

## Security Notes

- Passwords are stored as **bcrypt hashes** — never stored in plain text.
- Sessions expire after the configured session duration.
- All entity mutations are tied to the authenticated user's `orgId` — cross-organization data access is prevented at the query level.
- Audit records are append-only.
