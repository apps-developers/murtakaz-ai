# Entering KPI Values

KPI values follow a structured lifecycle: **Draft → Submitted → Approved → Locked**. This ensures data quality and accountability before any value becomes official.

---

## Who Can Enter Values

| Role | Can Enter (Draft) | Can Submit | Can Approve |
|------|:-----------------:|:----------:|:-----------:|
| ADMIN | ✅ | ✅ | ✅ |
| EXECUTIVE | ❌ | ❌ | ✅ (if org approval level = EXECUTIVE) |
| MANAGER | ✅ | ✅ | ✅ (if org approval level = MANAGER) |

> Managers can only enter values for entities they are assigned to or own.

---

## Value Lifecycle

```
  [Enter data]     [Submit]       [Review & Approve]    [Lock]
   DRAFT      →   SUBMITTED   →      APPROVED       →   LOCKED
                                    or REJECTED
                                         ↓
                                       DRAFT  (re-enter)
```

| Status | Description |
|--------|-------------|
| **DRAFT** | Value has been entered but not yet submitted. Not visible to approvers. |
| **SUBMITTED** | Value has been sent for review. Appears in the Approvals queue. |
| **APPROVED** | An authorized approver has accepted the value. Used in dashboards and health calculations. |
| **LOCKED** | Value is permanently locked — no further changes allowed. Set after approval. |

---

## Step 1 — Navigate to the Entity

1. Open **Entities → [Type Name]** from the sidebar.
2. Find your entity using search or by scrolling the list.
3. Click the entity name to open the detail page.

---

## Step 2 — Open the Values Tab

On the entity detail page, click the **Values** tab. This shows all historical value entries for this entity, including their status.

---

## Step 3 — Add a New Value

Click **+ Add Value** (or the equivalent button shown in the Values tab).

A form opens with the following fields:

### For MANUAL entities:

| Field | Required | Description |
|-------|:--------:|-------------|
| **Actual Value** | ✅ | The numeric measurement for this period |
| **Note** | ❌ | Optional explanation or context |

### For CALCULATED entities:

Instead of a single value, you fill in each **variable** defined for the entity:

| Field | Required | Description |
|-------|:--------:|-------------|
| **Variable inputs** | Depends on `isRequired` setting | Each variable defined on the entity |
| **Note** | ❌ | Optional explanation |

The system computes the formula automatically and shows the **Calculated Value** as a preview.

> **Tip:** For entities with `isStatic = true` variables, those values are pre-filled and cannot be changed per entry.

### Value Range Validation

If the entity has a **Min Value** or **Max Value** configured, the system will reject entries that fall outside the allowed range. You will see an inline error message:

| Error | Meaning |
|-------|---------|
| `valueBelowMinimum` | The entered value is less than the configured minimum |
| `valueAboveMaximum` | The entered value is greater than the configured maximum |

Correct the value and save again. If the range seems wrong, contact an Admin to adjust the entity's Min/Max settings.

---

## Step 4 — Save as Draft

Click **Save** to save the value as **DRAFT**.

- Draft values are private to you (and Admins).
- You can edit a Draft value before submitting.
- No approval action is triggered yet.

---

## Step 5 — Submit for Approval

When the value is ready for review:

1. Find the Draft entry in the **Values** tab.
2. Click **Submit**.
3. Confirm the submission.

The value status changes to **SUBMITTED** and it now appears in the **Approvals** queue for the designated approver.

> **Note:** Once submitted, you cannot edit the value. If a mistake is found before approval, ask an Admin to reject it so you can re-enter.

After submission, **eligible approvers automatically receive a bell notification** in the top header. The bell icon shows an unread count badge and clicking it clears notifications and navigates to the Approvals queue.

---

## Step 6 — Awaiting Approval

The designated approver (based on the organization's `kpiApprovalLevel` setting) will review the submitted value in the **Approvals** page.

- If **approved**: status becomes `APPROVED` → then `LOCKED`. The value is now part of the official record.
- If **rejected**: status returns to `DRAFT` (or is discarded). You will need to re-enter the corrected value.

---

## Editing a Draft Value

1. Open the entity **Values** tab.
2. Find the Draft entry.
3. Click the edit action on the row.
4. Update the value or note.
5. Click **Save**.

Only **DRAFT** values can be edited. SUBMITTED, APPROVED, and LOCKED values are immutable.

---

## Achievement Value

The system automatically computes and stores an **Achievement Value** whenever a value is saved. The formula depends on the entity's **Direction**:

| Direction | Formula |
|-----------|----------|
| `INCREASE_IS_GOOD` | `(Actual Value ÷ Target Value) × 100` |
| `DECREASE_IS_GOOD` | `(Target Value ÷ Actual Value) × 100` |

Achievement is clamped between **0%** and **100%**, and is shown as a gauge on the entity list and detail pages. It is also the basis for RAG (Red/Amber/Green) health coloring.

> **Note:** If no Target Value is set on the entity, achievement cannot be calculated and the gauge will not display.

---

## Period Type and Data Cadence

Each entity has a **Period Type** that defines how often values should be entered:

| Period Type | Expected Cadence |
|-------------|-----------------|
| **MONTHLY** | One value per month |
| **QUARTERLY** | One value per quarter (Q1–Q4) |
| **YEARLY** | One value per year |

The system does not enforce cadence automatically, but stale entities surface in the **Needs Attention** section of the Overview page.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot see the "Add Value" button | Check you are assigned to the entity, or ask an Admin |
| Value shows wrong calculated result | Verify all variable inputs are correct; check the formula with an Admin |
| Value rejected with "valueBelowMinimum" or "valueAboveMaximum" | The value is outside the entity's configured Min/Max range. Correct the value or ask an Admin to update the range. |
| Submitted value has a mistake | Ask an Admin or the approver to reject it; re-enter after rejection |
| Value stuck in SUBMITTED | Check the Approvals queue — the approver may not have seen it yet. The approver should also see a bell notification in the header. |
