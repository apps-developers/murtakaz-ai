# KPI Design and Measurement

## What Is a KPI?

A **Key Performance Indicator (KPI)** is a quantifiable measure used to evaluate how effectively an individual, team, or organization is achieving a key objective. The word *key* is critical — not every metric is a KPI. A KPI must be directly linked to a strategic goal that matters.

> "What gets measured gets managed." — Peter Drucker

---

## KPI vs. Metric vs. Goal

These terms are often confused:

| Term | Definition | Example |
|------|-----------|---------|
| **Goal** | The desired outcome | "Increase customer satisfaction" |
| **Metric** | Any quantifiable data point | "Number of support tickets" |
| **KPI** | A metric directly tied to a strategic goal | "Customer Satisfaction Score (CSAT) ≥ 85%" |

Not every metric deserves to be a KPI. Too many KPIs dilute focus. Best practice is **5–10 KPIs per organizational level** at most.

---

## The SMART KPI Framework

A well-designed KPI must be:

| Letter | Attribute | Question to Ask |
|--------|-----------|----------------|
| **S** | Specific | Is it clear exactly what is being measured? |
| **M** | Measurable | Can we quantify it with a number? |
| **A** | Achievable | Is the target realistic given our resources? |
| **R** | Relevant | Does it directly reflect a strategic priority? |
| **T** | Time-bound | Is there a defined measurement period? |

---

## Anatomy of a Well-Defined KPI

Every KPI should have these attributes documented before it is tracked:

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Title** | Clear, descriptive name | "Employee Retention Rate" |
| **Owner** | The person accountable for performance | Head of HR |
| **Baseline** | Starting reference value | 72% (last year) |
| **Target** | The goal to achieve | 85% by Q4 |
| **Unit** | How the value is expressed | % |
| **Direction** | What direction means success | Higher is better |
| **Period** | How often it is measured | Quarterly |
| **Data Source** | Where the value comes from | HR System |
| **Formula** | How it is calculated (if applicable) | (Retained Staff ÷ Total Staff) × 100 |

---

## KPI Types by Source

KPIs differ in how their values are produced:

### 1. Manual KPIs
The responsible person enters the value directly each period.
- **Best for**: Data collected outside automated systems (surveys, physical counts, assessments)
- **Risk**: Human error, delay, inconsistency
- **Example**: "Customer satisfaction score" entered monthly from survey results

### 2. Calculated KPIs
The value is computed automatically from a formula using input variables.
- **Best for**: Derived ratios, efficiency metrics, composite scores
- **Risk**: Formula errors; all input variables must be entered
- **Example**: `Profit Margin % = (Revenue - Cost) / Revenue × 100`

### 3. Derived KPIs
The value is automatically pulled from another KPI or entity's value.
- **Best for**: Aggregating child KPIs into a parent score; avoiding duplicate data entry
- **Example**: "Group Revenue" derived from the sum of all department revenue KPIs

### 4. Score KPIs
A composite health score aggregated from child entity values using weights.
- **Best for**: Pillar-level or objective-level health summaries
- **Example**: "Operational Excellence Score" = weighted average of 5 sub-KPIs

---

## KPI Direction

The direction tells the system whether an increase or decrease signals positive performance:

| Direction | Meaning | Example KPI |
|-----------|---------|-------------|
| **Increase is Good** | Higher values are better | Revenue, Customer Satisfaction |
| **Decrease is Good** | Lower values are better | Error Rate, Staff Turnover, Cost |

This setting affects how achievement percentages and health scores are calculated.

---

## Measurement Periods

KPIs must be measured at the right cadence:

| Period Type | Frequency | Best For |
|-------------|-----------|---------|
| **Monthly** | Every month | Operational KPIs, financial metrics |
| **Quarterly** | Every 3 months | Strategic KPIs, project milestones |
| **Yearly** | Once a year | Long-term strategic objectives |

Mixing periods in a dashboard requires careful aggregation rules — which is why each KPI has a configured `aggregation method` (Last Value, Sum, Average, Min, Max).

---

## Leading vs. Lagging KPIs

A critical distinction often overlooked:

| Type | Definition | When it tells you | Example |
|------|-----------|------------------|---------|
| **Lagging** | Measures outcomes after they happen | Too late to change | Revenue, Customer churn |
| **Leading** | Measures activities that predict future outcomes | Early warning | Sales calls made, Training hours |

**Best practice**: Use a balanced mix. Lagging KPIs tell you *what happened*; leading KPIs tell you *what will happen*.

---

## Common KPI Design Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| **Too many KPIs** | Overwhelm, loss of focus | Limit to 5–10 per level |
| **No owner** | Nobody is accountable | Assign a named owner to every KPI |
| **Vanity metrics** | Look good but don't reflect real value | Link every KPI to a strategic objective |
| **No baseline** | Cannot measure progress | Always record a starting baseline value |
| **Ambiguous formula** | Different people calculate differently | Document the exact formula and data source |
| **Wrong period** | Measuring too rarely misses issues | Match period to the natural rhythm of the metric |
| **Target set too high** | Demotivates the team | Set stretch targets that are challenging but achievable |
| **Target set too low** | Provides false confidence | Review targets regularly against benchmarks |

---

## KPI Lifecycle in Practice

A KPI does not just exist — it goes through a lifecycle:

```
DESIGN    →  CONFIGURE  →  MEASURE  →  REVIEW  →  RETIRE/REVISE
(Define       (Set up in     (Enter       (Approve,    (Adjust target,
 purpose,      the system,    values,      analyze,      archive, or
 formula,      assign         submit)      act on)       replace)
 target)       owner)
```

In Rafed KPI, this lifecycle maps directly to the platform's entity creation, value entry, approval, and dashboard review flows.

---

## KPI Aggregation: From Individual to Organizational

KPIs at the individual or team level roll up into organizational performance:

```
Individual KPIs (Manager level)
        │
        ▼  weighted aggregation
Department / Pillar KPIs
        │
        ▼  weighted aggregation
Organizational Health Score
```

The weights assigned to each KPI determine how much it influences the parent score — allowing leadership to emphasize the most strategically critical metrics.

---

## Further Reading

- Parmenter, *Key Performance Indicators* (2015)
- Marr, *Key Performance Indicators* (2012)
- Kaplan & Norton, *Strategy Maps* (2004)
- Hubbard, *How to Measure Anything* (2010)
