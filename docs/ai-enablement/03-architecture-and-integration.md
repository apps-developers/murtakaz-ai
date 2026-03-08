# AI Architecture & Integration
## How LLMs Connect to the Rafed KPI Stack

---

## Current Stack

```
Next.js 14 (App Router)
  ├── Server Actions (web/src/actions/)
  ├── Prisma ORM → PostgreSQL
  ├── better-auth (session management)
  └── Vercel / Docker deployment
```

AI integration slots in at the **Server Actions layer** — AI calls happen server-side,
keeping API keys secure and ensuring all data access goes through the existing permission
system (RBAC, org scoping).

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App                               │
│                                                                  │
│  React Components  ──►  Server Actions  ──►  Prisma / PostgreSQL│
│        │                      │                                  │
│        │                      ▼                                  │
│        │              ┌───────────────┐                          │
│        │              │  AI Service   │                          │
│        │              │  Layer        │                          │
│        │              │               │                          │
│        │              │ ┌───────────┐ │                          │
│        │              │ │ Context   │ │                          │
│        │              │ │ Builder   │ │                          │
│        │              │ └─────┬─────┘ │                          │
│        │              │       │       │                          │
│        │              │ ┌─────▼─────┐ │                          │
│        │              │ │  Prompt   │ │                          │
│        │              │ │ Templates │ │                          │
│        │              │ └─────┬─────┘ │                          │
│        │              │       │       │                          │
│        │              │ ┌─────▼─────┐ │                          │
│        │              │ │   LLM     │ │                          │
│        │              │ │  Client   │ │                          │
│        │              │ └───────────┘ │                          │
│        │              └───────────────┘                          │
│        │                      │                                  │
│        ◄──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
  External LLM APIs:
  ├── OpenAI (GPT-4o)
  ├── Anthropic (Claude)
  ├── MBZUAI (Jais — Arabic)
  └── Ollama (self-hosted, optional)
```

---

## New Files & Folders to Create

```
web/src/
├── actions/
│   ├── ai-chat.ts          ← Chat assistant server action
│   ├── ai-generate.ts      ← Generation features (summaries, translations, formulas)
│   ├── ai-alerts.ts        ← Anomaly detection + alert dispatch
│   └── ai-forecast.ts      ← Trend forecasting (Phase 3)
│
├── lib/
│   ├── ai/
│   │   ├── client.ts       ← LLM client factory (OpenAI / Anthropic / Jais)
│   │   ├── context.ts      ← Context builder — assembles org data for prompts
│   │   ├── prompts.ts      ← All prompt templates (one per feature)
│   │   ├── guardrails.ts   ← Output validation, hallucination checks
│   │   └── tokens.ts       ← Token counting, context window management
│   │
│   └── embeddings/
│       ├── embed.ts        ← Generate embeddings for semantic search
│       └── search.ts       ← Vector similarity search over entity store
│
└── components/
    ├── ai-chat/
    │   ├── ChatPanel.tsx   ← Floating chat side panel
    │   ├── ChatMessage.tsx ← Message bubble component
    │   └── ChatInput.tsx   ← Input with send button
    │
    └── ai-assist/
        ├── SummaryButton.tsx       ← "Generate Summary" button
        ├── TranslateButton.tsx     ← "Auto-translate" button
        ├── FormulaAssistant.tsx    ← Formula builder in entity form
        └── AnomalyBanner.tsx       ← Alert banner on entity detail page
```

---

## LLM Client Factory (`web/src/lib/ai/client.ts`)

A single factory that returns the right LLM client based on configuration, allowing
seamless switching between providers.

```ts
// web/src/lib/ai/client.ts
import OpenAI from "openai";

export type LLMProvider = "openai" | "anthropic" | "jais" | "ollama";

export function getLLMClient(provider: LLMProvider = "openai") {
  switch (provider) {
    case "openai":
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    case "anthropic":
      // return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    case "jais":
      // Jais is OpenAI-compatible API
      return new OpenAI({
        apiKey: process.env.JAIS_API_KEY,
        baseURL: "https://api.ai71.ai/v1/",
      });
    case "ollama":
      return new OpenAI({
        apiKey: "ollama",
        baseURL: "http://localhost:11434/v1",
      });
  }
}

