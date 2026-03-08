# Gap Analysis & Implementation Plan
## Theory Coverage vs. Current Codebase

**Date:** 2026-03-05  
**Scope:** Gaps identified by comparing `docs/user-docs/theory/en/` (5 files) against the live codebase.  
**Overall Coverage:** ~85% — core architecture is solid; 4 gaps require targeted fixes.

---

## Gap Summary

| # | Gap | Severity | Effort | Priority |
|---|-----|----------|--------|----------|
| [GAP-1](#gap-1--direction-aware-achievement-calculation) | Direction-aware achievement (`DECREASE_IS_GOOD` inverted) | 🔴 High | Small (1 function) | P1 |
| [GAP-2](#gap-2--weighted-pillar--objective-health-rollup) | Weighted pillar/objective health rollup engine | 🟠 Medium | Medium (new query + UI) | P2 |
| [GAP-3](#gap-3--period-based-compliance-scoring) | Period-based compliance scoring | 🟡 Medium | Medium (new logic layer) | P3 |
| [GAP-4](#gap-4--approval-queue-notifications) | Approval queue notifications | 🟡 Medium | Large (infra required) | P4 |

Additional minor gaps:
- [GAP-5](#gap-5--leading-vs-lagging-kpi-classification) — Leading vs. lagging KPI field
- [GAP-6](#gap-6--value-range-validation) — Value range validation (min/max bounds)
- [GAP-7](#gap-7--configurable-rag-thresholds) — Configurable RAG thresholds per org

---

---

## GAP-1 — Direction-Aware Achievement Calculation

### Problem
The `computeAchievement()` function in `web/src/actions/insights.ts` always divides
`(actualValue / targetValue) × 100`. This is correct for `INCREASE_IS_GOOD` KPIs but
**wrong for `DECREASE_IS_GOOD` KPIs** (e.g., error rate, cost, staff turnover).

For a cost KPI with target=100 and actual=80 (under budget — excellent performance), the
current code returns 80% (amber). The correct formula should return 125% → capped to 100%
(green). This means every cost/error/turnover KPI shows a **falsely low health score**.

### Theoretical Basis
From `theory/en/05-organizational-health-and-rag-scoring.md`:
```
For DECREASE_IS_GOOD:
  Achievement % = (Target Value ÷ Actual Value) × 100
  Capped at 100%
```

### Current Code (broken)
**File:** `web/src/actions/insights.ts` — `computeAchievement()` function
```ts
// Current — always divides actual/target regardless of direction
return clamp((raw / input.targetValue) * 100, 0, 100);
```

### Fix Required

**1. Update `computeAchievement()` to accept `direction`:**

```ts
// web/src/actions/insights.ts
function computeAchievement(input: {
  achievementValue?: number | null;
  finalValue?: number | null;
  calculatedValue?: number | null;
  actualValue?: number | null;
  targetValue?: number | null;
  direction?: string | null;          // ADD THIS
}) {
  // ... existing pre-check for stored achievementValue ...

  // Direction-aware formula:
  if (input.direction === "DECREASE_IS_GOOD") {
    return clamp((input.targetValue / raw) * 100, 0, 100);
  }
  return clamp((raw / input.targetValue) * 100, 0, 100);
}
```

**2. Pass `direction` from every call site:**

All callers of `computeAchievement()` must pass the entity's `direction` field:
- `getOverviewInsights()` — needs `direction` added to `getKpisWithLatestValue()` select
- `getDashboardInsights()` — same
- `getExecutiveDashboardInsights()` — same

**3. Update `getKpisWithLatestValue()` select:**

```ts
select: {
  id: true,
  title: true,
  titleAr: true,
  unit: true,
  unitAr: true,
  targetValue: true,
  direction: true,          // ADD THIS
  ownerUser: { select: { id: true, name: true } },
  values: { ... },
}
```

**4. Store direction-corrected `achievementValue` on save:**

When `saveOrgEntityKpiValuesDraft()` creates an `EntityValue`, it should compute and
store `achievementValue` using direction at that point — so it never has to be re-derived:

```ts
// web/src/actions/entities.ts — after calculatedValue is known
const targetValue = entity.targetValue;
const direction = entity.direction;
let achievementValue: number | null = null;
if (calculatedValue !== null && targetValue !== null && targetValue !== 0) {
  if (direction === "DECREASE_IS_GOOD") {
    achievementValue = Math.max(0, Math.min(100, (targetValue / calculatedValue) * 100));
  } else {
    achievementValue = Math.max(0, Math.min(100, (calculatedValue / targetValue) * 100));
  }
}
// Then pass achievementValue to prisma.entityValue.create(...)
```

### Files to Change
- `web/src/actions/insights.ts` — `computeAchievement()` + all callers
- `web/src/actions/entities.ts` — `saveOrgEntityKpiValuesDraft()` to store `achievementValue`

### Tests / Verification
After fix, create a KPI with direction=`DECREASE_IS_GOOD`, target=100, actual=80.
Expected achievement: **100%** (green). Before fix it returns 80% (amber).

---

---

## GAP-2 — Weighted Pillar / Objective Health Rollup

### Problem
`entity.weight` is stored on every entity but **no engine reads it** to compute a parent
entity's health as the weighted average of its children. The Dashboards page shows
individual KPI achievement but no pillar-level or objective-level rolled-up health score.

### Theoretical Basis
From `theory/en/05-organizational-health-and-rag-scoring.md`:
```
Pillar Health = Σ (child_weight × child_health) / Σ child_weights
Organization Health = Weighted Average of all Entity Health Scores
```

### Implementation Plan

**Step 1 — Define parent-child linkage**

Currently entities have no explicit parent-child relationship in the schema. Two options:

| Option | Description | Tradeoff |
|--------|-------------|----------|
| **A — Formula-based (uses existing `get()` syntax)** | Parent entity has a formula like `get("KPI-01") * 0.4 + get("KPI-02") * 0.6`. No schema change needed. | Manual, no auto weight management |
| **B — Explicit parent field (schema change)** | Add `parentEntityId String?` to `Entity` model. Weight rollup computed automatically. | Schema migration required |

**Recommended: Option B** (explicit parent) — more robust and enables hierarchy tree UI.

**Step 2 — Schema migration**

```prisma
// prisma/schema.prisma — add to Entity model
parentEntityId String? @map("parent_entity_id")
parentEntity   Entity? @relation("EntityHierarchy", fields: [parentEntityId], references: [id], onDelete: SetNull)
childEntities  Entity[] @relation("EntityHierarchy")
```

**Step 3 — New server action: `computeEntityHealthTree()`**

```ts
// web/src/actions/insights.ts
export async function computeEntityHealthTree(orgId: string) {
  // 1. Load all entities with their latest approved value + weight + direction
  // 2. For leaf entities (no children): health = achievementValue
  // 3. For parent entities: health = Σ(child.weight × child.health) / Σ(child.weight)
  //    Fall back to simple average if weights are null/zero
  // 4. Apply RAG thresholds: ≥75 → GREEN, 50-74 → AMBER, <50 → RED
  // 5. Return tree structure with health + RAG color per node
}
```

**Step 4 — New dashboard section: "Strategy Health Tree"**

Add a collapsible tree view to `web/src/app/[locale]/dashboards/page.tsx`:
- Shows Pillar → Objective → KPI hierarchy
- Each node shows name, health %, RAG badge
- Drill-down on click to entity detail page

### Files to Change
- `prisma/schema.prisma` — add `parentEntityId` to `Entity`
- New migration in `prisma/migrations/`
- `web/src/actions/insights.ts` — `computeEntityHealthTree()`
- `web/src/actions/entities.ts` — expose `parentEntityId` in create/update/get
- `web/src/app/[locale]/entities/[entityTypeCode]/new/page.tsx` — parent selector
- `web/src/app/[locale]/dashboards/page.tsx` — health tree component

---

---

## GAP-3 — Period-Based Compliance Scoring

### Problem
The system tracks data freshness (days since last value) but does **not check whether a
KPI was submitted and approved within its configured measurement period**. A KPI with
`periodType = MONTHLY` should show as non-compliant if the current month has no
APPROVED/LOCKED value — regardless of when the last value was entered.

### Theoretical Basis
From `theory/en/05-organizational-health-and-rag-scoring.md`:
```
Compliance Signal:
  LOCKED / APPROVED value exists for current period → ✅ Compliant
  SUBMITTED but not yet approved                    → ⏳ Pending
  DRAFT only                                        → ⚠️ Not submitted
  No entry at all                                   → ❌ Missing
```

### Implementation Plan

**Step 1 — Add period timestamps to `EntityValue`**

Store which period a value belongs to explicitly:

```prisma
// prisma/schema.prisma — add to EntityValue model
periodStart DateTime? @map("period_start")
periodEnd   DateTime? @map("period_end")
```

This enables exact period-based queries: "does an APPROVED value exist for Feb 2026?"

**Step 2 — Compute period boundaries on value save**

```ts
// web/src/actions/entities.ts — saveOrgEntityKpiValuesDraft()
function getCurrentPeriodBounds(periodType: KpiPeriodType | null): { start: Date; end: Date } | null {
  const now = new Date();
  if (periodType === "MONTHLY") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }
  if (periodType === "QUARTERLY") { /* ... */ }
  if (periodType === "YEARLY")    { /* ... */ }
  return null;
}
// Pass periodStart/periodEnd into prisma.entityValue.create(...)
```

**Step 3 — New compliance query**

```ts
// web/src/actions/insights.ts
export async function getComplianceSnapshot(orgId: string) {
  const now = new Date();
  const kpis = await prisma.entity.findMany({ where: { orgId, deletedAt: null, periodType: { not: null } } });

  const results = await Promise.all(kpis.map(async (kpi) => {
    const { start, end } = getCurrentPeriodBounds(kpi.periodType);
    const periodValue = await prisma.entityValue.findFirst({
      where: {
        entityId: kpi.id,
        periodStart: { gte: start },
        periodEnd:   { lte: end },
      },
      orderBy: { createdAt: "desc" },
    });

    const status = !periodValue           ? "MISSING"
                 : periodValue.status === "APPROVED" || periodValue.status === "LOCKED" ? "COMPLIANT"
                 : periodValue.status === "SUBMITTED" ? "PENDING"
                 : "NOT_SUBMITTED";

    return { id: kpi.id, title: kpi.title, titleAr: kpi.titleAr, status };
  }));

  return results;
}
```

**Step 4 — Surface compliance on Overview page**

Add a "Compliance This Period" section alongside the existing Freshness chart:
- Count: ✅ Compliant / ⏳ Pending / ⚠️ Not Submitted / ❌ Missing
- List of non-compliant KPIs by name

### Files to Change
- `prisma/schema.prisma` — `periodStart`, `periodEnd` on `EntityValue`
- New migration in `prisma/migrations/`
- `web/src/actions/entities.ts` — populate period bounds on value save
- `web/src/actions/insights.ts` — `getComplianceSnapshot()`
- `web/src/app/[locale]/overview/page.tsx` — compliance section

---

---

## GAP-4 — Approval Queue Notifications

### Problem
Approvers have no mechanism to be notified when values enter their approval queue. The
schema has `UserPreference.notifications Json?` as a placeholder but no dispatch system
exists. The practical result: approval queues grow stale because approvers only see
pending items when they manually navigate to the Approvals page.

### Theoretical Basis
From `theory/en/04-governance-and-approvals.md`:
> "Approval queue grows stale — Approvers don't know items are waiting.
> Fix: Set up notifications; create SLA for approval turnaround."

### Implementation Plan

**Option A — In-app notification badge (lighter lift, no email infra)**

This is the recommended first step:

**Step 1 — New `Notification` model**

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orgId     String   @map("org_id")

  type      String   // "APPROVAL_PENDING" | "VALUE_REJECTED" | "VALUE_APPROVED"
  entityId  String?  @map("entity_id")
  entityValueId String? @map("entity_value_id")
  message   String
  messageAr String?  @map("message_ar")
  readAt    DateTime? @map("read_at")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId, readAt])
  @@index([orgId])
  @@map("notifications")
}
```

**Step 2 — Dispatch notification on value submission**

```ts
// web/src/actions/approvals.ts — after SUBMITTED status is set
// Find all users whose role rank >= required approval level in the same org
// Create a Notification record for each of them
await prisma.notification.createMany({
  data: approvers.map((approver) => ({
    userId: approver.id,
    orgId: session.user.orgId,
    type: "APPROVAL_PENDING",
    entityId: entity.id,
    entityValueId: entityValue.id,
    message: `A KPI value for "${entity.title}" is pending your approval.`,
    messageAr: `قيمة مؤشر أداء "${entity.titleAr ?? entity.title}" بانتظار اعتمادك.`,
  })),
});
```

**Step 3 — Dispatch notification on approval / rejection**

```ts
// After APPROVED or REJECTED — notify the person who submitted
await prisma.notification.create({
  data: {
    userId: submittedByUserId,
    orgId: session.user.orgId,
    type: approved ? "VALUE_APPROVED" : "VALUE_REJECTED",
    entityId: entity.id,
    entityValueId: entityValue.id,
    message: approved
      ? `Your KPI value for "${entity.title}" was approved.`
      : `Your KPI value for "${entity.title}" was rejected. Please review and resubmit.`,
  },
});
```

**Step 4 — New server action `getMyNotifications()`**

```ts
export async function getMyNotifications() {
  const session = await requireOrgMember();
  return prisma.notification.findMany({
    where: { userId: session.user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
```

**Step 5 — Notification bell in top navigation**

Add a bell icon with unread count badge to the top nav bar. Clicking opens a dropdown
listing pending notifications with links to relevant entity pages. Mark all as read on open.

**Option B — Email notifications (future phase)**

Requires an email service (Resend / SendGrid). Architecture:
1. On `SUBMITTED` — send email to all approvers in org
2. On `APPROVED`/`REJECTED` — send email to submitter
3. Use `UserPreference.notifications` JSON to store opt-in/opt-out per type

### Files to Change (Option A — In-app)
- `prisma/schema.prisma` — `Notification` model
- New migration in `prisma/migrations/`
- `web/src/actions/approvals.ts` — dispatch on submit/approve/reject
- New `web/src/actions/notifications.ts` — `getMyNotifications()`, `markNotificationsRead()`
- `web/src/components/layout/` — notification bell component in nav
- `web/src/app/[locale]/layout.tsx` — wire up notification count

---

---

## GAP-5 — Leading vs. Lagging KPI Classification

### Problem
No field exists to classify a KPI as `LEADING` (predictive) or `LAGGING` (outcome). This
is a standard distinction in performance management and useful for filtering dashboards.

### Implementation Plan

**Step 1 — Add enum + field (tiny schema change)**

```prisma
enum KpiIndicatorType {
  LEADING
  LAGGING
}

// Entity model — add:
indicatorType KpiIndicatorType? @map("indicator_type")
```

**Step 2 — Add to entity create/edit forms**

Optional dropdown: "Indicator Type — Leading / Lagging / (not set)".

**Step 3 — Filter in Dashboards page**

Allow filtering KPI list by indicator type to see only leading or only lagging KPIs.

### Files to Change
- `prisma/schema.prisma`
- New migration
- `web/src/actions/entities.ts` — add to create/update schemas
- `web/src/app/[locale]/entities/[entityTypeCode]/new/page.tsx`
- `web/src/app/[locale]/entities/[entityTypeCode]/edit/page.tsx`
- `web/src/app/[locale]/dashboards/page.tsx` — filter option

---

---

## GAP-6 — Value Range Validation

### Problem
No min/max bounds exist on entity values. A manager could enter a value of 99999% or -500
with no validation. The theory lists "Validity — values fall within expected ranges" as a
data quality dimension.

### Implementation Plan

**Step 1 — Add min/max fields to `Entity`**

```prisma
// Entity model — add:
minValue Float? @map("min_value")
maxValue Float? @map("max_value")
```

**Step 2 — Validate on `saveOrgEntityKpiValuesDraft()`**

```ts
if (entity.minValue !== null && calculatedValue < entity.minValue) {
  return { success: false, error: "valueBelowMinimum" };
}
if (entity.maxValue !== null && calculatedValue > entity.maxValue) {
  return { success: false, error: "valueAboveMaximum" };
}
```

**Step 3 — Show bounds in value entry UI**

Display min/max as helper text in the value input field.

### Files to Change
- `prisma/schema.prisma`
- New migration
- `web/src/actions/entities.ts` — create/update/validate
- Entity create/edit/detail pages

---

---

## GAP-7 — Configurable RAG Thresholds Per Organization

### Problem
RAG thresholds are hardcoded in the dashboard component:
`≥85% → green, ≥70% → blue, <70% → amber`. The theory specifies `≥75% → green,
50–74% → amber, <50% → red` and implies these should be org-configurable.

There is also an inconsistency — the dashboard uses blue as an intermediate color rather
than amber, which differs from the standard RAG model.

### Implementation Plan

**Step 1 — Add RAG threshold fields to `Organization`**

```prisma
// Organization model — add:
ragGreenMin  Int @default(75) @map("rag_green_min")
ragAmberMin  Int @default(50) @map("rag_amber_min")
```

**Step 2 — Utility function `getRagColor(achievement, thresholds)`**

```ts
// web/src/lib/rag.ts (new file)
export function getRagColor(
  value: number,
  thresholds = { green: 75, amber: 50 }
): "GREEN" | "AMBER" | "RED" {
  if (value >= thresholds.green) return "GREEN";
  if (value >= thresholds.amber) return "AMBER";
  return "RED";
}
```

**Step 3 — Use in all dashboard/overview components**

Replace the hardcoded `statusColorForAchievement()` with calls to `getRagColor()` that
read org thresholds from a React context or server prop.

**Step 4 — Expose in org settings page**

Allow admin to configure green/amber thresholds (with sensible defaults and validation
that green > amber > 0).

### Files to Change
- `prisma/schema.prisma`
- New migration
- New `web/src/lib/rag.ts`
- `web/src/app/[locale]/dashboards/page.tsx`
- `web/src/app/[locale]/overview/page.tsx`
- `web/src/app/[locale]/organization/page.tsx` — settings UI

---

---

## Implementation Sequence (Recommended)

```
Phase 1 — Quick wins (no schema changes, high impact)
  └── GAP-1: Fix direction-aware achievement  [~2 hours]

Phase 2 — Schema additions (small migrations)
  ├── GAP-5: Leading/lagging field            [~2 hours]
  ├── GAP-6: Min/max value range              [~3 hours]
  └── GAP-7: Configurable RAG thresholds      [~4 hours]

Phase 3 — Medium complexity features
  ├── GAP-3: Period-based compliance          [~1 day]
  └── GAP-2: Weighted health rollup engine    [~2 days]

Phase 4 — Larger features
  └── GAP-4: In-app notification system       [~2 days]
```

**Total estimated effort:** ~8–10 days of focused development.

---

## What Is Already Well Covered

The following areas are **production-ready** and require no changes:

- ✅ Strategy hierarchy — configurable `OrgEntityType` with any depth
- ✅ KPI definition — all SMART attributes (title, owner, baseline, target, unit, direction, period, aggregation)
- ✅ KPI source types — MANUAL / CALCULATED / DERIVED / SCORE all implemented
- ✅ Formula engine — Monaco editor, `vars.CODE`, `get("KEY")` cross-entity references, test runner
- ✅ Cascade recalculation — `cascadeRecalculateDependents()` with circular-dependency guard
- ✅ 4-state governance lifecycle — DRAFT → SUBMITTED → APPROVED → LOCKED
- ✅ Separation of duties — `kpiApprovalLevel` per org, enforced by `resolveRoleRank()`
- ✅ Audit trail — `enteredBy`, `submittedBy`, `approvedBy` + timestamps on every value
- ✅ RBAC — full role-rank enforcement on every server action
- ✅ Data freshness tracking — 5 buckets (excellent/good/fair/needsAttention/noData)
- ✅ Quarterly + monthly trend charts
- ✅ "Needs Attention" KPI surface on Overview
- ✅ Approval aging dashboard (0–2d, 3–5d, 6–10d, 10d+)
- ✅ Bilingual (AR/EN) — every data field + UI string dual-language
- ✅ Multi-tenancy — all queries scoped by `orgId`
- ✅ Soft-delete — `deletedAt` on all key models
