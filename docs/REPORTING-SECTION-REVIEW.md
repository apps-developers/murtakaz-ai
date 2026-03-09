# Reporting Section — Code & UX Review

**Date:** 2026-03-09  
**Scope:** All reporting surfaces in `web/src/` — Overview page, Dashboards page, 7 sub-dashboards, AI Generate Report modal, chart components, and data layer (`actions/insights.ts`).

---

## 1. Surface Inventory

| Surface | Route | Data Source | Status |
|---|---|---|---|
| Executive Overview | `/overview` | `getOverviewInsights()` (live DB) | ✅ Live |
| Performance Dashboard | `/dashboards` | `getDashboardInsights()` (live DB) | ✅ Live |
| CEO / Executive Dashboard | `/dashboards/executive` | `getExecutiveDashboardInsights()` (live DB) | ✅ Live |
| KPI Performance Dashboard | `/dashboards/kpi-performance` | `lib/mock-data.ts` + `lib/dashboard-metrics.ts` | ❌ Mock only |
| Initiative Health Dashboard | `/dashboards/initiative-health` | `lib/mock-data.ts` + `lib/dashboard-metrics.ts` | ❌ Mock only |
| Project Execution Dashboard | `/dashboards/project-execution` | `lib/mock-data.ts` | ❌ Mock only |
| Manager / Department Dashboard | `/dashboards/manager` | `lib/mock-data.ts` + `lib/dashboard-metrics.ts` | ❌ Mock only |
| Risk & Escalation Dashboard | `/dashboards/risk-escalation` | `lib/mock-data.ts` + `lib/dashboard-metrics.ts` | ❌ Mock only |
| Strategy Change & Governance Dashboard | `/dashboards/governance` | `lib/mock-data.ts` + `lib/dashboard-metrics.ts` | ❌ Mock only |
| AI Generate Report Modal | Modal on `/overview` + `/dashboards` | `/api/ai/summary` (OpenAI streaming) | ✅ Live (feature-flagged) |

**5 of 8 dashboard sub-pages are still driven entirely by static mock data** (`lib/seed-adapter.ts` → `lib/mock-data.ts`). They will show the same fixture data regardless of tenant/org.

---

## 2. Critical Issues

### 2.1 Mock Data Leak in Sub-Dashboards — **HIGH SEVERITY**
`kpi-performance`, `initiative-health`, `project-execution`, `manager`, `risk-escalation`, and `governance` all import directly from `@/lib/mock-data` and `@/lib/dashboard-metrics`.

```
// e.g. kpi-performance/page.tsx:10-11
import { kpiVarianceTop } from "@/lib/dashboard-metrics";
import { kpis } from "@/lib/mock-data";
```

`dashboard-metrics.ts` is entirely hardcoded:
```ts
// lib/dashboard-metrics.ts:1
export const executiveTrend = [62, 64, 63, 66, 69, 67, 70, 72, 73, 74, 76, 75];
export const kpiVarianceTop = {
  categories: ["Revenue", "CSAT", "Cloud", "Cycle time", "Cost"],
  values: [-2.6, -3.0, -13.0, -1.2, 4.5],
};
```

These are English-only and completely disconnected from real org data. **They must not be in production.**

### 2.2 AI Report Has No Data Context — **HIGH SEVERITY**
`/api/ai/summary` sends a generic prompt with zero actual KPI data injected:

```ts
// app/api/ai/summary/route.ts:31-37
const userPrompt =
  reportType === "full"
    ? "Write a full board report covering overall performance, key KPIs, challenges, and recommendations."
    : "Write a concise weekly digest highlighting key KPI highlights and required actions.";
```

The AI generates a **hallucinated report** — it has no visibility into the org's actual KPI values, statuses, or achievement rates. The disclaimer at the bottom of the modal (`aiReportDisclaimer`) partially covers this, but users may not notice it.

### 2.3 Period Selector Is Non-Functional — **MEDIUM SEVERITY**
The "Period" select in `AiGenerateSummaryModal` has only one non-interactive option and its value is never sent to the API:

```tsx
// ai-generate-summary-modal.tsx:132-140
<Select defaultValue="current">
  <SelectTrigger className="bg-card">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="current">{t("aiReportPeriodCurrent")}</SelectItem>
  </SelectContent>
</Select>
```

Note the use of `defaultValue` (uncontrolled) instead of `value`/`onValueChange`, and the value is never included in the `fetch` body.

### 2.4 `computeAchievement` Duplicated Three Times — **MEDIUM SEVERITY**
The exact same function body exists independently in `getOverviewInsights`, `getDashboardInsights`, and `getExecutiveDashboardInsights` inside `actions/insights.ts`. A bug fix in one won't propagate to the others. The file-level helper at line 11 is already extracted — but it is not the one being used (it is the correct one, the issue is that the local calls correctly use it, but the function is file-scoped rather than shared across actions files — any future action file will duplicate it again).

