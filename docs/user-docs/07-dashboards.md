# Dashboards

The **Dashboards** section (`/<locale>/dashboards`) provides role-based analytical views of your organization's strategic performance. Each dashboard answers a specific leadership question and supports drill-down into underlying data.

---

## Accessing Dashboards

1. Click **Dashboards** in the left sidebar.
2. The dashboard catalog page shows all available dashboards as cards.
3. Click any dashboard card to open it.

Or navigate directly using the URLs listed below.

---

## Available Dashboards

### 1. Executive Dashboard
**URL:** `/<locale>/dashboards/executive`

**Answers:** *"Are we on track to deliver our strategy?"*

Designed for CEO and senior leadership. Shows a high-level RAG (Red/Amber/Green) health summary of all strategic entities.

**Key content:**
- Overall health score and trend
- Entity count by type with status breakdown
- KPI achievement rate (% meeting target)
- Pending approvals count
- Top-level performance indicators
- Quarterly progress area chart

**Who uses it:** EXECUTIVE, ADMIN

---

### 2. PMO / Strategy Office Dashboard
**URL:** (accessed via dashboard catalog)

**Answers:** *"Where is execution deviating from strategy?"*

For the Strategy Office or PMO team to monitor alignment and governance.

**Key content:**
- Entity coverage by type
- KPIs without recent data (stale)
- Pending approval queue aging
- Change requests status
- Orphaned entities (no owner assigned)

**Who uses it:** ADMIN, EXECUTIVE

---

### 3. Initiative Health Dashboard
**URL:** `/<locale>/dashboards/initiative-health`

**Answers:** *"Is this initiative deliverable without intervention?"*

Focuses on initiative-level health, tracking KPI contribution, progress, and risks.

**Key content:**
- Health score per initiative
- KPI trend direction
- Milestone completion rates
- Open risks and blockers

**Who uses it:** ADMIN, EXECUTIVE, MANAGER

---

### 4. KPI Performance Dashboard
**URL:** `/<locale>/dashboards/kpi-performance`

**Answers:** *"Which metrics are driving or dragging strategy?"*

Deep-dive into KPI data: targets vs actuals, trends, data freshness, and governance status.

**Key content:**
- KPI list with target vs actual values
- Achievement % gauges
- Freshness indicators (days since last value)
- Submission and approval status per KPI
- Period-type breakdown (Monthly / Quarterly / Yearly)

**Who uses it:** ADMIN, EXECUTIVE, MANAGER

---

### 5. Manager Dashboard
**URL:** `/<locale>/dashboards/manager`

**Answers:** *"What do I own, and what needs my attention?"*

Personalized view for managers showing their assigned entities and pending work.

**Key content:**
- Entities assigned to you
- KPIs needing data entry (no recent draft)
- Pending approvals in your queue
- Team assignment summary

**Who uses it:** MANAGER, ADMIN

---

### 6. Project Execution Dashboard
**URL:** `/<locale>/dashboards/project-execution`

**Answers:** *"Is execution progressing as planned?"*

Tracks project-level execution: milestones, contributions, dependencies, and blockers.

**Key content:**
- Project status overview
- Milestone completion by project
- Days blocked / at-risk indicators
- Contribution frequency

**Who uses it:** MANAGER, ADMIN

---

### 7. Employee Contribution Dashboard
**URL:** `/<locale>/dashboards/employee-contribution`

**Answers:** *"How does my work contribute to strategy?"*

Shows individual contribution history and alignment to strategic objectives.

**Key content:**
- Assigned projects and entities
- Logged contributions per period
- Strategic alignment indicators

**Who uses it:** MANAGER (for team members), ADMIN

---

### 8. Risk & Escalation Dashboard
**URL:** `/<locale>/dashboards/risk-escalation`

**Answers:** *"Where do we need leadership intervention now?"*

Surfaces critical and escalated risks across the organization.

**Key content:**
- Open critical risks by severity
- Escalated items
- Average days unresolved
- Mitigation ownership

**Who uses it:** ADMIN, EXECUTIVE

---

### 9. Governance Dashboard
**URL:** `/<locale>/dashboards/governance`

**Answers:** *"Is strategy being governed correctly?"*

Tracks the approval and change governance process.

**Key content:**
- Approval queue size and aging
- Average approval turnaround time
- Approved vs rejected values per period
- Entities with no approval activity

**Who uses it:** ADMIN, EXECUTIVE

---

## Dashboard Controls

Most dashboards include:

| Control | Description |
|---------|-------------|
| **Time range filter** | Scope data to a specific period (e.g., current quarter, last 90 days) |
| **Entity type filter** | Focus on a specific entity type |
| **Status filter** | Filter by entity status (ACTIVE, AT_RISK, etc.) |
| **Drill-down links** | Click any card, chart bar, or table row to go to the related entity page |

---

## Understanding Health Scores

Health is **system-calculated** — it is not manually set by users. The health score uses:

- **KPI achievement**: how close actual values are to targets
- **Data freshness**: how recently values were submitted and approved
- **Approval compliance**: whether values have gone through the proper approval lifecycle

Health thresholds (approximate):

| Color | Score | Meaning |
|-------|-------|---------|
| 🟢 **Green** | ≥ 75% | On track |
| 🟡 **Amber** | 50–74% | At risk, needs attention |
| 🔴 **Red** | < 50% | Off track, intervention needed |

---

## Exporting Dashboard Data

Where available, use the **Export** button (CSV or PDF) on the dashboard page to download the current view. Exports respect the active filters.

---

## Tips

- Start with the **Executive Dashboard** for a top-level view, then drill into **KPI Performance** for specifics.
- The **Governance Dashboard** is the best place to catch stalled approvals.
- Use the **Needs Attention** section on the Overview page as a faster alternative to navigating through dashboards for day-to-day monitoring.
