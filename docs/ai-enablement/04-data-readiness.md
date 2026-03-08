# Data Readiness for AI
## What We Have, What We Need, and How to Prepare

---

## Why Data Readiness Matters

An LLM is only as useful as the context you give it. Rafed KPI already has structured,
governed, bilingual data — which is a significant advantage. But some data quality and
enrichment work is needed to make AI features maximally effective.

This document answers three questions:
1. What data do we already have that AI can use today?
2. What data gaps exist that will limit AI quality?
3. How do we prepare the data and prompts to get the best results?

---

## What We Have Today — AI-Ready Assets

### ✅ Structured Entity Data
Every entity in the system has clean, typed fields that map directly to prompt context:

| Field | AI Use |
|-------|--------|
| `title` / `titleAr` | Bilingual entity names in prompts |
| `description` / `descriptionAr` | Semantic understanding of what the KPI measures |
| `direction` | Correct achievement formula selection |
| `targetValue` / `baselineValue` | Performance comparison context |
| `periodType` | Temporal reasoning ("this month's value", "quarterly target") |
| `unit` / `unitAr` | Correct formatting of values in output |
| `weight` | Importance weighting in explanations |
| `formula` | Formula explanation feature |
| `ownerUser.name` | Accountability attribution in summaries |

### ✅ Governed Value History
`EntityValue` records form a time series per KPI — essential for trend analysis:

| Field | AI Use |
|-------|--------|
| `finalValue` / `achievementValue` | Current performance level |
| `status` (DRAFT/SUBMITTED/APPROVED/LOCKED) | Data trustworthiness filter |
| `createdAt` | Temporal ordering, freshness calculation |
| `note` | User context — why a value changed |
| `enteredBy` / `approvedBy` | Attribution for audit summaries |
| `submittedAt` / `approvedAt` | SLA and timeliness analysis |

### ✅ Organizational Metadata
| Field | AI Use |
|-------|--------|
| `Organization.vision` / `mission` | Strategic alignment context |
| `OrgEntityType` codes and names | Hierarchy understanding |
| `kpiApprovalLevel` | Governance context for summaries |
| `User.role` | Role-appropriate response scoping |

### ✅ Bilingual Support
Every content field has an Arabic counterpart. The AI can generate Arabic and English
responses from the same data without translation — a major advantage for Saudi deployments.

---

## Data Gaps — What Needs to Improve

### Gap 1: Missing Descriptions (Most Common)
**Problem:** Many entities are created with `title` only — no `description` or `descriptionAr`.
The AI cannot explain what a KPI measures if there's no description.

**Impact:** Chat assistant gives vague answers; KPI Wizard cannot match objectives to KPIs.

**Fix:**
- Make `description` a recommended (soft-required) field in the UI with a placeholder
- AI can auto-generate a description from the title on creation (`B3 Auto-translate` feature)
- Admin dashboard: surface "KPIs with no description" as a data quality metric

---

### Gap 2: No Historical Baseline (New Orgs)
**Problem:** New organizations have no historical value data. Trend analysis and anomaly
detection require a minimum of 3–6 data points per KPI.

**Impact:** Forecasting (C1), anomaly detection (A3), and trend summaries cannot function
until data accumulates.

**Fix:**
- Allow import of historical data during onboarding (CSV import feature)
- AI summaries should gracefully degrade: *"Insufficient history for trend analysis — 2 values recorded, 4 more needed."*
- Show "AI readiness score" per KPI based on data history depth

---

### Gap 3: No Parent-Child Entity Relationships
**Problem:** Entities are flat — there is no formal parent-child link (this is also GAP-2 in
the gap analysis document). The AI cannot reason about hierarchy: "which KPIs roll up to this pillar?"

**Impact:** Weighted rollup summaries, pillar health calculation, and strategy alignment
scoring all require hierarchy context.

**Fix:** Implement `parentEntityId` on `Entity` (see gap analysis). Once in place, the
context builder can include hierarchy paths in prompts:
```
KPI: Customer Satisfaction
  └── Objective: Improve Customer Experience
        └── Pillar: Growth & Market Position
              └── Strategy: Vision 2030 Alignment
```

---

### Gap 4: Unstructured Notes
**Problem:** The `EntityValue.note` field is free text with no structure. Notes like
"fixed" or "same as usual" are not useful to an AI.

**Impact:** Rejection comment generator (B4) and anomaly explanations cannot incorporate
user context effectively.

**Fix:**
- Add structured note templates with AI assist: "Why did this value change significantly?"
- Optionally: add a `changeCategory` enum (`DATA_CORRECTION / MARKET_CHANGE / PROCESS_CHANGE / SEASONAL / OTHER`)
- AI can then pattern-match: "3 of the last 5 drops were tagged SEASONAL — likely not a concern"

---

### Gap 5: No Sector / Industry Classification
**Problem:** The `Organization` model has no sector or industry field. The AI cannot
benchmark against industry standards without knowing what sector the org is in.

**Impact:** Benchmarking (C4) and onboarding suggestions (D1) cannot be sector-specific.