### 2.5 N+1 Query Pattern for Quarterly/Monthly Trends — **MEDIUM SEVERITY**
`getOverviewInsights` and `getDashboardInsights` fire sequential individual Prisma queries per time-bucket in `Promise.all` mapping:

```ts
// insights.ts:253-266
const quarterValues = await Promise.all(
  quarters.map(async (q) => {
    const agg = await prisma.entityValue.aggregate({ ... });  // 4 separate DB round-trips
  }),
);
```

And similarly for 6 monthly buckets and 12 monthly trend buckets in the executive dashboard. This is 4 + 6 + 12 = 22 individual DB round-trips per page load across three actions. These should be replaced with a single `GROUP BY` query.

---

## 3. UX / Design Issues

### 3.1 Dashboard Hub Has No Navigation to Sub-Dashboards from Its Own Page
`/dashboards/page.tsx` renders charts and a "Quick Actions" section — but provides no links or cards pointing to the 8 sub-dashboard routes. Users must know the sub-dashboard URLs manually. The only access point is the top-level nav sidebar (if it lists them).

### 3.2 `kpi-performance` Links to `/kpis/:id` — Dead Route
```tsx
// kpi-performance/page.tsx:57
href={`/${locale}/kpis/${kpi.id}`}
```
The app's live KPI entity route is `/entities/kpi/[entityId]`. The `/kpis/` route directory is nearly empty (`kpis/page.tsx` is 231 bytes and likely just redirects). All internal links in the mock sub-dashboards should target `/entities/kpi/[id]`.

### 3.3 `governance` and `manager` Dashboards Link to `/approvals/:id` — Unverified
```tsx
// governance/page.tsx:77
href={`/${locale}/approvals/${cr.id}`}
```
This implies a detail page at `/approvals/[id]` — it should be verified that this route exists, otherwise it will 404. The approvals list page at `/approvals` exists but a detail view was not found in the directory listing.

### 3.4 AI Report Output Uses Monospace Font — Unfriendly for Sharing
The rendered report stream is displayed in a `font-mono whitespace-pre-wrap` container. While readable for debugging, it is inappropriate for an executive report. The output should use a readable prose font.

```tsx
// ai-generate-summary-modal.tsx:166-169
className={cn(
  "max-h-[380px] overflow-y-auto rounded-xl border ...",
  "text-sm leading-relaxed whitespace-pre-wrap font-mono",
)}
```

### 3.5 Copy-Only Export — No Download or Print
The AI report modal only offers a clipboard copy. There is no PDF export, print view, or download-as-file option. For an executive report this is a significant omission.

### 3.6 `AreaLine` x-Axis Labels Overlap on Small Screens
`AreaLine` and `Bar` in `dashboard-charts.tsx` set `axisLabel: { interval: 0 }` which forces all labels to render even when they overlap:

```ts
// dashboard-charts.tsx:113
axisLabel: { ...base.axisLabel, interval: 0 }
```

On mobile or in narrow cards (e.g. the quarterly trend on overview), month/quarter labels will stack or overlap. This should use `interval: "auto"` or be paired with label rotation.

### 3.7 `SparkLine` Ignores Passed `color` for Area Gradient
The `SparkLine` area gradient is hardcoded to `rgba(96,165,250,...)` regardless of the `color` prop:

```ts
// dashboard-charts.tsx:48-50
{ offset: 0, color: isDark ? "rgba(96,165,250,0.26)" : "rgba(59,130,246,0.18)" },
```

This means the emerald-coloured sparkline on the "Monthly Activity" card (passed `color="#10b981"`) has a blue area fill, creating a colour inconsistency.

### 3.8 Stale KPI Progress Bar in Overview "Needs Attention" Section
The progress bar visualisation for stale KPIs uses an inverted formula that is semantically backwards:

```tsx
// overview/page.tsx:408
<Progress value={Math.max(0, 100 - (kpi.daysSinceLastUpdate ?? 100))} className="h-2" />
```

A KPI last updated 90 days ago renders at 10% fill, but a KPI at 1 day renders at 99% — which looks healthy. This section is meant to highlight staleness, so the higher the days, the more "urgent" the visual should be (fuller bar or a different metaphor like an "aging" bar).

### 3.9 `teamPerformance` Card Uses Wrong Label
```tsx
// overview/page.tsx:430
<p className="text-xs text-muted-foreground">{t("assignedToYou")}</p>
```
This card actually shows **top KPI owners by entity count** across the whole org, but labels each row "Assigned to you" — which is incorrect when viewed by anyone other than the specific owner.

### 3.10 `overallHealth` Metric Uses Achievement Average, Not RAG
The `overallHealth` field in both insights actions is calculated as the straight average of `achievementValue` across all KPIs. This ignores weighting, KPI direction, and the configured RAG thresholds (`lib/rag.ts`). The displayed "Performance Score" card on `/dashboards` and "Coverage Snapshot" on `/overview` can therefore show a healthy-looking number even when many KPIs are RED.

