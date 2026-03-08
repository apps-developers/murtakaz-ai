# AI Vision & Use Cases
## Rafed KPI — LLM Integration

---

## The Core Vision

> **"Every leader in your organization should be able to ask a question about their strategy
> performance and get a clear, trusted, bilingual answer — in seconds."**

Today, extracting insight from Rafed KPI requires:
1. Navigating to the right dashboard
2. Reading multiple charts and tables
3. Mentally connecting trends across KPIs
4. Writing a narrative for a board report

With AI, steps 1–4 collapse into a single conversation.

The vision is not to replace human decision-making. It is to eliminate the **hours of
manual analysis** that stand between data and action — so that leaders spend their time
making decisions, not preparing to make them.

---

## Strategic Alignment with Vision 2030

Saudi Arabia's Vision 2030 mandates data-driven governance. The **Saudi Data & AI
Authority (SDAIA)** and the **National Program for Artificial Intelligence** explicitly
call for AI integration into government performance management systems.

Rafed KPI with AI capabilities directly supports:
- **National AI Strategy** — embedding AI into sectoral performance monitoring
- **Government Performance Center (Adaa)** — automated KPI reporting pipelines
- **Digital Transformation programs** — replacing manual report-writing with AI generation
- **Arabic NLP adoption** — using Arabic-first models (Jais, Allam) to serve Arabic speakers naturally

---

## User Stories by Role

### EXECUTIVE / CEO

| Story | Without AI | With AI |
|-------|-----------|---------|
| **Morning briefing** | Open 5 dashboards, read charts, form a mental picture | Ask: *"What is our performance status this quarter?"* — AI returns a 3-paragraph summary with red flags highlighted |
| **Board report preparation** | Spend 3 hours writing a narrative from dashboard data | Click "Generate Board Report" — AI drafts a structured narrative in 30 seconds |
| **Spot a problem** | Manually scan all KPIs for RED status | AI proactively sends: *"Employee Retention dropped 12% since last month — this is a new pattern"* |
| **Ask a strategic question** | Export data to Excel, analyze, interpret | Ask: *"Which pillar is most at risk of missing its year-end target?"* |

---

### MANAGER

| Story | Without AI | With AI |
|-------|-----------|---------|
| **Enter a KPI value** | Navigate to entity, enter number, submit | AI pre-fills expected range: *"Last month was 84%. Your entry of 40% is unusually low — is this correct?"* |
| **Write a monthly note** | Type free-form justification | AI suggests: *"Based on the 15% drop, consider noting: market demand decline in Q4"* |
| **Understand a formula** | Read raw formula code | Ask: *"Explain this formula in plain Arabic"* — AI translates `vars.REVENUE - vars.COST / vars.REVENUE * 100` into a clear explanation |
| **Know what to focus on** | Browse all assigned KPIs | AI surfaces: *"You have 3 KPIs due this week and 1 that is 45 days stale"* |

---

### ADMIN

| Story | Without AI | With AI |
|-------|-----------|---------|
| **Create new KPIs** | Manually define each field | Describe objective: *"We want to measure operational efficiency"* — AI suggests 5 relevant KPIs with formulas, units, and targets |
| **Fill Arabic translations** | Manually translate every field | Click "Auto-translate" — AI fills `titleAr`, `descriptionAr`, `unitAr` instantly |
| **Write formula** | Learn formula syntax | Describe: *"Divide net profit by total revenue, multiply by 100"* — AI writes `(vars.NET_PROFIT / vars.REVENUE) * 100` |
| **Governance review** | Manually check for stale KPIs | AI report: *"12 KPIs have no approved value this period — here is the list by owner"* |

---

### APPROVER (EXECUTIVE / ADMIN)

| Story | Without AI | With AI |
|-------|-----------|---------|
| **Review a submitted value** | Compare number to last period mentally | AI shows: *"This value is 23% lower than the 6-month average. Similar drops occurred in Jan 2025 after a system change."* |
| **Write a rejection reason** | Free-text, often vague | AI suggests a structured rejection comment based on the anomaly pattern |
| **Prioritize queue** | Review all submissions in order | AI ranks by risk: *"These 3 submissions have values outside expected range — review first"* |

---

### SUPER ADMIN

| Story | Without AI | With AI |
|-------|-----------|---------|
| **Cross-org performance view** | Manually compare org dashboards | Ask: *"Which organizations are below 60% health this month?"* |
| **Onboard a new org** | Manually configure entity types | Describe the org's sector — AI suggests a starter set of entity types and KPIs |
| **Detect system-wide issues** | Manual monitoring | AI alert: *"Approval queue across 3 organizations has grown by 40% this week — possible process bottleneck"* |

---

## The Three Modes of AI in Rafed KPI

### Mode 1 — AI as Analyst (Chat)
User asks questions, AI answers using live org data.

```
User: "ما هو أداء مؤشرات الأداء الخاصة بي هذا الشهر؟"
AI:   "لديك 8 مؤشرات أداء نشطة. 5 منها في الوضع الجيد (أخضر)،
       2 تحتاج إلى اهتمام (أصفر)، و1 في وضع حرج (أحمر).
       المؤشر الأكثر خطورة هو 'معدل الاحتفاظ بالموظفين' بنسبة إنجاز 38%."
```

### Mode 2 — AI as Assistant (Generate)
AI helps users create content faster — reports, KPI definitions, notes, translations.

```
Admin: "Suggest KPIs for a Customer Service department"
AI:    "Here are 5 suggested KPIs:
        1. First Call Resolution Rate — target ≥ 85% — monthly
        2. Average Handle Time — target ≤ 5 min — monthly
        3. Customer Satisfaction Score (CSAT) — target ≥ 4.2/5 — quarterly
        ..."
```

### Mode 3 — AI as Monitor (Proactive)
AI watches data continuously and alerts users without being asked.

```
AI → Manager notification:
"⚠️ KPI Alert: 'Cost Per Unit' has increased 18% over the past 3 periods.
If this trend continues, it will breach the annual target by Q3.
Recommended action: Review procurement contracts."
```

---

## What Makes This Unique vs. Generic AI Tools

| Dimension | Generic ChatGPT | Rafed KPI AI |
|-----------|----------------|--------------|
| **Data access** | No access to your data | Full access to your org's governed KPI data |
| **Context** | No org context | Knows your pillars, objectives, KPI owners, periods |
| **Language** | English-first | Arabic + English, bilingual responses |
| **Trust** | Answers from internet knowledge | Answers grounded in approved, audited values only |
| **Action** | Conversation only | Can trigger workflows (submit, flag, notify) |
| **Governance** | No audit trail | Every AI action is logged |
