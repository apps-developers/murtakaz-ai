# Data Governance and the Approvals Workflow

## What Is Data Governance?

**Data governance** is the system of policies, processes, roles, and standards that ensure organizational data is accurate, consistent, trustworthy, and used responsibly. In the context of performance management, data governance answers:

- Who is authorized to enter performance data?
- Who verifies that entered data is correct before it is reported?
- How are errors corrected without compromising the audit trail?
- Who can see what data, and under what circumstances?

Without governance, performance data is unreliable — and unreliable data is worse than no data, because it creates false confidence in decision-making.

---

## Why Approvals Matter in Performance Management

In many organizations, KPI values are simply entered into a spreadsheet or system by whoever has access — with no verification. This creates several problems:

| Problem | Impact |
|---------|--------|
| **Intentional inflation** | Teams over-report performance to look good |
| **Unintentional errors** | Simple typos or formula mistakes go undetected |
| **Inconsistent methodology** | Different people calculate the same KPI differently |
| **No audit trail** | Nobody knows when data was entered or by whom |
| **Disputed numbers** | Leadership cannot trust the reports they receive |

An **approval workflow** solves all of these by introducing a mandatory verification step before any value becomes official.

---

## The Approval Workflow Model

The standard approval model in performance management follows a simple lifecycle:

```
DATA ENTRY              SUBMISSION             REVIEW              LOCK
────────────────────────────────────────────────────────────────────────
  Owner enters    →   Owner submits   →   Approver reviews   →   Value
  value (DRAFT)       for review         and decides             locked
                      (SUBMITTED)        ↓           ↓           (LOCKED)
                                      APPROVED     REJECTED
                                         ↓             ↓
                                      LOCKED        DRAFT
                                                  (re-enter)
```

### The Four States

| State | Who Can See | Who Can Act | Counts in Reports? |
|-------|------------|-------------|-------------------|
| **DRAFT** | Owner + Admin | Owner (edit/submit) | No |
| **SUBMITTED** | Owner + Approver + Admin | Approver (approve/reject) | No |
| **APPROVED** | Everyone | Admin only | Yes |
| **LOCKED** | Everyone | Nobody (immutable) | Yes |

---

## Separation of Duties

A core principle of data governance — borrowed from financial auditing — is **separation of duties**: the person who enters data should not be the same person who approves it.

This creates a natural check-and-balance:

```
Manager (enters data)  ≠  Executive / Admin (approves data)
```

In Rafed KPI, this is enforced by the `kpiApprovalLevel` setting:
- If `kpiApprovalLevel = MANAGER`: A different manager-role user approves
- If `kpiApprovalLevel = EXECUTIVE`: An executive approves all manager submissions
- If `kpiApprovalLevel = ADMIN`: The organization admin is the final approver

---

## The Audit Trail

Every governance system requires an **immutable audit trail** — a permanent, tamper-proof record of who did what and when. In performance management, the audit trail captures:

- When a value was entered and by whom
- When it was submitted and by whom
- When it was approved or rejected, by whom, and any comment given
- When it was locked

The audit trail serves multiple purposes:
1. **Accountability** — no one can deny their actions
2. **Dispute resolution** — historical record settles disagreements
3. **Compliance** — meets regulatory and governance requirements
4. **Continuous improvement** — patterns in rejections reveal data quality issues

---

## Approval Levels in Practice

Different organizations configure approval differently based on their governance maturity and size:

| Configuration | When to Use | Trade-off |
|--------------|-------------|-----------|
| **Manager approves** | Decentralized, fast-moving orgs | Fast but less oversight |
| **Executive approves** | Centralized governance, high-stakes KPIs | High oversight but slower |
| **Admin approves** | Compliance-heavy, regulated sectors | Maximum control, potential bottleneck |

The right level balances **speed of approval** against **quality of oversight**.

---

## Common Governance Failures and Fixes

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| **Approval queue grows stale** | Approvers don't know items are waiting | Set up notifications; create SLA for approval turnaround |
| **Values approved without review** | Rubber-stamping | Train approvers; add rejection commentary requirement |
| **Data entered very late** | No reminders; no visible staleness | Show "Needs Attention" indicators for overdue KPIs |
| **Wrong person approving** | Misconfigured approval level | Review and correct `kpiApprovalLevel` in org settings |
| **Contested approved value** | Post-approval errors discovered | Escalate to Admin for manual intervention; record correction separately |

---

## Role-Based Access Control (RBAC)

Governance also governs **who sees what**. RBAC is the standard mechanism:

```
ROLE                WHAT THEY CAN SEE & DO
────────────────────────────────────────────────────────────────
SUPER_ADMIN    →    Everything across all organizations
ADMIN          →    Everything within their organization
EXECUTIVE      →    All entities (read only); approve values if configured
MANAGER        →    Only assigned entities; enter and submit values
```

RBAC ensures that:
- Sensitive performance data is not visible to unauthorized users
- Managers cannot see data outside their scope
- Executives have the bird's-eye view they need without the ability to manipulate data

---

## Data Quality Dimensions

Governance is ultimately about data quality. The six dimensions that matter most in performance management:

| Dimension | Definition | How to Ensure It |
|-----------|-----------|-----------------|
| **Accuracy** | Values reflect reality | Approval workflow; source documentation |
| **Completeness** | All required fields and periods filled | Needs Attention alerts; mandatory fields |
| **Timeliness** | Data is submitted within the reporting period | Period-based reminders; staleness tracking |
| **Consistency** | Same methodology used each period | Formula documentation; variable definitions |
| **Validity** | Values fall within expected ranges | Range validation; approver scrutiny |
| **Traceability** | Source of each value is known | Audit log; notes/attachments on values |

---

## Further Reading

- DAMA International, *DAMA-DMBOK: Data Management Body of Knowledge*
- COSO, *Enterprise Risk Management Framework*
- ISO 8000 — Data Quality Standards
- Loshin, *Enterprise Knowledge Management* (2001)
