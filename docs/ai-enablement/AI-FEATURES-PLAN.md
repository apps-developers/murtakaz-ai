# AI Features Plan for Rafed KPI
## Practical AI Features — Implementation Plan

> **Date:** March 2026
> **Status:** Ready for implementation
> **Stack:** Next.js + Prisma + PostgreSQL + Vercel AI SDK + OpenAI

---

## Features to Build

| # | Feature | What It Does | Effort |
|---|---------|-------------|--------|
| 1 | **Chat Assistant** | Ask questions about your KPIs, get answers from real data | M |
| 2 | **Executive Summary** | One-click performance report generation | S |
| 3 | **Formula Builder** | Describe calculation in plain language → AI writes the formula | S |
| 4 | **Auto-Translation** | One-click Arabic ↔ English for all bilingual fields | S |
| 5 | **Auto-Description** | AI suggests KPI description when you type a title | S |
| 6 | **Suggest Note** | AI drafts a note when a submitted value deviates from average | S |

**S = days, M = 1-2 weeks**

---

## 1. 🤖 AI Chat Assistant — Data Agent (Next Round)

A focused AI assistant that **answers questions, visualizes data, and recommends solutions**.
Uses Vercel AI SDK v6 `streamText` with tools. No multi-user interactions — works only with the current user's data and view.

### What It Can Do

**Data Queries (instant — no approval needed):**
```
User: "ما هي المؤشرات المتأخرة؟"
AI:   "لديك 3 مؤشرات لم يتم تحديثها منذ أكثر من 30 يوماً:
       1. معدل الاحتفاظ بالموظفين (45 يوم)
       2. ساعات التدريب (32 يوم)
       3. تكلفة التوظيف (31 يوم)"

User: "Which KPIs are RED?"
AI:   "You have 2 RED KPIs:
       1. Employee Retention — 41% (target: 75%)
       2. Cost Efficiency — 48% (target: 80%)"
```

**Charts & Visualization:**
```
User: "Show me a chart of revenue growth over the last 6 months"
AI:   [renders a line chart with actual data from the KPI]

User: "Compare Q1 vs Q2 performance"
AI:   [renders a bar chart comparing the two periods]
```

**Recommendations:**
```
User: "Employee retention is declining — what should I do?"
AI:   "Based on the 41% retention rate (target: 75%), here are recommendations:
       1. Exit interview analysis — identify top 3 reasons for leaving
       2. Benchmark against industry average (85% for your sector)
       3. Set up monthly retention dashboard
       4. Review compensation vs market rate"

User: "How can I improve cost efficiency?"
AI:   "Current cost efficiency is 48% (target: 80%).
       Analysis shows overspending in:
       - Operations: +15% over budget
       - Marketing: +8% over budget
       Recommendations:
       1. Review vendor contracts for renegotiation
       2. Implement approval workflow for expenses >$5K
       3. Set monthly budget alerts"
```

**Actions (for current user only):**
```
User: "Generate a Q1 report and download it"
AI:   "Here's your Q1 report: [Download PDF]"

User: "Export this KPI data to Excel"
AI:   "Data exported: [Download Excel file]"
```

### Tools

| Tool | What It Does |
|------|-------------|
| `getOrgOverview` | Overall org health, RAG counts |
| `getKpiList` | List KPIs with filters (status, type, owner) |
| `getKpiDetail` | Deep dive: history, trend, target, formula |
| `getStaleKpis` | KPIs with no recent value |
| `getPendingApprovals` | Approval queue with context |
| `getEntityHierarchy` | Pillar → Objective → KPI tree |
| `generateChart` | Returns chart spec (JSON) for frontend rendering |
| `generateReport` | Generates report for download (PDF/Excel) |

### Architecture

```
User message
    │
    ▼
POST /api/ai/chat (streaming)
    │
    ├── requireOrgMember() → get orgId, userId, role
    │
    ├── streamText({
    │     model: gpt-4o,
    │     system: agentSystemPrompt(role, locale),
    │     tools: { getOrgOverview, getKpiList, generateChart, ... },
    │     messages: conversationHistory,
    │   })
    │
    ├── AI decides which tools to call
    │   ├── Data query tools → execute → return structured data
    │   ├── generateChart → return chart spec → frontend renders
    │   └── generateReport → return download link
    │
    └── Stream response tokens to frontend
```

### Response Types

The AI can respond in 3 formats:

1. **Text** — plain answer with data
2. **Chart** — `{"type": "chart", "chartType": "line", "data": [...]}`
3. **Download** — `{"type": "download", "url": "/api/reports/xyz", "filename": "q1-report.pdf"}`

