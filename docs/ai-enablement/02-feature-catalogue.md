# AI Feature Catalogue
## Rafed KPI — Full LLM Feature List

Each feature is rated by:
- **Priority:** P1 (critical) → P3 (nice-to-have)
- **Complexity:** S (small, days) / M (medium, weeks) / L (large, months)
- **Phase:** 1 (quick wins) → 4 (future)

---

## Category A — Conversational Intelligence

### A1 — AI Strategy Chat Assistant
**Priority:** P1 | **Complexity:** M | **Phase:** 1

A persistent chat interface that allows any authenticated user to ask natural language
questions about their organization's KPI data, in Arabic or English.

**Example queries:**
- *"What is our overall health score this quarter?"*
- *"Which KPIs are at risk of missing their annual target?"*
- *"من هو المالك الأكثر إنجازاً هذا الشهر؟"*
- *"Compare Q1 and Q2 performance for the Operations pillar"*
- *"What percentage of KPIs have been approved this month?"*

**How it works:**
1. User types a question in the chat panel
2. System assembles a prompt context: org name, entity types, recent KPI values, health scores, period status
3. LLM generates a grounded, cited response
4. Response includes links to relevant entity pages

**Scope boundary:**
- AI answers questions based on approved data only (not DRAFT values)
- AI cannot modify any data through chat — read-only
- Responses are scoped to the user's org and role (Managers only see assigned entities)

**UI placement:** Floating chat button on every page → slides out as a side panel

---

### A2 — Executive Summary Generator
**Priority:** P1 | **Complexity:** S | **Phase:** 1

One-click generation of a structured narrative summary of the organization's current
performance, suitable for copy-pasting into a board report or email.

**Output format:**
```
## Performance Summary — Q1 2026

### Overall Health: 🟡 68% (Amber)

**Highlights:**
- Vision & Growth pillar is performing well at 82% — driven by strong Revenue Growth KPI (91%).
- Operational Excellence has declined from 74% (Q4 2025) to 61% this quarter. The primary
  concern is Cost Reduction at 44% — investigate procurement variance.

**Urgent Actions Required:**
1. People & Culture (48%) requires immediate intervention. Employee Retention has fallen to
   41% — the lowest level in 12 months.
2. 7 KPIs have not been updated in over 60 days — data freshness is at risk.

**Approval Queue:**
- 12 values are pending approval, 4 of which have been waiting more than 10 days.
```

**Variants:**
- Full board report (long form)
- Weekly manager digest (short form)
- Arabic-language version (toggle)

**UI placement:** "Generate Summary" button on Overview and Dashboards pages

---

### A3 — Smart Anomaly Alert Engine
**Priority:** P1 | **Complexity:** M | **Phase:** 1

Automatically detects statistically unusual KPI values or trends and generates plain-language
alerts. Runs on a scheduled job (daily or on each value submission).

**Anomaly types detected:**

| Type | Description | Example |
|------|-------------|---------|
| **Spike** | Value far above historical average | Revenue +300% — data entry error? |
| **Drop** | Value far below historical average | CSAT dropped from 88% to 41% |
| **Flat line** | No change for N periods | KPI stuck at exact same value 3 months in a row |
| **Trend reversal** | Direction changed after consistent trend | After 6 months improving, now declining |
| **Missing period** | No value entered for expected period | Monthly KPI with nothing for February |
| **Target drift** | Achievement declining quarter over quarter | Was 80%, 75%, 68%, 61% — declining trend |

**Alert delivery:**
- In-app notification (see GAP-4 in gap analysis)
- Dashboard banner for logged-in user
- Future: email digest

**AI explanation example:**
> "⚠️ **Customer Satisfaction Score** (CSAT) — submitted value of 41% is 47 percentage
> points below the 6-month average of 88%. This level of drop is statistically rare.
> Please verify the source data before approving."

---

### A4 — Natural Language KPI Filter & Search
**Priority:** P2 | **Complexity:** S | **Phase:** 2

Transform the existing entity list page search into a natural language interface.

**Example queries on the KPI list page:**
- *"Show me all RED KPIs owned by Ahmed"*
- *"KPIs that haven't been updated this month"*
- *"All quarterly KPIs with no baseline value"*
- *"KPIs with achievement above 90%"*

**How it works:**
- LLM converts natural language to a structured filter object
- System applies the filter to the existing Prisma query
- Results render in the existing entity list UI

---

## Category B — Generative Assistance

### B1 — KPI Definition Wizard
**Priority:** P1 | **Complexity:** M | **Phase:** 2