export const defaultModel = {
  openai:    "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
  jais:      "jais-30b-chat",
  ollama:    "llama3.1:8b",
};
```

**Required environment variables:**
```env
# .env.local
AI_PROVIDER=openai           # openai | anthropic | jais | ollama
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
JAIS_API_KEY=...             # For Arabic-first deployments
OLLAMA_BASE_URL=http://localhost:11434  # For self-hosted
```

---

## Context Builder (`web/src/lib/ai/context.ts`)

The context builder assembles the right data from the database to include in every
AI prompt. This is critical — the AI is only as good as the context it receives.

```ts
// web/src/lib/ai/context.ts
export interface OrgAIContext {
  org: {
    name: string;
    nameAr: string | null;
    vision: string | null;
    mission: string | null;
  };
  entityTypes: Array<{ code: string; name: string }>;
  kpiSummary: {
    total: number;
    green: number;
    amber: number;
    red: number;
    noData: number;
    overallHealth: number;
  };
  recentValues: Array<{
    entityTitle: string;
    value: number;
    achievement: number | null;
    status: string;
    daysAgo: number;
  }>;
  staleKpis: Array<{ title: string; daysSinceUpdate: number | null }>;
  pendingApprovals: number;
}

export async function buildOrgAIContext(
  orgId: string,
  userId: string,
  role: string
): Promise<OrgAIContext> {
  // Fetch from existing Prisma queries
  // Scope data to user's role (Manager only sees assigned entities)
  // Trim to fit within token budget (~2000 tokens for context)
}
```

**Token budget per feature:**

| Feature | System Prompt | Context | User Input | Max Output | Total |
|---------|-------------|---------|------------|------------|-------|
| Chat Q&A | 800 | 2000 | 200 | 1000 | ~4000 |
| Exec Summary | 600 | 3000 | 100 | 2000 | ~6000 |
| KPI Wizard | 500 | 500 | 300 | 2000 | ~3300 |
| Formula Builder | 400 | 200 | 200 | 500 | ~1300 |
| Auto-translate | 300 | 100 | 300 | 400 | ~1100 |

---

## Prompt Templates (`web/src/lib/ai/prompts.ts`)

All prompts are stored in a central file as TypeScript template functions — not hardcoded
inline strings. This makes them easy to version, test, and improve.

```ts
// web/src/lib/ai/prompts.ts

export const SYSTEM_PROMPTS = {

  chatAssistant: (ctx: OrgAIContext, locale: "ar" | "en") => `
You are an AI performance management analyst for ${ctx.org.name}.
You help users understand their KPI data and strategy execution status.

ORGANIZATION CONTEXT:
- Vision: ${ctx.org.vision ?? "Not specified"}
- Mission: ${ctx.org.mission ?? "Not specified"}
- Entity types: ${ctx.entityTypes.map(e => e.name).join(", ")}

CURRENT PERFORMANCE:
- Overall health: ${ctx.kpiSummary.overallHealth}%
- Green KPIs: ${ctx.kpiSummary.green} | Amber: ${ctx.kpiSummary.amber} | Red: ${ctx.kpiSummary.red}
- Pending approvals: ${ctx.pendingApprovals}

RULES:
- Answer only based on the data provided above. Do not invent numbers.
- If you don't have enough data to answer, say so clearly.
- Respond in ${locale === "ar" ? "Arabic" : "English"}.
- Keep answers concise and actionable.
- Cite specific KPI names when relevant.
`,

  kpiWizard: (objective: string, locale: "ar" | "en") => `
You are a KPI design expert. Generate 5 well-defined KPIs for the following strategic objective.

OBJECTIVE: "${objective}"

For each KPI, provide:
- title (English)
- titleAr (Arabic)
- unit (e.g., %, SAR, days, count)
- direction: "INCREASE_IS_GOOD" or "DECREASE_IS_GOOD"
- periodType: "MONTHLY", "QUARTERLY", or "YEARLY"
- suggestedTarget (number)
- formulaSuggestion (optional, using vars.CODE syntax)
- rationale (1 sentence explaining why this KPI matters)

Return as a JSON array. Follow SMART KPI principles.
`,

  formulaBuilder: (description: string, availableVars: string[]) => `
Convert this description into a formula using Rafed KPI formula syntax.

DESCRIPTION: "${description}"

AVAILABLE VARIABLES: ${availableVars.join(", ")}
CROSS-ENTITY SYNTAX: get("ENTITY_KEY") to reference another entity's latest value
STANDARD OPERATORS: +, -, *, /, (, ), Math.min(), Math.max(), Math.round()

Return ONLY the formula expression. No explanation. No markdown.
`,

  autoTranslate: (content: Record<string, string>, direction: "en-to-ar" | "ar-to-en") => `
Translate the following KPI-related content ${direction === "en-to-ar" ? "from English to Arabic" : "from Arabic to English"}.

Use professional performance management terminology.
For Arabic: use formal Modern Standard Arabic (MSA), not dialect.

CONTENT TO TRANSLATE:
${JSON.stringify(content, null, 2)}

Return the translations as a JSON object with the same keys.
`,

  execSummary: (ctx: OrgAIContext, locale: "ar" | "en") => `
Generate a professional executive performance summary for ${ctx.org.name}.

DATA:
${JSON.stringify(ctx, null, 2)}

FORMAT:
1. Overall health headline (1 sentence)
2. Highlights — what is going well (2–3 bullets)
3. Concerns — what needs attention (2–3 bullets)
4. Urgent actions required (numbered list)
5. Approval status note

Tone: professional, concise, action-oriented.
Language: ${locale === "ar" ? "Arabic" : "English"}.
`,

};
```

---

## Vercel AI SDK Integration (Recommended)

The **Vercel AI SDK** is the recommended orchestration layer because:
- Built for Next.js App Router and Server Actions
- Supports streaming responses (progressive text display)
- Provider-agnostic (works with OpenAI, Anthropic, etc.)
- Native TypeScript support

```bash
npm install ai @ai-sdk/openai
```

**Streaming chat server action:**
```ts
// web/src/actions/ai-chat.ts
"use server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { requireOrgMember } from "@/lib/server-action-auth";
import { buildOrgAIContext } from "@/lib/ai/context";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";

