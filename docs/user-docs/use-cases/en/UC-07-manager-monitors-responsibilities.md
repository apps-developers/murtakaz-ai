# UC-07 — Manager Monitors Their Responsibilities and KPI Health

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-07 |
| **Title** | Manager reviews their assigned KPIs, monitors performance, and identifies gaps |
| **Primary Actor** | Manager |
| **Secondary Actors** | System |
| **Trigger** | Start of a new reporting period; or routine self-check by the manager |
| **Preconditions** | Manager is signed in; is assigned to one or more entities |
| **Postconditions** | Manager has a clear picture of which KPIs are up-to-date, which are lagging, and what actions are needed |
| **Priority** | Medium |

---

## User Journey

```
Manager signs in
      │
      ▼
Overview page loads
      │  Reads personalized health snapshot
      │  Checks "Needs Attention" list
      ▼
Identifies overdue KPIs (high staleness)
      │
      ▼
Opens Manager Dashboard
      │  /<locale>/dashboards/manager
      ▼
Reviews assigned entities
      │  Checks which KPIs need data entry
      ▼
Navigates to Responsibilities page
      │  /<locale>/responsibilities
      ▼
Reviews full list of entity assignments
      │
      ▼
Navigates to KPI Performance Dashboard
      │
      ▼
Filters by own entities
      │  Reviews achievement % per KPI
      ▼
Identifies underperforming KPIs
      │
      ▼
Opens entity detail for each → reviews trend
      │
      ▼
For KPIs missing data → enters values (see UC-01)
      │
      ▼
Journey complete — full awareness of KPI portfolio
```

---

## Main Flow (Step-by-Step)

1. Manager signs in and lands on the **Overview** page (`/<locale>/overview`).
2. Manager reads the **personalized snapshot**:
   - The welcome banner shows quick links to KPI Management, Approvals, and Responsibilities.
   - The **Needs Attention** section lists KPIs that have not been updated recently, ranked by staleness (days since last entry).
3. Manager notes the KPIs in Needs Attention and takes note of which ones are their responsibility.
4. Manager clicks **Dashboards → Manager Dashboard** (`/<locale>/dashboards/manager`).
5. The Manager Dashboard shows:
   - Entities assigned to this manager
   - KPIs with no recent draft entry (needing data input)
   - Pending approvals in the manager's queue (if they are also an approver)
   - Team assignment summary
6. Manager identifies KPIs with no recent data and notes them for entry.
7. Manager navigates to **Responsibilities** page (`/<locale>/responsibilities`).
8. The Responsibilities page shows all user–entity assignments for the manager. Manager verifies the full list of KPIs they are accountable for.
9. Manager returns to the sidebar and opens **KPI Performance Dashboard** (`/<locale>/dashboards/kpi-performance`).
10. Manager applies filters:
    - Entity type = KPI (or the relevant type)
    - Time range = current quarter
11. Manager reviews the achievement % gauge for each of their assigned KPIs:
    - 🟢 Green (≥ 75%): On track — no immediate action
    - 🟡 Amber (50–74%): At risk — manager plans intervention
    - 🔴 Red (< 50%): Off track — urgent attention needed
12. For each underperforming KPI, manager clicks the entity name to open the detail page.
13. On the detail page, manager reviews:
    - The trend chart (is performance improving or declining?)
    - The value history (were values submitted on time?)
    - The note field on the latest entry (any context from previous data entry?)
14. For KPIs missing their current period value, manager proceeds to enter values (follows **UC-01**).
15. Manager now has a complete picture of their KPI portfolio and can plan corrective actions.

---

## Alternative Flows

### Alt A — Manager sees KPIs they shouldn't own
At step 8, manager sees assignments to KPIs they are no longer responsible for.
- Manager contacts the Admin to remove the assignment from the entity's Assignments tab.

### Alt B — Manager Dashboard shows no entities
At step 5, the Manager Dashboard is empty.
- Manager verifies they have entity assignments by checking the Responsibilities page.
- If no assignments exist, manager contacts Admin to add them to the relevant entities.

### Alt C — Manager wants to see how their KPIs compare org-wide
At step 9, manager wants broader context.
- Manager navigates to the **Executive Dashboard** (if they have access) or asks an Executive/Admin to share the organization-level view.

### Alt D — Manager wants to export their KPI portfolio
On the KPI Performance Dashboard.
- Manager clicks the **Export** button to download a CSV/PDF of their current filtered view.

---

## Business Rules

- A Manager sees **only** entities they are explicitly assigned to or own (`ownerUserId`).
- The **Needs Attention** section on the Overview page ranks entities by staleness regardless of period type — a yearly KPI could still appear if it hasn't been updated in many months.
- Achievement % is calculated from `APPROVED` / `LOCKED` values only — Draft and Submitted values do not affect the gauge shown in dashboards.
- The Manager Dashboard is personalized — it shows only this manager's data, not team-wide data.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Overview | `/<locale>/overview` |
| Manager Dashboard | `/<locale>/dashboards/manager` |
| Responsibilities | `/<locale>/responsibilities` |
| KPI Performance Dashboard | `/<locale>/dashboards/kpi-performance` |
| Entity Detail | `/<locale>/entities/<typeCode>/<entityId>` |