### Implementation Plan (Next Round)

```
Step 1: Create lib/ai/tools.ts — define data query tools (Prisma queries)
Step 2: Create lib/ai/agent-prompt.ts — system prompt with role context
Step 3: Rewrite chat/route.ts — streamText with tools, RBAC, conversation history
Step 4: Update chat panel frontend — handle chart rendering from AI responses
Step 5: Add generateChart tool — returns chart spec JSON for frontend
Step 6: Add generateReport tool — returns download links for PDF/Excel
Step 7: Test with real data
```

---

## 2. 📊 Executive Summary Generator

One-click → AI generates a performance report from dashboard data.

```
## Performance Summary — Q1 2026

Overall Health: 🟡 68%

Highlights:
- Revenue Growth at 91% — strongest KPI
- Customer Satisfaction at 95% — all-time high

Concerns:
- 🔴 Employee Retention at 41% — declining 4 quarters straight
- 🔴 Cost Efficiency at 48% — below target

Actions needed:
1. Enter values for 2 overdue KPIs
2. Review 1 rejected submission
```

---

## 3. 🧮 Formula Builder

Admin describes a calculation → AI generates the formula.

| User Says | AI Generates |
|-----------|-------------|
| "Net profit divided by revenue as %" | `(vars.NET_PROFIT / vars.REVENUE) * 100` |
| "Cap at 100% if exceeds target" | `vars.SALES >= vars.TARGET ? 100 : (vars.SALES / vars.TARGET) * 100` |
| "قسّم الأرباح على الإيرادات واضرب في 100" | `(vars.NET_PROFIT / vars.REVENUE) * 100` |

**Safety:** Validates output — blocks `eval`, `fetch`, `require`, `import`, etc.

---

## 4. 🌐 Auto-Translation

One-click Arabic ↔ English translation with KPI terminology.

**Fields:** `title`↔`titleAr`, `description`↔`descriptionAr`, `unit`↔`unitAr`, `mission`↔`missionAr`, `vision`↔`visionAr`

Uses a domain glossary so "Achievement rate" → "معدل الإنجاز" (not Google's "معدل التحقيق").

---

## 5. 📝 Auto-Description from Title

User types KPI title → AI auto-suggests description + Arabic description (debounced).

```
Title: "Customer Satisfaction Score"

→ Description: Measures overall customer satisfaction via post-interaction surveys.
→ الوصف: يقيس مدى رضا العملاء العام عبر استبيانات ما بعد التفاعل.
```

---

## 6. 💡 Suggest Note

When a submitted value deviates significantly from the historical average, AI suggests a professional note.

```
KPI: Revenue Growth
Value: 120% (historical avg: 72%, deviation: +48pp)

Suggested note: "The significant increase in revenue growth this period is attributed to
[market expansion / seasonal demand / one-time contract]. Further analysis recommended
to determine sustainability of this trend."
```

---

## Implementation Status

```
✅ Step 1: AI Infrastructure — lib/ai/client.ts, prompts.ts, guardrails.ts + AI SDK installed
✅ Step 2: Formula Builder — generateObject() + formula safety validation
✅ Step 3: Auto-Translation — generateObject() with KPI glossary prompt
✅ Step 4: Auto-Description — real AI call (was keyword-only before)
✅ Step 5: Suggest Note — generateText() with deviation context
✅ Step 6: Executive Summary — streamText() with real KPI data from DB
⬜ Step 7: AI Chat Assistant — agent with tools + actions (NEXT ROUND)
```

---

## Technical Setup

### Files

```
web/src/lib/ai/
├── client.ts       ✅ LLM provider setup (OpenAI via Vercel AI SDK v6)
├── prompts.ts      ✅ All prompt templates
├── guardrails.ts   ✅ Formula safety validation
├── tools.ts        ⬜ Agent tool definitions (chart, data queries)
└── agent-prompt.ts ⬜ Agent system prompt with role context

web/src/app/api/ai/
├── formula/route.ts       ✅ generateObject() + validation
├── translate/route.ts     ✅ generateObject() with glossary
├── auto-describe/route.ts ✅ generateObject() (was keyword-only)
├── suggest-note/route.ts  ✅ generateText()
├── summary/route.ts       ✅ streamText() with real KPI data
└── chat/route.ts          ⬜ AI Agent — data queries, charts, recommendations
```

### Environment Variables

```
OPENAI_API_KEY=sk-...      ✅ Set
AI_MODEL=gpt-4o-mini       ✅ Set (cheap, fast — formula/translate/describe/note)
AI_MODEL_SMART=gpt-4o      ✅ Set (reasoning — summary/chat)
```
