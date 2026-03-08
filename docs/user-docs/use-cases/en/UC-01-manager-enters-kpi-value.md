# UC-01 — Manager Enters a KPI Value

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-01 |
| **Title** | Manager enters a KPI value for an assigned entity |
| **Primary Actor** | Manager |
| **Secondary Actors** | Approver (EXECUTIVE or ADMIN), System |
| **Trigger** | End of a reporting period (month, quarter, or year) |
| **Preconditions** | Manager is signed in; is assigned to or owns the target KPI entity |
| **Postconditions** | A value entry exists with status `SUBMITTED`; appears in the approver's queue |
| **Priority** | High |

---

## User Journey

```
Manager signs in
      │
      ▼
Opens Overview page
      │  Sees "Needs Attention" list — KPI not updated
      ▼
Navigates to Entities → [KPI Type]
      │
      ▼
Finds the KPI entity → clicks name
      │
      ▼
Entity detail page opens
      │
      ▼
Clicks "Values" tab
      │  Reviews previous entries
      ▼
Clicks "+ Add Value"
      │
      ▼
Fills in the value form
      │  (Manual: types actual value + optional note)
      │  (Calculated: fills variable inputs)
      ▼
Clicks "Save" → status = DRAFT
      │
      ▼
Reviews the draft entry
      │  Confirms the value is correct
      ▼
Clicks "Submit"
      │
      ▼
Confirms submission dialog
      │
      ▼
Status changes to SUBMITTED
      │  Entry now visible in Approvals queue
      ▼
Journey complete — awaiting approval
```

---

## Main Flow (Step-by-Step)

1. Manager signs in at `/ar/auth/login` or `/en/auth/login`.
2. The **Overview** page loads. The **Needs Attention** section shows the KPI is overdue for data entry.
3. Manager clicks **KPI Management** quick link (or navigates via sidebar to the relevant entity type).
4. On the entity list page (`/entities/<typeCode>`), manager searches for or scrolls to the target KPI.
5. Manager clicks the KPI name to open the detail page (`/entities/<typeCode>/<entityId>`).
6. Manager clicks the **Values** tab to see the history of entries.
7. Manager clicks **+ Add Value**.
8. A form opens:
   - **MANUAL KPI**: Manager types the numeric value in **Actual Value** and optionally adds a **Note**.
   - **CALCULATED KPI**: Manager fills each variable input field. The system previews the computed result.
9. Manager clicks **Save**. The entry is saved with status `DRAFT`.
10. Manager reviews the draft in the Values table and confirms it is correct.
11. Manager clicks **Submit** on the draft entry row.
12. A confirmation dialog appears — manager confirms.
13. Status changes to `SUBMITTED`. The entry appears in the designated approver's queue.

---

## Alternative Flows

### Alt A — Calculated value looks wrong
At step 8, after filling variables, the computed preview shows an unexpected result.
- Manager re-checks each variable input for typos.
- If a formula issue is suspected, manager adds a note and saves as draft, then contacts the Admin to review the formula.

### Alt B — Manager cannot find the entity
At step 4, the KPI does not appear in the list.
- Manager checks they are on the correct entity type tab.
- If still not found, the Manager is likely not assigned — contacts Admin to add an assignment.

### Alt C — Draft entry already exists
At step 6, a previous Draft entry is already shown.
- Manager clicks the edit action on the existing draft and updates the value instead of creating a new entry.

### Alt D — Submitted value has a mistake
After step 13, manager notices a mistake.
- Manager cannot edit a submitted value. Manager contacts the approver or Admin and requests a rejection so the entry can be corrected and re-submitted.

---

## Business Rules

- Only one value entry per period per entity is expected (system does not enforce, but convention).
- DRAFT values are invisible to approvers.
- Only the submitter and Admins can see Draft entries.
- Once submitted, the value is immutable until approved or rejected.
- The `Achievement %` displayed on the entity gauge = `(Actual ÷ Target) × 100` for `INCREASE_IS_GOOD`, reversed for `DECREASE_IS_GOOD`.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Overview | `/<locale>/overview` |
| Entity List | `/<locale>/entities/<typeCode>` |
| Entity Detail (Values tab) | `/<locale>/entities/<typeCode>/<entityId>` |
| Approvals Queue | `/<locale>/approvals` |
