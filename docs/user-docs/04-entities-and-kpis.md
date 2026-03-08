# Entities & KPIs

**Entities** are the core building blocks of the system. Every KPI, strategic initiative, objective, or pillar is represented as an entity. Your organization defines which entity types exist and what they are called.

---

## Understanding Entity Types

Each organization configures its own **Entity Types** (e.g., "Strategic Pillar", "Initiative", "KPI", "Objective"). These types have:

- A **code** — a short machine identifier (used in URLs, e.g., `/entities/kpi`)
- A **name** — displayed in English
- A **nameAr** — displayed in Arabic
- A **sort order** — controls the order they appear in navigation

Entity types are configured by an Admin and cannot be changed by regular users.

---

## Browsing Entities

### Entity List Page

Navigate to **Entities → [Type Name]** in the sidebar, or go directly to:

```
/<locale>/entities/<entityTypeCode>
```

The list page shows:
- Entity title (and Arabic title if set)
- A **KPI gauge** showing the entity's current achievement value vs. target
- Owner name
- Status badge (`PLANNED`, `ACTIVE`, `AT_RISK`, `COMPLETED`)
- Quick actions: Edit (Admin only), Delete (Admin only)

**Searching**: Use the search box at the top to filter by title.

**Pagination**: Up to 250 items load per page; use the search to narrow results further.

---

## Entity Detail Page

Click any entity name to open its detail page at:

```
/<locale>/entities/<entityTypeCode>/<entityId>
```

The detail page is organized into tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | Title, description, owner, status, target, baseline, unit, period type, formula |
| **Values** | Historical value entries with status (Draft / Submitted / Approved / Locked) |
| **Variables** | Input variables used in formula-based (CALCULATED) KPIs |
| **Assignments** | Users assigned to this entity |
| **Attachments** | Files and URLs linked to this entity |

---

## Entity Fields Explained

| Field | Description |
|-------|-------------|
| **Title** | Display name (English) |
| **Title (Arabic)** | Display name (Arabic) — optional |
| **Description** | Free-text description |
| **Owner** | The user responsible for this entity |
| **Status** | `PLANNED` / `ACTIVE` / `AT_RISK` / `COMPLETED` |
| **Source Type** | How the value is produced (see below) |
| **Period Type** | Measurement frequency: `MONTHLY`, `QUARTERLY`, or `YEARLY` |
| **Unit** | Display unit (e.g., %, SAR, Count) |
| **Direction** | `INCREASE_IS_GOOD` or `DECREASE_IS_GOOD` — affects health calculation |
| **Aggregation** | How multiple values are combined: `LAST_VALUE`, `SUM`, `AVERAGE`, `MIN`, `MAX` |
| **Baseline Value** | Starting reference value |
| **Target Value** | The goal value to reach |
| **Weight** | Optional weighting used in parent score calculations |
| **Formula** | Expression used for CALCULATED/DERIVED/SCORE source types |

---

## Source Types

| Source Type | Meaning |
|-------------|---------|
| **MANUAL** | A user manually enters a numeric value each period |
| **CALCULATED** | Value is computed from a formula using defined variables |
| **DERIVED** | Value references another entity's value |
| **SCORE** | Composite score aggregated from child entities |

---

## Creating a New Entity (Admin Only)

1. Navigate to **Entities → [Type Name]**.
2. Click the **New** (or **+**) button in the top-right.
3. Fill in the required fields:
   - **Title** (required)
   - **Owner** (required)
   - **Target Value** (required for KPI tracking)
   - **Period Type** (required)
   - **Source Type** (required)
4. Click **Save**.

The new entity is immediately visible in the list.

---

## Editing an Entity (Admin Only)

1. From the entity list, click the **pencil (edit)** icon on the row, or open the entity detail page and click **Edit**.
2. Modify any fields.
3. Click **Save**.

> **Important:** Changing a target value or formula on an active KPI should be done carefully — historical values remain unchanged, but future achievement calculations will use the new target/formula.

---

## Deleting an Entity (Admin Only)

1. From the entity list, click the **trash** icon on the row.
2. A confirmation dialog appears.
3. Confirm deletion.

Deletion is a **soft delete** — the entity is hidden from all lists but preserved in the database for audit purposes. It cannot be undone from the UI.

---

## Entity Variables (for CALCULATED KPIs)

For entities with `sourceType = CALCULATED`, you define **variables** that feed into the formula:

| Variable Field | Description |
|---------------|-------------|
| **Code** | Short identifier used in the formula (e.g., `revenue`, `cost`) |
| **Display Name** | Human-readable label |
| **Data Type** | `NUMBER` or `PERCENTAGE` |
| **Is Required** | Whether a value entry must include this variable |
| **Is Static** | If true, uses a fixed value instead of per-entry input |
| **Static Value** | The fixed value used when `isStatic = true` |

When entering a value for a CALCULATED entity, you fill in all non-static variable values, and the system computes the formula result automatically.

---

## Assignments

Users can be **assigned** to an entity (via `UserEntityAssignment`). Assigned users:
- Can see the entity even if they wouldn't otherwise
- Appear in the **Assignments** tab on the entity detail page

Assignments are managed by Admin from the entity detail page.

---

## Attachments

Any entity can have files or URLs attached:

| Attachment Type | Description |
|----------------|-------------|
| **FILE** | An uploaded file (stored in object storage) |
| **URL** | A link to an external resource |

Attachments appear in the **Attachments** tab and can be added by any user with write access to the entity.
