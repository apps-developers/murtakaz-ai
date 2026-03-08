# AI Implementation Roadmap
## Phased Plan — From First Prototype to Full AI Platform

---

## Guiding Principles

1. **Ship something useful in Week 1** — start with the highest-impact, lowest-risk features
2. **Build on existing infrastructure** — no new databases or services until Phase 2
3. **Gate every phase on user feedback** — don't build Phase 3 if Phase 2 isn't working
4. **Arabic-first** — test every AI feature in Arabic before declaring it done
5. **Governance first** — every AI output is a suggestion; no AI writes directly to the database without human confirmation

---

## Phase Overview

```
Phase 1 — Foundation & Quick Wins     (Weeks 1–4)
Phase 2 — Generative Assistance       (Weeks 5–12)
Phase 3 — Predictive Intelligence     (Weeks 13–24)
Phase 4 — Autonomous Agents           (Weeks 25+)
```

---

## Phase 1 — Foundation & Quick Wins
### Weeks 1–4 | Goal: AI is live and visibly useful to every user

#### Week 1 — Infrastructure Setup

**Tasks:**
- [ ] Install Vercel AI SDK: `npm install ai @ai-sdk/openai`
- [ ] Create `web/src/lib/ai/client.ts` — LLM client factory
- [ ] Create `web/src/lib/ai/prompts.ts` — prompt template file (empty, fill per feature)
- [ ] Create `web/src/lib/ai/context.ts` — `buildOrgAIContext()` function
- [ ] Add environment variables to `.env.local` and deployment config:
  ```
  AI_PROVIDER=openai
  OPENAI_API_KEY=sk-...
  ```
- [ ] Add `AiInteraction` model to Prisma schema + migration (audit log)
- [ ] Write a smoke test: hardcoded prompt → confirm LLM responds

**Deliverable:** LLM client wired up, audit log working, no UI yet.

---

#### Week 2 — Executive Summary Generator (Feature A2)

This is the fastest way to show visible AI value — one button, one impressive output.

**Tasks:**
- [ ] Create `web/src/actions/ai-generate.ts` with `generateExecSummary()` server action
- [ ] Write `execSummary` prompt template in `prompts.ts`
- [ ] Build `buildOrgAIContext()` using data from `getOverviewInsights()` as base
- [ ] Add "Generate Summary" button to `web/src/app/[locale]/overview/page.tsx`
- [ ] Create `SummaryModal` component — shows streaming text output
- [ ] Add language toggle (AR / EN) to the modal
- [ ] Log every generation to `AiInteraction`

**Test checklist:**
- [ ] English summary generated correctly
- [ ] Arabic summary generated correctly and RTL-rendered
- [ ] Summary only references approved/locked values
- [ ] Output is grounded (no invented numbers)
- [ ] Runs in < 5 seconds

**Deliverable:** Any logged-in user can click "Generate Summary" and get a bilingual performance narrative.

---

#### Week 3 — Formula Builder Assistant (Feature B2)

High impact for Admins — eliminates the biggest friction point in KPI creation.

**Tasks:**
- [ ] Add `generateFormula()` server action to `ai-generate.ts`
- [ ] Write `formulaBuilder` prompt template
- [ ] Add "Ask AI" button to the formula editor section in `new/page.tsx` and `edit/page.tsx`
- [ ] Create `FormulaAssistantModal` — text input + AI output + "Insert into editor" button
- [ ] Validate AI output is a safe formula before insertion (no arbitrary JS)
- [ ] Show available `vars.CODE` names and `get("KEY")` options in the modal UI

**Test checklist:**
- [ ] Basic arithmetic descriptions → correct formula
- [ ] Cross-entity `get()` references work
- [ ] AI refuses to generate unsafe code (eval, fetch, require, etc.)
- [ ] Arabic description input → correct formula output

**Deliverable:** Admin can describe a formula in plain language and have it inserted into the Monaco editor.

---

#### Week 4 — Auto Arabic/English Translation (Feature B3)

Eliminates the tedious bilingual data-entry work that slows down every Admin.

**Tasks:**
- [ ] Add `autoTranslate()` server action to `ai-generate.ts`
- [ ] Write `autoTranslate` prompt template with KPI domain terminology
- [ ] Add "Auto-translate" button to entity create/edit form, next to `titleAr` / `descriptionAr` fields
- [ ] Add auto-translate to org settings page (mission, vision, about)
- [ ] Show translated text in input — user can edit before saving
- [ ] Translate in both directions: EN→AR and AR→EN