export async function streamChatResponse(userMessage: string) {
  const session = await requireOrgMember();
  const ctx = await buildOrgAIContext(
    session.user.orgId,
    session.user.id,
    session.user.role,
  );
  const locale = session.user.locale ?? "en";

  const result = await streamText({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPTS.chatAssistant(ctx, locale as "ar" | "en"),
    prompt: userMessage,
    maxTokens: 1000,
  });

  return result.toDataStreamResponse();
}
```

---

## Database Schema Additions

### AI Audit Log

Every AI interaction should be logged for governance and debugging:

```prisma
model AiInteraction {
  id        String   @id @default(uuid())
  orgId     String   @map("org_id")
  userId    String   @map("user_id")

  feature   String   // "chat" | "summary" | "kpi_wizard" | "translate" | "formula"
  prompt    String   // The user input (not the system prompt)
  response  String   // The AI output
  model     String   // e.g., "gpt-4o"
  tokensIn  Int?     @map("tokens_in")
  tokensOut Int?     @map("tokens_out")
  latencyMs Int?     @map("latency_ms")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([orgId, userId])
  @@index([feature])
  @@map("ai_interactions")
}
```

This enables:
- Cost tracking per org (tokensIn + tokensOut → API cost)
- Latency monitoring
- Audit trail for compliance
- Fine-tuning data collection

### pgvector for Semantic Search (Phase 2)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to entities table
ALTER TABLE entities ADD COLUMN embedding vector(1536);

-- Index for fast similarity search
CREATE INDEX ON entities USING ivfflat (embedding vector_cosine_ops);
```

This enables finding semantically similar KPIs, entities, and historical values — used
in the AI chat context retrieval and the strategy alignment scoring feature.

---

## Security Architecture

```
User Request
    │
    ▼
Session Check (better-auth)
    │
    ▼
RBAC Enforcement (requireOrgMember / requireOrgAdmin)
    │
    ▼
Org Scope Filter (all DB queries include orgId)
    │
    ▼
Context Builder (builds prompt from scoped data only)
    │
    ▼ No raw PII in prompts (no passwords, emails, session tokens)
LLM API Call (server-side only — API key never in browser)
    │
    ▼
Guardrails Check (output validation)
    │
    ▼
AI Interaction Log (audit trail)
    │
    ▼
Response to User
```

**Key security rules:**
- API keys are server-side only (never in client bundle)
- Prompts never include raw passwords, session tokens, or full email addresses
- AI cannot write to the database directly — only Server Actions can
- All AI responses are treated as suggestions; user must confirm before any data changes
- AI interaction log is immutable (no delete)
