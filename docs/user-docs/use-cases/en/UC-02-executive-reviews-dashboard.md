# UC-02 — Executive Reviews Strategic Performance Dashboard

## Use Case Summary

| Field | Value |
|-------|-------|
| **ID** | UC-02 |
| **Title** | Executive reviews organizational performance via dashboards |
| **Primary Actor** | Executive (CEO / C-suite) |
| **Secondary Actors** | System |
| **Trigger** | Regular leadership review cadence (weekly, monthly, quarterly) |
| **Preconditions** | Executive is signed in; approved KPI values exist in the system |
| **Postconditions** | Executive has a current performance snapshot; may identify items needing attention |
| **Priority** | High |

---

## User Journey

```
Executive signs in
      │
      ▼
Overview page loads
      │  Reads health score, pending approvals, stat cards
      ▼
Notices a red/amber KPI in "Needs Attention"
      │
      ▼
Clicks "View Details" on Quarterly Progress chart
      │
      ▼
Dashboards catalog page opens
      │
      ▼
Selects "Executive Dashboard"
      │
      ▼
Reviews overall health score and trend
      │  Drills into a specific entity type
      ▼
Switches to "KPI Performance Dashboard"
      │
      ▼
Filters by entity type and current quarter
      │
      ▼
Identifies KPIs below target (Red/Amber)
      │
      ▼
Clicks a KPI name → goes to entity detail page
      │
      ▼
Reviews value history and trend chart
      │
      ▼
Navigates to "Governance Dashboard"
      │  Checks approval queue aging
      ▼
Journey complete — identifies action items
```

---

## Main Flow (Step-by-Step)

1. Executive signs in at `/<locale>/auth/login`.
2. **Overview** page loads automatically. Executive reads:
   - Health % progress bar (top-right card)
   - Stat cards: Strategies, Objectives, KPIs, Health %, Pending Approvals, Users
   - Quarterly Progress area chart
   - Needs Attention list
3. Executive notices one or more KPIs in the **Needs Attention** section with high staleness.
4. Executive clicks **View Details** under the Quarterly Progress chart.
5. The **Dashboards** catalog page opens (`/<locale>/dashboards`). All available dashboards are displayed as cards.
6. Executive clicks **Executive Dashboard** (`/<locale>/dashboards/executive`).
7. Dashboard loads with:
   - Overall RAG health score and trend direction
   - Entity count by type with status breakdown
   - KPI achievement rate
   - Pending approvals count
8. Executive applies a **time range filter** to the current quarter.
9. Executive switches to **KPI Performance Dashboard** (`/<locale>/dashboards/kpi-performance`).
10. Applies entity type filter to focus on a specific pillar or objective category.
11. Reviews the achievement % gauges — identifies KPIs showing red (< 50%) or amber (50–74%).
12. Clicks on one of the underperforming KPI names — navigates to the entity detail page.
13. On the entity detail page, reviews:
    - The KPI gauge (achievement vs target)
    - Value history table (all periods, statuses)
    - Trend chart
14. Executive navigates to **Governance Dashboard** (`/<locale>/dashboards/governance`) to check:
    - How many approvals are pending
    - Average turnaround time for approvals
15. Executive makes notes of action items to follow up with the relevant managers.

---

## Alternative Flows

### Alt A — No approved values exist yet
At step 7, dashboards show `—` or 0% for most metrics.
- Executive sees a message indicating no approved data.
- Executive navigates to Approvals to check for pending items awaiting approval.

### Alt B — Executive wants to drill deeper into an initiative
At step 11, Executive wants to see the full picture for a specific initiative.
- Executive navigates to **Initiative Health Dashboard**.
- Reviews health score, KPI contributions, and open risks for that initiative.

### Alt C — Executive wants to export a report
At any dashboard step, Executive clicks the **Export** button (CSV/PDF).
- Downloads a snapshot of the current filtered view.

---

## Business Rules

- Executives have **read-only** access to all entities and values.
- Executives **cannot** enter, submit, or edit KPI values.
- If `kpiApprovalLevel = EXECUTIVE`, the Executive can also access the Approvals page to approve/reject submitted values.
- Health scores are **system-calculated** and update on each page load.
- Only `APPROVED` and `LOCKED` values feed into dashboard metrics — drafts and submitted-but-not-approved values do **not** count.

---

## Screens Involved

| Screen | URL Pattern |
|--------|-------------|
| Overview | `/<locale>/overview` |
| Dashboards Catalog | `/<locale>/dashboards` |
| Executive Dashboard | `/<locale>/dashboards/executive` |
| KPI Performance Dashboard | `/<locale>/dashboards/kpi-performance` |
| Initiative Health Dashboard | `/<locale>/dashboards/initiative-health` |
| Governance Dashboard | `/<locale>/dashboards/governance` |
| Entity Detail | `/<locale>/entities/<typeCode>/<entityId>` |
