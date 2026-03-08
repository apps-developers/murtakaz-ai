# Organizational Health and RAG Scoring

## What Is Organizational Health?

**Organizational health** refers to the ability of an organization to align around its goals, execute its strategy effectively, and renew itself over time. Unlike financial performance — which tells you *what happened* — organizational health tells you *whether the organization is capable of sustaining performance*.

In the context of performance management systems, "health" is operationalized as a **composite score** that reflects:
- How well KPI targets are being met
- How fresh and complete the performance data is
- How consistently the approval and governance processes are followed

---

## The RAG System: Red, Amber, Green

The most widely used visual shorthand for performance health is the **RAG system** (also called a traffic light system):

| Color | Meaning | Typical Threshold |
|-------|---------|------------------|
| 🟢 **Green** | On track — performing as expected | ≥ 75% |
| 🟡 **Amber** | At risk — needs attention and monitoring | 50–74% |
| 🔴 **Red** | Off track — urgent intervention required | < 50% |

RAG is not just for KPIs — it can be applied to projects, departments, initiatives, and entire organizational pillars.

### Why RAG Works
- **Instant comprehension**: Leadership can scan dozens of indicators in seconds
- **Action-oriented**: Each color implies a different level of required response
- **Non-technical**: No statistical knowledge required to interpret
- **Comparable**: Enables like-for-like comparison across different types of KPIs

---

## How Health Scores Are Calculated

A health score is a **composite, weighted metric** that combines multiple signals. In Rafed KPI, the organizational health score incorporates:

### 1. Achievement Score
How close is the actual value to the target?

```
For INCREASE_IS_GOOD:
  Achievement % = (Actual Value ÷ Target Value) × 100

For DECREASE_IS_GOOD:
  Achievement % = (Target Value ÷ Actual Value) × 100

Capped at 100% (over-performance does not inflate above 100%)
```

### 2. Data Freshness Score
How recently was the KPI value submitted and approved?

| Days Since Last Approved Value | Freshness Label | Score |
|-------------------------------|-----------------|-------|
| 0–30 days | Excellent | 100% |
| 31–60 days | Good | 75% |
| 61–90 days | Acceptable | 50% |
| 91+ days | Needs Attention | 25% |
| No data ever | No Data | 0% |

### 3. Compliance Score
Was the data submitted and approved within the expected period?

| Status | Compliance Signal |
|--------|-----------------|
| LOCKED / APPROVED value exists for current period | ✅ Compliant |
| SUBMITTED but not yet approved | ⏳ Pending |
| DRAFT only | ⚠️ Not submitted |
| No entry at all | ❌ Missing |

### Composite Formula (Conceptual)
```
Entity Health = w1 × Achievement% + w2 × Freshness% + w3 × Compliance%

Organization Health = Weighted Average of all Entity Health Scores
```

Where `w1`, `w2`, `w3` are configurable weights reflecting organizational priorities.

---

## Weighted Aggregation

Not all KPIs are equally important. **Weights** allow leadership to express the relative strategic importance of each KPI:

```
Pillar: Customer Excellence (Health Score = ?)
  ├── KPI: CSAT Score          weight=40%  health=80%
  ├── KPI: NPS                 weight=35%  health=60%
  └── KPI: Resolution Time     weight=25%  health=90%

Pillar Health = (40% × 80%) + (35% × 60%) + (25% × 90%)
             = 32 + 21 + 22.5
             = 75.5% → 🟢 Green
```

Without weights, all KPIs would contribute equally — which rarely reflects the true strategic priority.

---

## Health Score Principles

### The "Garbage In, Garbage Out" Problem
A health score is only as good as the data feeding it. An organization that enters inflated values will see a falsely green dashboard. This is why **data governance** (Chapter 4) and the approval workflow are foundational to meaningful health scoring.

### Freshness as a Quality Signal
A KPI with an old value is arguably worse than no KPI at all — it creates false confidence. Tracking data freshness alongside achievement is a best practice used in mature performance management systems.

### Beware of Gaming
When health scores are tied to rewards or consequences, teams may be tempted to game them (enter values just before the deadline, set low targets, or round up numbers). Mitigations include:
- Independent data verification
- Mandatory notes/attachments for submitted values
- Trend analysis that makes sudden improvements visible
- Strong approval governance

---

## The Health Dashboard Pattern

A well-designed performance dashboard uses health scores at multiple levels simultaneously:

```
ORGANIZATION LEVEL
  Overall Health: 🟡 68%
    │
    ├── PILLAR: Vision & Growth          🟢 82%
    │     ├── Revenue Growth KPI         🟢 91%
    │     └── Market Expansion KPI       🟡 73%
    │
    ├── PILLAR: Operational Excellence   🟡 61%
    │     ├── Process Efficiency KPI     🟢 78%
    │     ├── Cost Reduction KPI         🔴 44%
    │     └── Quality Score KPI          🟡 62%
    │
    └── PILLAR: People & Culture         🔴 48%
          ├── Employee Retention KPI     🔴 41%
          └── Training Completion KPI    🟡 55%
```

This structure lets a CEO instantly see that "People & Culture" is the biggest concern, and drill down to see that employee retention is the root driver.

---

## Trend Analysis: Health Over Time

A single health score is a snapshot. **Trends** reveal whether the organization is improving, stagnating, or declining:

| Trend Pattern | Interpretation |
|--------------|---------------|
| 🟢🟢🟢🟢 Stable Green | Sustained performance |
| 🔴🟡🟢🟢 Improving | Recovery in progress |
| 🟢🟢🟡🔴 Declining | Intervention needed now |
| 🟡🔴🟡🔴 Volatile | Inconsistent execution; root cause unclear |

Quarterly progress charts (like the one in the Rafed KPI Overview page) reveal these patterns at a glance.

---

## Health Scoring in Saudi Organizations

In Saudi Arabia's Vision 2030 context, health scoring has become central to national performance governance:

- **Government entities** report quarterly performance data with RAG status to oversight bodies
- **Vision Realization Programs** have defined health thresholds that trigger review escalations
- **Board and C-suite reporting** increasingly uses RAG dashboards as the primary format
- **Comparative benchmarking** across ministries and entities is done via standardized health scores

This context makes robust, governed health scoring a non-negotiable requirement for any serious performance management platform operating in the Saudi market.

---

## Summary: From Raw Data to Organizational Health

```
Raw Numbers (entered by managers)
        │ approval workflow
        ▼
Approved Values (trusted data)
        │ achievement formula
        ▼
Entity Health Scores
        │ weighted aggregation
        ▼
Pillar / Objective Health
        │ organizational rollup
        ▼
Organizational Health Score
        │ RAG coloring
        ▼
Executive Dashboard (actionable insight)
```

Every layer adds trust, context, and usability — transforming raw numbers into strategic intelligence.

---

## Further Reading

- McKinsey, *The Four Building Blocks of Change* (2015)
- Kaplan & Norton, *The Execution Premium* (2008)
- Marr, *25 Need-to-Know Key Performance Indicators* (2012)
- Saudi Vision 2030 — National Performance Management Framework