**Fix:**
```prisma
// Add to Organization model:
sector String?  // e.g., "government", "healthcare", "financial_services"
```
Populate via a dropdown during org creation and in the organization settings page.

---

## Prompt Context Design Principles

### Principle 1: Only Include Approved Data
Never include DRAFT values in AI prompt context. The AI must only reason over trusted,
approved data — otherwise it may hallucinate confident-sounding insights from unreliable numbers.

```ts
// context.ts — always filter to approved/locked
const values = await prisma.entityValue.findMany({
  where: {
    entityId: entity.id,
    status: { in: ["APPROVED", "LOCKED"] },  // ← Critical filter
  },
  orderBy: { createdAt: "desc" },
  take: 12,
});
```

### Principle 2: Manage Token Budget Strictly
GPT-4o has a 128k context window, but large contexts are slow and expensive. Keep prompts lean.

**Token budget rules:**
- System prompt: max 1,000 tokens
- Org context: max 2,000 tokens (summarize, don't dump all raw data)
- Recent values: include last 6 periods per KPI, not full history
- User message: max 500 tokens
- Response: max 1,500 tokens for chat, 3,000 for full reports

**Context compression strategy:**
```ts
// Instead of: "KPI 'Customer Satisfaction' had values: 84.2, 81.5, 88.0, 79.3..."
// Send: "CSAT: 6-period avg=82%, last=79%, trend=declining, target=85%, achievement=93%"
```

### Principle 3: Include Locale in Every Prompt
```ts
const locale = session.user.preferences?.locale ?? "ar"; // Default Arabic for Saudi market
// Always pass locale to prompt templates
SYSTEM_PROMPTS.chatAssistant(ctx, locale)
```

### Principle 4: Ground Responses in Data
Instruct the LLM never to invent numbers:

```
RULES:
- Only cite values that appear in the CONTEXT section above.
- If a user asks about data you don't have, say: "I don't have that data available."
- Never estimate or approximate numbers unless explicitly asked to forecast.
- Always name the specific KPI or entity you're referencing.
```

### Principle 5: Role-Scoped Context
A Manager should never see another manager's data in AI responses. The context builder
must apply the same RBAC rules as the rest of the application:

```ts
async function buildOrgAIContext(orgId, userId, role) {
  if (role === "MANAGER") {
    // Only include entities assigned to this user
    const entityIds = await getUserReadableEntityIds(userId, orgId);
    kpis = await prisma.entity.findMany({ where: { id: { in: entityIds } } });
  } else {
    // Admin/Executive: include all org entities
    kpis = await prisma.entity.findMany({ where: { orgId } });
  }
}
```

---

## Data Quality Metrics for AI Readiness

Add these metrics to the Admin dashboard to track org AI-readiness over time:

| Metric | Formula | Good Threshold |
|--------|---------|---------------|
| **Description coverage** | KPIs with description / total KPIs | ≥ 80% |
| **History depth** | KPIs with ≥ 6 approved values | ≥ 60% |
| **Arabic coverage** | KPIs with titleAr set | ≥ 90% |
| **Note quality** | Values with non-empty, >10 char note | ≥ 50% |
| **Freshness** | KPIs with value in last 30 days | ≥ 75% |

**AI Readiness Score** = weighted average of above metrics (0–100%)
Display on Overview page: *"Your org's AI readiness score is 74% — add descriptions to 8 KPIs to reach 80%."*

---

## Embeddings Strategy (Phase 2)

For semantic search and advanced RAG (Retrieval-Augmented Generation), generate embeddings
for each entity when it is created or updated.

### What to Embed
```
Entity embedding = concatenate:
  - title (English)
  - titleAr (Arabic)
  - description
  - unit
  - OrgEntityType name
  - ownerUser name
  - formula (if exists)
```

### Storage
Use `pgvector` extension in the existing PostgreSQL database — no new infrastructure needed.

```sql
ALTER TABLE entities ADD COLUMN embedding vector(1536);
```

### When to Generate
- On entity create: generate and store embedding
- On entity update (title/description changed): regenerate embedding
- Background job: generate embeddings for all existing entities on first deploy

### Use Cases Unlocked by Embeddings
1. **Semantic entity search**: "Find KPIs related to employee satisfaction" — returns relevant KPIs even if the word "satisfaction" doesn't appear in the title
2. **Duplicate detection**: Warn admin when a new KPI is semantically similar to an existing one
3. **RAG for chat**: Instead of including all KPI data in every prompt, retrieve only the top-K most relevant entities based on cosine similarity to the user's question
4. **Strategy alignment**: Detect which KPIs are semantically aligned (or misaligned) with the stated strategic pillars

### RAG Architecture (Phase 2 Chat)
```
User: "How are we doing on customer experience?"
          │
          ▼
Generate embedding for query
          │
          ▼
pgvector similarity search → top 10 most relevant entities
          │
          ▼
Fetch latest approved values for those 10 entities
          │
          ▼
Build focused prompt with only relevant data (~500 tokens vs 3000 for full org)
          │
          ▼
LLM generates grounded response
```

This makes responses faster, cheaper (fewer tokens), and more accurate (less noise in context).
