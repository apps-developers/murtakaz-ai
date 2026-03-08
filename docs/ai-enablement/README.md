# AI Enablement — Rafed KPI

This folder contains the complete documentation for transforming Rafed KPI from a
governed data-entry and reporting platform into an **AI-powered strategy execution
intelligence system** using Large Language Models (LLMs) and supporting AI techniques.

---

## Why AI for a KPI Platform?

Rafed KPI already collects structured, governed, bilingual performance data across
organizations. This is exactly the kind of high-quality, domain-specific data that
makes LLM integration powerful and immediately valuable — the AI has real, trusted
context to reason over rather than generic internet knowledge.

The goal is not to replace human judgment, but to:
- Surface insights faster than any human can read through a dashboard
- Generate the first draft of analyses and reports that leaders currently spend hours writing
- Alert decision-makers to risks before they appear in red on a chart
- Help non-technical users interact with their own data naturally, in Arabic or English

---

## Document Index

| # | Document | What It Covers |
|---|----------|---------------|
| [01](./01-vision-and-use-cases.md) | Vision & AI Use Cases | The "why" — what problems AI solves, user stories by role |
| [02](./02-feature-catalogue.md) | AI Feature Catalogue | Full list of proposed features with priority and complexity |
| [03](./03-architecture-and-integration.md) | Architecture & Integration | How AI connects to the existing Next.js / Prisma stack |
| [04](./04-data-readiness.md) | Data Readiness | What data we have, what needs enriching, prompt context design |
| [05](./05-implementation-roadmap.md) | Implementation Roadmap | Phased plan — from first prototype to full AI platform |
| [06](./06-risks-and-guardrails.md) | Risks & Guardrails | Hallucination, privacy, bias, governance, and mitigations |

---

## Quick Summary: Proposed AI Feature Tiers

### Tier 1 — Conversational Intelligence (Months 1–3)
> Chat with your KPI data in plain Arabic or English

- **AI Strategy Analyst** — natural language Q&A over org performance data
- **Auto-generated Executive Summary** — one-click narrative report from dashboard data
- **Smart Anomaly Alerts** — proactive "something unusual happened" notifications

### Tier 2 — Generative Assistance (Months 3–6)
> AI helps users do their jobs faster

- **KPI Definition Wizard** — AI suggests KPIs based on strategic pillars
- **Formula Builder Assistant** — describe the metric in words, AI writes the formula
- **Rejection Comment Generator** — structured feedback when approver rejects a value
- **Arabic/English Auto-translation** — AI fills `titleAr`/`descriptionAr` fields

### Tier 3 — Predictive Intelligence (Months 6–12)
> AI predicts what will happen before it does

- **KPI Trend Forecasting** — predict next quarter's value from historical trend
- **At-Risk Early Warning** — flag KPIs likely to go RED before the period closes
- **Strategy Alignment Scoring** — detect KPIs that are not contributing to any pillar

### Tier 4 — Autonomous Agents (Future)
> AI takes actions on behalf of users

- **Automated Period Reports** — send stakeholder briefings with no human authoring
- **Correction Suggestions** — AI recommends target adjustments based on benchmarks
- **Cross-org Benchmarking** — compare performance against anonymized peer orgs

---

## Recommended LLM Stack

| Component | Recommended Option | Alternative |
|-----------|-------------------|-------------|
| Primary LLM | OpenAI GPT-4o | Anthropic Claude 3.5 Sonnet |
| Arabic-first LLM | Jais (MBZUAI) | Allam (SDAIA / Saudi) |
| Embeddings | OpenAI `text-embedding-3-small` | Cohere Embed v3 |
| Vector DB | Postgres + `pgvector` (already in stack) | Pinecone |
| Orchestration | Vercel AI SDK (fits Next.js) | LangChain.js |
| Self-hosted option | Ollama + Llama 3.1 | vLLM |
