# UC-03 — Admin Creates a New KPI Entity

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-03 |
| **Title** | Admin creates a new KPI entity and assigns it to a manager |
| **Primary Actor** | Admin |
| **Secondary Actors** | Manager (receives assignment), System |
| **Trigger** | A new KPI is agreed upon in a planning session and must be tracked in the system |
| **Preconditions** | Admin is signed in; target entity type (e.g., "KPI") exists in organization config |
| **Postconditions** | New KPI entity is visible in the entity list; assigned manager can see and enter values |
| **Priority** | High |

---

## User Journey

```
Admin signs in
      │
      ▼
Navigates to Entities → KPIs
      │
      ▼
Clicks "+ Create" button
      │
      ▼
New entity form opens
      │
      ▼
Fills in basic details
      │  Title (EN + AR), Key, Description
      ▼
Sets KPI configuration
      │  Owner, Status, Period Type, Unit, Direction
      ▼
Sets measurement parameters
      │  Baseline Value, Target Value, Weight
      ▼
Chooses Source Type
      │
      ├── MANUAL → no further config needed
      │
      └── CALCULATED → adds formula + variables
                │
                ▼
            Tests formula → confirms result
      │
      ▼
Clicks "Save"
      │
      ▼
Redirected to entity detail page
      │
      ▼
Opens Assignments tab
      │
      ▼
Assigns manager user(s) to the KPI
      │
      ▼
Journey complete — KPI active and assigned
```

---

## Main Flow (Step-by-Step)

1. Admin signs in and navigates to **Entities → KPIs** (or the relevant entity type) via the sidebar.
2. On the entity list page (`/<locale>/entities/kpi`), Admin clicks the **+ Create** button (top right).
3. The new entity form opens (`/<locale>/entities/kpi/new`).
4. Admin fills in the **Basic Details** section:
   - **Title** (English) — required
   - **Title (Arabic)** — optional but recommended
   - **Key** — short unique identifier (e.g., `REV-01`)
   - **Description** (English and Arabic)
5. Admin fills in the **Configuration** section:
   - **Owner** — selects the responsible user from the dropdown
   - **Status** — sets to `ACTIVE` (or `PLANNED` if not yet started)
   - **Period Type** — `MONTHLY`, `QUARTERLY`, or `YEARLY`
   - **Unit** — e.g., `%`, `SAR`, `Count`
   - **Direction** — `INCREASE_IS_GOOD` or `DECREASE_IS_GOOD`
6. Admin fills in **Measurement** parameters:
   - **Baseline Value** — the starting reference point
   - **Target Value** — the goal to achieve
   - **Weight** — optional, for parent score calculations
7. Admin selects the **Source Type**:
   - **MANUAL**: no further steps needed — managers will enter values directly.
   - **CALCULATED**: Admin writes a formula using variable codes (e.g., `revenue / target * 100`), adds variables with codes and data types, and clicks **Test Formula** to verify the formula works correctly with sample inputs.
   - **DERIVED**: Admin links to another entity's key using the `get("KEY")` formula syntax.
8. Admin clicks **Save**.
9. The system creates the entity and redirects Admin to the entity detail page.
10. Admin opens the **Assignments** tab on the detail page.
11. Admin clicks **+ Assign User** and selects the manager(s) responsible for entering data.
12. Assignments are saved. The assigned manager(s) can now see this KPI in their entity list and enter values.

---

## Alternative Flows

### Alt A — Formula test fails
At step 7 (CALCULATED), Admin clicks **Test Formula** and the system returns an error.
- Admin reviews the formula syntax and variable codes.
- Admin corrects the expression and re-tests before saving.

### Alt B — Target owner not listed
At step 5, the intended owner/manager is not in the Owner dropdown.
- Admin navigates to **Admin → Users** to create the user first.
- Then returns to the entity creation form and refreshes the owner list.

### Alt C — Admin wants to add a DERIVED KPI
At step 7, Admin selects **DERIVED** source type.
- Admin uses the formula `get("ENTITY_KEY")` where `ENTITY_KEY` is the key of the source entity.
- The system resolves the value automatically from the referenced entity's latest approved value.

---

## Business Rules

- Only users with role `ADMIN` can access the new entity form.
- The **Key** field must be unique within the organization.
- Entity type codes are case-insensitive in URLs (e.g., `/entities/kpi` and `/entities/KPI` resolve to the same type).
- For `CALCULATED` entities, all non-static variables must be provided on each value entry.
- Target value is required if achievement tracking and health scoring are needed.
- Changing target value on an active KPI affects future achievement calculations but not historical ones.
- The assigned manager immediately gains visibility to the entity — no page refresh required on their end after a few moments.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Entity List | `/<locale>/entities/kpi` |
| New Entity Form | `/<locale>/entities/kpi/new` |
| Entity Detail (Assignments tab) | `/<locale>/entities/kpi/<entityId>` |
| Admin Users | `/<locale>/admin/users` |