**Test checklist:**
- [ ] Common KPI terms translated correctly (معدل الإنجاز, مؤشر الأداء, القيمة الفعلية)
- [ ] Output is MSA (Modern Standard Arabic), not dialect
- [ ] Long descriptions truncate gracefully
- [ ] User can override AI translation before saving

**Deliverable:** Every text field with an Arabic counterpart has a one-click translation button.

---

**Phase 1 Exit Criteria:**
- [ ] AI features used at least once by 3 different user roles
- [ ] No AI-generated numbers that contradict the actual database values
- [ ] Audit log capturing all interactions
- [ ] Arabic output quality reviewed by native speaker

---

## Phase 2 — Generative Assistance
### Weeks 5–12 | Goal: AI helps users do their jobs faster

#### Weeks 5–6 — AI Chat Assistant (Feature A1)

**Tasks:**
- [ ] Create `web/src/actions/ai-chat.ts` with streaming `streamChatResponse()` action
- [ ] Extend `buildOrgAIContext()` with richer KPI detail (last 3 values, trend direction)
- [ ] Build `ChatPanel` component — floating button → slide-out panel
- [ ] Implement streaming text display (typewriter effect)
- [ ] Apply RBAC scoping: Managers only see their entities in context
- [ ] Add chat history (session-scoped, not persisted)
- [ ] Handle Arabic RTL input/output correctly
- [ ] Add suggested starter questions per role (e.g., "What needs my attention today?")

**Test checklist:**
- [ ] Answers are scoped to user's org (no cross-org leakage)
- [ ] Manager cannot get data about other managers' KPIs via chat
- [ ] Arabic questions get Arabic answers; English questions get English answers
- [ ] "I don't know" response when data is unavailable (no hallucination)

---

#### Weeks 7–8 — KPI Definition Wizard (Feature B1)

**Tasks:**
- [ ] Add `suggestKpis()` server action
- [ ] Write `kpiWizard` prompt template
- [ ] Build wizard modal: text input → loading → KPI cards with accept/reject per item
- [ ] Wire "Accept" to pre-fill the entity create form
- [ ] Add sector context to prompt (requires Gap 5 fix: sector field on org)
- [ ] Include Vision 2030 KPI examples in prompt for government/public sector orgs

---

#### Weeks 9–10 — Smart Anomaly Alerts (Feature A3)

**Tasks:**
- [ ] Create `web/src/actions/ai-alerts.ts` with `detectAnomalies()` function
- [ ] Implement statistical anomaly detection (z-score > 2.5 = anomaly)
- [ ] Generate plain-language explanation using LLM for detected anomalies
- [ ] Show anomaly banner on entity detail page when latest value is anomalous
- [ ] Trigger anomaly check on every `saveOrgEntityKpiValuesDraft()` call
- [ ] Show anomaly warning to the approver in the approvals queue
- [ ] Dispatch notification (requires GAP-4 notification system)

---

#### Weeks 11–12 — Rejection Comment Generator + Period Report Writer (Features B4, B5)

**Tasks (B4 — Rejection Comments):**
- [ ] Add `suggestRejectionComment()` action
- [ ] Show suggested comment in the rejection dialog
- [ ] Arabic + English versions side-by-side

**Tasks (B5 — Period Reports):**
- [ ] Add `generatePeriodReport()` action
- [ ] Build report viewer component with section navigation
- [ ] Add "Download as PDF" (use `@react-pdf/renderer` or `puppeteer`)
- [ ] Schedule automated generation at end of each reporting period

---

**Phase 2 Exit Criteria:**
- [ ] Chat assistant used daily by at least one executive per org
- [ ] KPI Wizard used for ≥ 30% of new KPI creation
- [ ] Anomaly detection has zero false-positive rate > 10%
- [ ] PDF report generation works in both languages

---

## Phase 3 — Predictive Intelligence
### Weeks 13–24 | Goal: AI predicts problems before they appear

#### Weeks 13–16 — KPI Trend Forecasting (Feature C1)