Admin describes a strategic objective in plain text; AI suggests a set of relevant KPIs
with all fields pre-populated (title, Arabic title, unit, direction, period, formula suggestion,
baseline estimate, target suggestion).

**Input:**
```
"We want to improve customer service quality in our call center."
```

**Output:**
```
Suggested KPIs:

1. First Call Resolution Rate (FCR)
   Title AR: معدل الحل في المكالمة الأولى
   Unit: %  |  Direction: Increase is good  |  Period: Monthly
   Formula: (Resolved on first call ÷ Total calls) × 100
   Suggested target: ≥ 80%

2. Average Handle Time (AHT)
   Title AR: متوسط وقت المعالجة
   Unit: minutes  |  Direction: Decrease is good  |  Period: Monthly
   Suggested target: ≤ 5 min

3. Customer Satisfaction Score (CSAT)
   Title AR: مؤشر رضا العملاء
   Unit: %  |  Direction: Increase is good  |  Period: Quarterly
   Suggested target: ≥ 85%
```

User can accept all, accept selected, or edit before creating.

---

### B2 — Formula Builder Assistant
**Priority:** P1 | **Complexity:** S | **Phase:** 1

User describes a calculation in plain language; AI generates the formula code in the
Rafed KPI formula syntax (`vars.CODE` and `get("KEY")`).

**Examples:**

| User Description | AI-Generated Formula |
|-----------------|---------------------|
| "Net profit divided by total revenue, as a percentage" | `(vars.NET_PROFIT / vars.TOTAL_REVENUE) * 100` |
| "Average of KPI-001 and KPI-002" | `(get("KPI-001") + get("KPI-002")) / 2` |
| "If sales exceed target, show 100, otherwise show sales divided by target times 100" | `vars.SALES >= vars.TARGET ? 100 : (vars.SALES / vars.TARGET) * 100` |
| "Sum of all regional revenue KPIs" | `get("REV-NORTH") + get("REV-SOUTH") + get("REV-EAST") + get("REV-WEST")` |

**UI placement:** "Ask AI" button next to the Monaco formula editor on the entity create/edit page.
AI output is inserted directly into the formula editor for the user to review and test.

---

### B3 — Auto Arabic / English Translation
**Priority:** P1 | **Complexity:** S | **Phase:** 1

When an admin creates or edits an entity, clicking "Auto-translate" fills all `*Ar` fields
based on the English content (or vice versa), using an LLM with domain-specific terminology.

**Fields translated:**
- `title` ↔ `titleAr`
- `description` ↔ `descriptionAr`
- `unit` ↔ `unitAr`
- Variable `displayName` ↔ `nameAr`
- Organization `mission` ↔ `missionAr`, `vision` ↔ `visionAr`

**Quality considerations:**
- AI uses KPI domain terminology (مؤشر الأداء, الإنجاز, الهدف) not generic translations
- User reviews before saving — not auto-saved
- Arabic output is right-to-left aware

---

### B4 — Approval Rejection Comment Generator
**Priority:** P2 | **Complexity:** S | **Phase:** 2

When an approver clicks "Reject", AI suggests a structured rejection comment based on the
anomaly it detected in the submitted value.

**Input context passed to AI:**
- Entity name and description
- Historical values (last 6 periods)
- Submitted value and note
- Detected anomaly type (if any)

**Generated comment example:**
> "The submitted value of 23% is significantly below the historical average of 67% over
> the past 6 months, with no explanation provided. Please re-verify the source data,
> attach supporting documentation, and resubmit with a note explaining the cause of the
> variance."

Arabic version auto-generated in parallel.

---

### B5 — Automated Period Report Writer
**Priority:** P2 | **Complexity:** M | **Phase:** 2

At the end of each reporting period (monthly, quarterly), AI generates a complete
performance report for the organization, pillar, or individual manager.

**Report structure:**
1. Executive summary (2–3 paragraphs)
2. KPI performance table with trend indicators
3. Top performers (green KPIs, owners)
4. Areas requiring attention (amber/red KPIs)
5. Approval compliance status
6. Recommended actions

**Export options:** Copy to clipboard, download as PDF (future), share as link

---

### B6 — KPI Value Entry Smart Assist
**Priority:** P2 | **Complexity:** S | **Phase:** 2

When a manager opens the value entry form, AI provides contextual hints:

