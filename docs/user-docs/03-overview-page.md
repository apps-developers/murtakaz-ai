# Overview Page

The **Overview** page (`/<locale>/overview`) is your personalized landing page after sign-in. It provides an executive-level health snapshot of your organization's KPIs, approvals, and strategic progress.

---

## Sections

### 1. Welcome Banner

Displays your name and organization. Contains quick-action links:

| Quick Link | Takes You To |
|-----------|-------------|
| **KPI Management** | The first entity type catalog (e.g., your top-level KPI category) |
| **Approvals** | The KPI value approvals queue |
| **Responsibilities** | Your user–entity assignment list |

---

### 2. Coverage Snapshot (Top-Right Card)

A concise summary of the organization's current state:

| Metric | Meaning |
|--------|---------|
| **KPIs** | Total number of KPI entities in the system |
| **Pending Approvals** | KPI values awaiting approval |
| **Health** | Overall organizational health % (progress bar) |

The **Health** score is a weighted aggregate of how current and how well-performing the KPI values are across all entities.

---

### 3. Summary Stat Cards

Six stat cards across the top of the main content area:

| Card | Icon Color | Meaning |
|------|-----------|---------|
| **Strategies** | Violet | Total active strategic entities |
| **Objectives** | Blue | Total organizational objectives |
| **KPIs** | Emerald | Total KPI entities |
| **Health %** | Cyan | Overall health score with progress bar |
| **Approvals** | Amber | Pending approval count |
| **Users** | Rose | Total users in the organization |

---

### 4. Browse by Category (Bar Chart)

A horizontal bar chart showing the count of entities per **entity type** (e.g., Strategy, Objective, KPI). Use this to understand where most of your organizational data lives.

---

### 5. Organizational Health (Donut Chart)

A donut chart showing how **fresh** your KPI values are, broken into segments:

| Segment | Color | Meaning |
|---------|-------|---------|
| **Excellent** | Green | Updated very recently |
| **Good** | Blue | Updated within normal cadence |
| **Fair** | Amber | Approaching staleness |
| **Needs Attention** | Red | Overdue / stale |
| **No Data** | Gray | No value ever recorded |

---

### 6. Recent Activity Feed

A chronological list of the latest KPI value entries across the organization, showing:
- Entity name (linked to its detail page)
- Status: Draft, Submitted, Approved, or Locked
- Timestamp

Click any entry to go directly to that entity's detail page.

---

### 7. Quarterly Progress (Area Chart)

A line/area chart plotting aggregated KPI performance over the current year by quarter. Use this to spot trend directions — improving, stable, or declining.

Click **View Details** to go to the full Dashboards page.

---

### 8. Needs Attention

Lists KPIs that have **not been updated recently**, ranked by how many days since the last value entry. Each item shows:
- Entity name (linked)
- Days since last update
- A staleness progress bar

Use this list to prioritize which KPI owners need to be reminded to submit data.

---

### 9. Team Performance

Shows the top entity **owners** ranked by how many entities they own, helping identify workload concentration or unassigned items.

---

### 10. Strategic Navigation

Quick-access buttons to the main sections of the application:

- **KPI Management** — entity catalog
- **Strategic Pillars** — pillars list
- **Objectives** — objectives list
- **Projects** — project portfolio
- **Risk Management** — risk register
- **Organization** — org structure

---

## Tips

- The Overview refreshes data on each page load.
- If cards show `—`, data is still loading or no records exist yet.
- The **Needs Attention** section is the fastest way to identify stale KPIs that need input.
