# UC-05 — Admin Onboards a New User

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-05 |
| **Title** | Admin creates a new user account and assigns them to KPI entities |
| **Primary Actor** | Admin |
| **Secondary Actors** | New User (Manager), System |
| **Trigger** | A new employee joins the organization and needs access to specific KPIs |
| **Preconditions** | Admin is signed in; the organization already has entity types and entities configured |
| **Postconditions** | New user can sign in; sees assigned KPI entities; can enter and submit values |
| **Priority** | Medium |

---

## User Journey

```
Admin signs in
      │
      ▼
Navigates to Admin → Users
      │
      ▼
User list page loads
      │  Reviews existing users
      ▼
Clicks "+ New User"
      │
      ▼
Create user dialog opens
      │
      ▼
Fills in user details
      │  Name, Email, Password, Role, Title, Manager
      ▼
Clicks "Save"
      │
      ▼
User created — appears in list
      │
      ▼
Admin navigates to entity(ies) to assign
      │
      ▼
Opens entity detail → Assignments tab
      │
      ▼
Clicks "+ Assign User" → selects new user
      │
      ▼
Assignment saved
      │
      ▼
Admin shares credentials with new user
      │
      ▼
New user signs in → sees assigned KPIs
      │
      ▼
Journey complete
```

---

## Main Flow (Step-by-Step)

1. Admin signs in and navigates to **Admin** in the sidebar.
2. On the Admin panel (`/<locale>/admin`), Admin clicks **Users** (or navigates directly to `/<locale>/admin/users`).
3. The user list page loads showing all existing users with their name, email, role, manager, and created date.
4. Admin clicks **+ New User**.
5. The **Create User** dialog opens with fields:
   - **Name** (required) — full name, e.g., "Ahmed Al-Otaibi"
   - **Email** (required) — must be unique within the organization
   - **Password** (required) — initial password, shared securely with the user
   - **Role** (required) — `ADMIN`, `EXECUTIVE`, or `MANAGER`
   - **Title** (optional) — job title, e.g., "Performance Manager"
   - **Manager** (optional) — links to their direct manager in the org hierarchy
6. Admin fills all required fields and clicks **Save**.
7. The system creates the user. The user now appears in the users list and can sign in immediately.
8. To give the user access to specific KPIs, Admin navigates to each relevant entity:
   - Opens the entity list page (`/<locale>/entities/<typeCode>`)
   - Clicks the entity name to open the detail page
9. On the entity detail page, Admin clicks the **Assignments** tab.
10. Admin clicks **+ Assign User**, searches for the new user's name, and selects them.
11. The assignment is saved. The new user now:
    - Can see this entity in their entity list
    - Can enter and submit values for this entity
    - Will see this entity in their Manager Dashboard
12. Admin communicates the login credentials securely to the new user (email, chat, etc.).
13. New user signs in, lands on the Overview page, and can see their assigned KPIs in the "Needs Attention" section and entity list.

---

## Alternative Flows

### Alt A — User already exists in another role
At step 5, the email already exists in the system.
- System returns a validation error: "Email already in use."
- Admin verifies whether the user already has an account and uses the Edit User function to update their role instead.

### Alt B — Admin wants to assign the user to many entities at once
At step 8, there are many entities to assign.
- Admin uses the **Responsibilities** page (`/<locale>/responsibilities`) which provides a centralized interface for managing all user–entity assignments.

### Alt C — New user needs EXECUTIVE access (read-only)
At step 5, Admin sets Role = `EXECUTIVE`.
- No entity assignments are needed — Executives see all entities by default.
- Admin skips steps 8–11.

### Alt D — Admin needs to change a user's role later
After onboarding, the user's responsibilities change.
- Admin navigates to Admin → Users, clicks the user's name, and uses the edit action to update the Role field.
- The new role takes effect on the user's next page load.

---

## Business Rules

- Email addresses must be unique within the organization — no two users can share an email.
- Passwords are stored as bcrypt hashes — the Admin never sees the password after creation.
- A `MANAGER`-role user sees **only** entities they are assigned to (via `UserEntityAssignment`) or entities where they are the owner (`ownerUserId`).
- An `EXECUTIVE`-role user automatically sees all entities — no assignments needed.
- Deleting a user is a soft delete — the user's historical data (value entries, approvals) is preserved for audit purposes.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Admin Panel | `/<locale>/admin` |
| User List | `/<locale>/admin/users` |
| Entity Detail (Assignments tab) | `/<locale>/entities/<typeCode>/<entityId>` |
| Responsibilities | `/<locale>/responsibilities` |