- **Expected range:** "Last month: 84%. Typical range: 78%–92%"
- **Anomaly warning:** "Your entry of 12% is far outside the expected range — please double-check"
- **Note suggestion:** "Consider explaining the 20% drop since last month"
- **Deadline reminder:** "This KPI is 5 days past its monthly reporting deadline"

---

## Category C — Predictive Intelligence

### C1 — KPI Trend Forecasting
**Priority:** P2 | **Complexity:** L | **Phase:** 3

Using historical KPI values (minimum 6 data points), predict the next 1–3 period values
using time-series analysis (statistical model) enhanced with LLM explanation.

**Output:**
- Predicted value with confidence interval
- RAG color prediction for next period
- Plain-language explanation: *"Based on the declining trend over 4 quarters, this KPI is
  forecast to reach 52% next quarter — below the 75% green threshold."*

**Model approach:**
- Statistical: Linear regression / ARIMA for the numeric prediction
- LLM: For explanation, contextualization, and recommendation generation

---

### C2 — At-Risk KPI Early Warning
**Priority:** P1 | **Complexity:** M | **Phase:** 3

Proactively identify KPIs likely to turn RED before the period closes, based on:
- Current achievement trajectory
- Days remaining in the period
- Historical end-of-period patterns

**Alert format:**
> "🚨 **Early Warning:** 'Employee Retention Rate' is currently at 61% with 8 days
> remaining in the quarter. Based on historical patterns, this KPI typically improves
> by 2–3% in the final week — projected final achievement: 63–64% (Amber zone).
> Immediate intervention is recommended to reach the 75% green threshold."

---

### C3 — Strategy Alignment Scoring
**Priority:** P3 | **Complexity:** L | **Phase:** 3

AI analyzes all active KPIs and their relationships to strategic pillars and objectives,
then generates an alignment score and identifies:
- **Orphan KPIs** — KPIs not linked to any strategic objective
- **Over-measured pillars** — pillars with too many KPIs (diluted focus)
- **Under-measured objectives** — objectives with no KPIs (invisible progress)
- **Contradictory KPIs** — KPIs that push in opposite directions within a pillar

---

### C4 — Benchmarking Suggestions
**Priority:** P3 | **Complexity:** L | **Phase:** 4

AI compares KPI targets against:
- Industry benchmarks (from embedded knowledge in LLM)
- Vision 2030 program benchmarks (from curated knowledge base)
- Historical best performance within the same org

**Output:** *"Your target for Customer Satisfaction (80%) is below the GCC financial sector
benchmark of 88%. Consider revising the target to 85% for a more competitive standard."*

---

## Category D — Administrative AI

### D1 — Org Onboarding Assistant
**Priority:** P2 | **Complexity:** M | **Phase:** 2

Super Admin creates a new organization by describing the sector and size; AI suggests:
- Recommended entity type hierarchy (Pillars → Objectives → Initiatives → KPIs)
- Starter set of 10–20 KPIs appropriate for the sector
- Appropriate `kpiApprovalLevel` based on org size

**Sectors supported initially:**
- Government / Public Sector
- Healthcare
- Education
- Financial Services
- Real Estate
- Retail / FMCG

---

### D2 — Governance Health Advisor
**Priority:** P2 | **Complexity:** S | **Phase:** 2

Weekly AI-generated governance report for Admins covering:
- Approval queue age distribution
- Data freshness compliance rate
- Users with most overdue submissions
- Suggested process improvements

Example insight:
> "Your average approval turnaround time this month was 8.4 days — 3x higher than last
> month's 2.9 days. This coincides with 2 approver accounts being inactive. Consider
> redistributing the approval workload."

---

### D3 — Smart User Manager
**Priority:** P3 | **Complexity:** S | **Phase:** 3

AI suggests optimal entity assignments for new users based on:
- Their role and department
- Existing assignment patterns in the org
- Current workload of other users in the same role

---

## Feature Priority Matrix

```
                    HIGH IMPACT
                         │
    B3 Auto-translate ───┤─── A1 Chat Assistant
    B2 Formula Builder ──┤─── A2 Exec Summary
    A3 Anomaly Alerts ───┤─── B1 KPI Wizard
                         │
LOW COMPLEXITY ──────────┼────────────────── HIGH COMPLEXITY
                         │
    A4 NL Search ────────┤─── C1 Forecasting
    B4 Rejection Helper ─┤─── GAP-2 Rollup
    D2 Gov Advisor ──────┤─── C3 Strategy Align
                         │
                    LOW IMPACT
```

**Start here (high impact, low complexity):** A2, B3, B2, A3
