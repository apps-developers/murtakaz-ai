# UC-04 — Approver Reviews and Decides on a Submitted KPI Value

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-04 |
| **Title** | Approver reviews a submitted KPI value and approves or rejects it |
| **Primary Actor** | Approver (ADMIN, EXECUTIVE, or MANAGER — depending on org's `kpiApprovalLevel`) |
| **Secondary Actors** | Manager (original submitter), System |
| **Trigger** | A KPI value has been submitted and appears in the Approvals queue |
| **Preconditions** | Approver is signed in; at least one value exists with status `SUBMITTED`; approver's role matches the org's configured `kpiApprovalLevel` |
| **Postconditions (Approved)** | Value status = `APPROVED` → `LOCKED`; feeds into dashboards and health scores |
| **Postconditions (Rejected)** | Value status reset to `DRAFT`; submitter can correct and re-submit |
| **Priority** | High |

---

## User Journey

```
Approver signs in
      │
      ▼
Overview page loads
      │  Stat card shows "Pending Approvals" count > 0
      ▼
Navigates to Approvals (sidebar)
      │
      ▼
Approvals page opens (Pending filter active)
      │
      ▼
Reviews queue — sees submitted items
      │  Columns: Entity, Period, Value, Submitted By, Submitted At, Status
      ▼
Clicks entity name in a row
      │
      ▼
Entity detail page opens on Values tab
      │
      ▼
Reviews the submitted value
      │  Checks: value, note, comparison to target, historical trend
      ▼
       ├── Value is correct
       │         │
       │         ▼
       │   Clicks "Approve" → confirms
       │         │
       │         ▼
       │   Status: SUBMITTED → APPROVED → LOCKED
       │   Value now counts in dashboards ✅
       │
       └── Value looks wrong
                 │
                 ▼
           Clicks "Reject" → adds comment → confirms
                 │
                 ▼
           Status reset to DRAFT
           Submitter must re-enter and resubmit ↩
```

---

## Main Flow (Step-by-Step)

1. Approver signs in at `/<locale>/auth/login`.
2. **Overview** page loads. The **Pending Approvals** stat card shows a count greater than 0.
3. Approver clicks **Approvals** in the left sidebar.
4. The **Approvals** page opens (`/<locale>/approvals`) with the **Pending** filter active by default.
5. The table lists all submitted values awaiting a decision, showing:
   - Entity name and type (clickable)
   - Period (submission timestamp)
   - Value (final computed or actual)
   - Submitted By (user name)
   - Submitted At (date/time)
   - Status badge (`SUBMITTED`)
6. Approver reads through the queue and selects the first item to review. Clicks the **entity name**.
7. The entity detail page opens, automatically focused on the **Values** tab.
8. Approver reviews the submitted value entry:
   - Checks the numeric value against the known target
   - Reads the **Note** field if the submitter added context
   - Scrolls through the **trend chart** to understand historical performance
   - Checks the **KPI gauge** (achievement % vs target)
9. **If the value is correct:**
   - Approver clicks **Approve** on the submitted entry row.
   - A confirmation dialog appears.
   - Approver confirms.
   - Status: `SUBMITTED` → `APPROVED` → `LOCKED`.
   - The value is now permanent and feeds into all dashboards and health scores.
10. Approver returns to the **Approvals** page (back button or sidebar) and processes the next item.

---

## Rejection Flow (Step-by-Step)

At step 9, if the value appears incorrect:

1. Approver clicks **Reject** on the submitted entry row.
2. A dialog opens asking for an optional **rejection comment** (e.g., "Wrong period — please re-enter for Q2").
3. Approver types the comment and confirms.
4. Value status is reset to `DRAFT` (or discarded).
5. The submitter is expected to be notified (via email/notification settings).
6. The submitter must correct the value and re-submit it.

---

## Alternative Flows

### Alt A — Approvals queue is empty
At step 4, no items appear in the Pending list.
- Approver switches to **All** filter to verify there are no recently processed items.
- If genuinely empty, no action needed.

### Alt B — Approver is not the designated level
At step 4, the queue appears empty even though the submitter says they submitted.
- Approver checks their role and the org's `kpiApprovalLevel` setting.
- If roles don't match, the Admin needs to adjust the `kpiApprovalLevel` in Organization Settings.

### Alt C — Value was approved in error
After step 9 (Approve), approver realizes the value was approved incorrectly.
- Locked values cannot be undone from the UI.
- Approver contacts an Admin who can intervene at the database/admin level.

### Alt D — Multiple items to review in bulk
At step 5, there are many pending items.
- Approver processes them one by one. There is no bulk-approve feature in the current version.
- Approver can use the entity name filter or scroll to prioritize.

---

## Business Rules

- A submitter **cannot** approve their own submission — the approver must be a different user.
- Once `LOCKED`, a value is part of the permanent audit record and cannot be modified via the UI.
- Every approval/rejection action is recorded in the audit log with: approver identity, timestamp, and comment.
- The org's `kpiApprovalLevel` (`MANAGER`, `EXECUTIVE`, or `ADMIN`) determines which role's queue receives submissions.
- Only `APPROVED` / `LOCKED` values are used in health score calculations and dashboard metrics.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Overview | `/<locale>/overview` |
| Approvals Queue | `/<locale>/approvals` |
| Entity Detail (Values tab) | `/<locale>/entities/<typeCode>/<entityId>` |
| Admin → Organization Settings | `/<locale>/admin` |
