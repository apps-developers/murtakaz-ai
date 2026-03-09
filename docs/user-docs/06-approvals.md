# Approvals

The **Approvals** page (`/<locale>/approvals`) is where authorized users review and decide on KPI values that have been submitted for approval. This is a critical governance step that ensures data accuracy before values become part of the official record.

---

## Who Uses the Approvals Page

| Role | Action |
|------|--------|
| **ADMIN** | Can approve or reject any submitted value |
| **EXECUTIVE** | Can approve/reject if org `kpiApprovalLevel = EXECUTIVE` |
| **MANAGER** | Can approve/reject if org `kpiApprovalLevel = MANAGER` |

> Submitters (the users who entered the data) do **not** approve their own submissions. Approval must come from a different authorized user.

---

## Accessing the Approvals Queue

1. Click **Approvals** in the left sidebar.
2. The page opens to the **Pending** filter by default, showing all values currently awaiting a decision.

---

## Filtering the Queue

Three filter buttons at the top of the list:

| Filter | Shows |
|--------|-------|
| **Pending** | Values with status `SUBMITTED` — awaiting a decision |
| **Approved** | Values that have already been approved |
| **All** | All values regardless of status |

---

## Reading the Approvals Table

Each row in the table shows:

| Column | Description |
|--------|-------------|
| **Entity** | The name of the KPI/entity the value belongs to. Shows entity type and key below the name. Clicking the name navigates to the entity detail page. |
| **Period** | The date/timestamp the value entry was created |
| **Value** | The final computed value (`finalValue` → `calculatedValue` → `actualValue`, whichever is available) |
| **Submitted By** | The user who submitted the value |
| **Submitted At** | Date and time of submission |
| **Status** | Current status badge (`SUBMITTED`, `APPROVED`, etc.) |

---

## Approving a Value

1. From the Approvals page, click the **entity name** in the row you want to review.
2. This opens the entity detail page on the **Values** tab.
3. Locate the submitted value entry (status = `SUBMITTED`).
4. Click **Approve**.
5. Confirm the action.

The value status changes from `SUBMITTED` → `APPROVED` → `LOCKED`.

> Once locked, the value is part of the permanent record and cannot be changed.

---

## Rejecting a Value

1. Navigate to the submitted value entry (same as above).
2. Click **Reject**.
3. Optionally provide a **comment** explaining why it was rejected.
4. Confirm.

The value status is reset (back toward `DRAFT` or discarded), and the submitter can correct and re-submit.

---

## Approval Audit Trail

Every approval or rejection is recorded with:
- The approver's identity
- The timestamp of the decision
- Any comment provided

This audit trail is preserved permanently and can be reviewed from the entity's Values tab history.

---

## Approval Level Configuration

The organization's **KPI Approval Level** determines who is the designated approver. This is set by an Admin:

| Level | Approver Role |
|-------|--------------|
| `MANAGER` | A MANAGER-role user must approve |
| `EXECUTIVE` | An EXECUTIVE-role user must approve |
| `ADMIN` | An ADMIN-role user must approve |

To change this setting, navigate to **Admin** → **Organization Settings**.

---

## Notifications

The system sends **in-app notifications** automatically — no configuration required.

### Bell Icon (Header)

A bell icon (🔔) appears in the top header bar for all non-Super Admin users. When unread notifications exist, a red badge shows the count (capped at "9+").

| Event | Who receives the notification |
|-------|-------------------------------|
| **Value submitted** | All users whose role rank ≥ the org's `kpiApprovalLevel` (i.e., eligible approvers) |
| **Value approved** | The user who originally submitted the value |
| **Value rejected** | The user who originally submitted the value |

### Clearing Notifications

Clicking the bell icon:
1. Marks all unread notifications as read.
2. Navigates to the **Approvals** page.

The notification count refreshes automatically every **60 seconds** while the app is open.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Approvals page is empty even with submitted values | Check your role — you may not be the designated approver level |
| Cannot find the Approve/Reject buttons | Navigate to the entity detail page → Values tab, not the approvals list |
| A value was approved in error | Contact an Admin to review — locked values require admin intervention |
| Queue is growing and not being cleared | Identify the designated approver and ensure they have access and awareness |