**Tasks:**
- [ ] Implement time-series forecasting (start with linear regression, upgrade to ARIMA)
- [ ] Require minimum 6 approved data points before forecasting
- [ ] Show forecast chart on entity detail page: dotted line extending from history
- [ ] LLM generates plain-language forecast narrative
- [ ] Show confidence interval band on chart
- [ ] "Insufficient data" graceful fallback

---

#### Weeks 17–20 — At-Risk Early Warning (Feature C2)

**Tasks:**
- [ ] Build trajectory calculation: current achievement + days remaining in period → predicted final
- [ ] Identify KPIs whose predicted final is below green threshold
- [ ] Surface as "At Risk" section on overview page (separate from "Needs Attention")
- [ ] Send proactive notification to KPI owner and approver
- [ ] Include recommended action in the alert

---

#### Weeks 21–24 — Strategy Alignment Scoring + pgvector (Feature C3)

**Tasks:**
- [ ] Add `pgvector` extension to PostgreSQL
- [ ] Add `embedding vector(1536)` column to `entities` table
- [ ] Build background job to generate embeddings for all entities
- [ ] Implement alignment score: cosine similarity between KPI embedding and pillar embedding
- [ ] Surface "orphan KPIs" and "misaligned KPIs" in admin dashboard
- [ ] Upgrade chat assistant to use RAG (retrieve relevant entities by embedding similarity)

---

**Phase 3 Exit Criteria:**
- [ ] Forecasting accuracy: predicted vs actual within 15% for ≥ 70% of forecasts
- [ ] At-risk alerts fire at least 7 days before period end
- [ ] RAG-based chat is measurably more accurate than full-context chat

---

## Phase 4 — Autonomous Agents
### Weeks 25+ | Goal: AI handles routine tasks end-to-end

#### Features
- **Automated Stakeholder Reports** — AI writes and sends period reports to configured recipients without human authoring
- **Target Calibration Agent** — AI recommends target adjustments based on trend analysis and benchmarks; Admin approves with one click
- **Cross-Org Benchmarking** — Anonymized performance comparison across orgs in the platform (requires multi-org aggregate data pipeline)
- **Compliance Agent** — AI automatically reminds owners about upcoming deadlines, escalates to managers if overdue

#### Governance Requirements for Phase 4
Phase 4 features involve AI taking actions (not just generating text). Every autonomous action must:
1. Be logged in the `AiInteraction` audit log with action type and parameters
2. Require explicit user authorization or be restricted to low-risk actions (e.g., sending a reminder vs. approving a value)
3. Be reversible where possible
4. Be clearly labeled as "AI-generated" in the UI

---

## Resource Requirements

### Development Team
| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|
| Full-stack developer | 1 | 1–2 | 2 | 2–3 |
| AI/ML engineer | 0 | 0.5 | 1 | 1–2 |
| Arabic NLP reviewer | 0.25 | 0.5 | 0.5 | 0.5 |
| QA | 0.5 | 1 | 1 | 1 |

### Infrastructure Costs (Estimates)

| Item | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| OpenAI API (GPT-4o) | ~$50–200/mo | ~$200–800/mo | ~$500–2000/mo |
| pgvector (no extra cost — existing PostgreSQL) | — | $0 | $0 |
| Embedding generation (one-time) | — | ~$5–20 | — |
| Jais API (Arabic-first, optional) | $0–50/mo | $50–200/mo | $100–500/mo |

> **Cost optimization:** Cache AI responses for identical inputs (executive summaries with the same underlying data). Implement request deduplication. Use GPT-4o-mini for low-stakes features (translation, formula builder).

---

## Decision Points

### After Phase 1: Provider Review
Evaluate whether OpenAI GPT-4o is the right primary model, or whether:
- **Jais / Allam** (Arabic-first) gives better Arabic output quality
- **Claude 3.5 Sonnet** gives better analytical reasoning for summaries
- **Self-hosted Llama 3.1** is needed for data-sensitive orgs that cannot send data to external APIs

### After Phase 2: RAG vs. Full Context
Determine whether the full-context approach (include all KPI data in every prompt) is still
viable at scale, or whether pgvector RAG should be introduced earlier to reduce cost and
improve response quality.

### Before Phase 4: Legal & Compliance Review
Before any AI takes autonomous actions (sending emails, filing reports), review:
- Saudi data protection law (PDPL) compliance
- Disclosure requirements for AI-generated reports
- Approval chain for AI-initiated notifications