---

## 4. Code Quality Issues

### 4.1 `any` Type Annotations in Live Data Path
Multiple uses of `any` in the live-data overview page suppress type safety:

```tsx
// overview/page.tsx:64-66
const types = data?.topTypes ?? [];
return {
  categories: types.map((x: any) => df(x.name, x.nameAr)),
```

And the recent activity map:
```tsx
// overview/page.tsx:331
data?.recentActivities?.map((activity: any) => {
```

`getOverviewInsights` returns a fully typed object — these `any` casts should be removed.

### 4.2 Hardcoded `target: 100` in Executive Dashboard
```ts
// insights.ts:537
target: 100,
```
The executive dashboard top-KPIs always show "Target 100%" regardless of the actual configured `targetValue`. This is a copy-paste artifact from the achievement percentage calculation — the display should show the actual target value and unit.

### 4.3 `clamp` Utility Duplicated Across Files
`clamp(value, min, max)` is defined separately in:
- `app/[locale]/dashboards/page.tsx:18`
- `actions/insights.ts:7`

Should be extracted to `lib/utils.ts`.

### 4.4 `useEffect` + Server Action Anti-Pattern
Both `DashboardsPage` and `OverviewPage` call server actions (`getDashboardInsights`, `getOverviewInsights`) from inside a `useEffect` in a `"use client"` component. This correctly works but bypasses Next.js data-fetching optimizations (no streaming, no caching, no `loading.tsx` support). These pages should be converted to RSC (React Server Components) or use `React.use()` with a `Suspense` boundary for proper loading UX.

---

## 5. Missing Features

| Feature | Impact |
|---|---|
| **Date range / period filter** on dashboards | High — all charts always show fixed historical windows |
| **Per-pillar / per-department filter** on overview | High — no drill-down from aggregate to segment |
| **Export to PDF / Excel** for reports | High — executives need shareable artefacts |
| **Trend direction indicator** on KPI metric cards | Medium — no delta vs previous period shown |
| **AI report with real data context** (RAG-based) | Medium — current output is hallucinated |
| **Pillar sub-dashboard** | Medium — defined in `lib/dashboards.ts` but no page exists at `/dashboards/pillar` |
| **Auto-refresh / polling** on live dashboards | Low — stale data between page loads |

---

## 6. Prioritised Action Plan

### P1 — Must Fix Before Production

1. **Remove mock data from sub-dashboards** — Wire `kpi-performance`, `initiative-health`, `project-execution`, `manager`, `risk-escalation`, and `governance` to new server actions backed by Prisma. Add a new `getSubDashboardInsights()` family of actions to `insights.ts`.

2. **Inject real KPI context into AI report** — Before calling the LLM, fetch the top-N KPIs (achievement %, status, unit) from the DB and serialize them into the prompt. Leverage the existing `getKpisWithLatestValue()` helper already in `insights.ts`.

3. **Fix dead `/kpis/:id` links** in `kpi-performance` page — Change to `/entities/kpi/:id`.

### P2 — High Priority UX

4. **Add sub-dashboard navigation cards** to `/dashboards/page.tsx` — Users should be able to discover and navigate to the 8 sub-dashboards from the hub page.

5. **Fix `SparkLine` area gradient** to use the passed `color` prop dynamically.

6. **Fix axis label overlap** — Change `interval: 0` to `interval: "auto"` and add `rotate: -30` for monthly charts.

7. **Fix stale KPI progress bar semantics** in `attentionKpis` section (invert or replace with a "staleness" indicator).

8. **Fix "Assigned to you" label** in Team Performance card to show "KPIs owned".

### P3 — Quality & Performance

9. **Batch time-bucket queries** — Replace per-bucket `prisma.aggregate` calls with a single raw SQL `GROUP BY date_trunc(...)` query.

10. **Remove `any` casts** in `overview/page.tsx`.

11. **Extract `clamp`** to `lib/utils.ts`.

12. **Fix period selector** in AI modal — make it controlled, add Q1/Q2/Q3/Q4 options, and include the value in the API request body.

13. **Convert reporting pages to RSC** with `Suspense` for proper streaming loading states.

14. **Change AI report output** from `font-mono` to `font-sans prose` styling.

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Live data coverage | 3/8 dashboards | 5 sub-dashboards are mock-only |
| AI report quality | Low | No real data context injected |
| Chart rendering | Good | ECharts integration is solid; minor color/label bugs |
| Data layer | Good | `insights.ts` is well-structured; N+1 issue present |
| Type safety | Fair | `any` in UI layer; server actions are typed |
| Navigation / discoverability | Fair | No sub-dashboard index on hub page |
| Export / sharing | Poor | Copy-only; no PDF/Excel |
| Mobile responsiveness | Fair | Axis label overlap on small screens |
