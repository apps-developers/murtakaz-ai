# UI/UX Review Report — Rafed KPI Web App

**Date:** March 2026  
**Scope:** Full `web/` application — all pages, components, navigation, i18n, accessibility, and interaction patterns.

---

## Executive Summary

The application has a strong design foundation: consistent dark/light theming, bilingual AR/EN support with RTL, a polished sidebar, and well-structured data dashboards. The main areas requiring attention are **information architecture duplication**, **incomplete i18n coverage**, **accessibility gaps**, **loading/error state inconsistencies**, **raw enum display to users**, and **form UX regressions** on complex pages.

---

## 1. 🔴 Critical Issues

### 1.1 Raw Enum Values Exposed to Users

**Location:** `entities/[entityTypeCode]/page.tsx` line 248, `approvals/page.tsx`

The entity list card shows raw status enum values directly:
```tsx
<span>{t("status")}: {String(e.status ?? "—")}</span>
```
Users see `PLANNED`, `AT_RISK`, `COMPLETED` instead of translated human-readable labels. The `kpiValueStatusLabel()` function already exists in the locale provider but is not used here.

**Impact:** High — breaks localization and looks unprofessional.  
**Fix:** Replace with `kpiValueStatusLabel(String(e.status))` or a dedicated `statusLabel()` helper.

---

### 1.2 Duplicate CardTitle and CardDescription on Dashboard Pages

**Location:** `dashboards/page.tsx` lines 185–186, `overview/page.tsx` lines 268–270

```tsx
<CardTitle className="text-lg">{t("browseByTypeDesc")}</CardTitle>
<CardDescription className="mt-1">{t("browseByTypeDesc")}</CardDescription>
```
The `CardTitle` and `CardDescription` use the **same translation key** (`browseByTypeDesc`), meaning both show identical text. The title should say "Browse by Type" and the description should be the explanatory subtitle.

**Impact:** High — confusing to users, appears as a bug.  
**Fix:** Use a proper title key (e.g., `t("entityTypeBreakdown")`) for the `CardTitle`.

---

### 1.3 Delete Dialog Has No Confirmation Message

**Location:** `entities/[entityTypeCode]/page.tsx` lines 271–272

```tsx
<DialogTitle>{t("delete")}</DialogTitle>
<DialogDescription className="text-muted-foreground">{t("delete")}</DialogDescription>
```
Both the title and description of the delete confirmation dialog use the same key `"delete"`, showing the same single word twice with no actual warning. Users have no clear indication of what will happen or that the action is irreversible.

**Impact:** High — destructive actions with no warning is a critical UX failure.  
**Fix:** Add a proper description key like `"deleteConfirmDesc"` that reads: *"This action cannot be undone. The item will be permanently deleted."*

---

### 1.4 Notifications Navigate via `window.location.href` (Full Page Reload)

**Location:** `app-shell.tsx` lines 607–609

```tsx
onClick={() => {
  void markNotificationsRead().catch(() => {});
  setUnreadCount(0);
  window.location.href = `/${locale}/approvals`;
}}
```
The notification bell uses a hard `window.location.href` redirect instead of Next.js `router.push()`. This causes a full page reload, losing any in-page state and breaking the SPA experience.

**Impact:** High — disrupts navigation flow.  
**Fix:** Use `router.push(`/${locale}/approvals`)` from `useRouter()`.

---

## 2. 🟠 High-Priority Issues

### 2.1 No Search/Filter on Approvals Page

**Location:** `approvals/page.tsx`

The approvals page only has three status filter buttons (Pending / Approved / All) but lacks:
- Entity name search
- Date range filter
- Submitted-by filter

As approvals accumulate, finding specific items becomes impossible. The table has no pagination either — all items load at once.

**Impact:** High for admins managing volume workflows.  
**Fix:** Add a search input and consider pagination or virtual scrolling.

---

### 2.2 Massive Single-File Entity Detail Page (1,316 Lines)

**Location:** `entities/[entityTypeCode]/[entityId]/page.tsx`

This single page component handles: data fetching, KPI gauges, trend charts, variable inputs, approval workflow, attachments (upload + URL + delete), dependency trees, formula display, referenced entities, and assignments — all in 1,316 lines.

**Impact:** High maintainability and UX issue — page loads all sections unconditionally, triggering **5+ sequential async calls** on mount (`getOrgEntityDetail`, `getOrgEntitiesByKeys`, `getEntityDependencyTree`, `getEntityAttachments`). This causes visible content jank.

**Fix:** Break into tab sections (`Details`, `History`, `Attachments`, `Dependencies`) loaded lazily per tab. Use Suspense boundaries.

---

### 2.3 New/Edit Entity Forms Show KPI-Specific Fields for All Entity Types

**Location:** `entities/[entityTypeCode]/new/page.tsx`, `edit/page.tsx`

The "Measurement" section (period type, direction, indicator type, baseline, target, min/max, formula, variables) is always rendered regardless of whether the entity type is a KPI or not. There is an `isKpiType` flag defined but it is only used to set the default `periodType` — it never conditionally hides/shows the measurement section.

**Impact:** High — confusing for admins creating non-KPI entities (pillars, objectives, initiatives) who see irrelevant KPI-specific fields.  
**Fix:** Wrap the entire "Measurement" card in `{isKpiType ? ... : null}`.

---

### 2.4 Role Labels Displayed as Raw Enum Strings

**Location:** `users/page.tsx` line 421, `responsibilities/page.tsx`, `app-shell.tsx` line 433

Users see `ADMIN`, `MANAGER`, `EXECUTIVE` as raw enum values in badges and the profile sidebar. The `getRoleLabel()` helper exists in `responsibilities/page.tsx` but is not used globally.

**Impact:** High — unprofessional display, especially for Arabic users.  
**Fix:** Create a shared `roleLabel(role, t)` utility and use it consistently across all pages.

---

### 2.5 No Success Feedback After Save/Submit/Approve Actions

**Location:** Entity detail page, approvals, responsibilities

After saving a draft, submitting for approval, approving, or assigning users, there is no success toast or confirmation message. The only feedback is the page silently reloading. If the action succeeded but the reload is slow, users may click again.

**Impact:** High — users don't know if their action succeeded.  
**Fix:** Add a toast notification (the `sonner` or similar library) on successful mutations. A `"Saved successfully"` / `"Submitted for approval"` toast is the minimum.

---

### 2.6 Sidebar Navigation: No Active State for Dynamic Entity Type Routes

**Location:** `app-shell.tsx` lines 255–267

The `activeKey` logic for `/entities/[slug]` routes returns `entities-${slug}`. Dynamic entity type nav items use `key: \`entities-${keySlug}\`` so this does work — but only when `code` is lowercase. If the DB stores the code in mixed or uppercase, `activeKey` and `item.key` won't match, leaving no nav item highlighted.

**Fix:** Normalize `code` to lowercase when both computing `activeKey` and building `entityTypeIconMap` lookups (currently done inconsistently — `activeKey` does `.split("/").filter(Boolean)[1]` without `.toLowerCase()`).

---

### 2.7 `overview/page.tsx` Uses `any` Type for Activity and TopTypes

**Location:** `overview/page.tsx` lines 61–62, 315

```tsx
categories: types.map((x: any) => df(x.name, x.nameAr)),
data?.recentActivities?.map((activity: any) => {
```
These explicit `any` casts bypass TypeScript. If the server action return type changes, these will silently break at runtime.

---

## 3. 🟡 Medium-Priority Issues

### 3.1 Loading State Is Plain Text — No Skeleton UI

**Location:** All pages — entity list, detail, dashboard, approvals, profile

Loading states are rendered as a simple `<p>{t("loading")}</p>` inside a card. This causes noticeable layout shift when real content loads (especially on the dashboard with 4 metric cards and 3 charts).

**Fix:** Replace text loading states with skeleton/shimmer components matching the content shape. shadcn/ui's `Skeleton` component is already available.

---

### 3.2 Approvals Page: No Action Buttons in the Table

**Location:** `approvals/page.tsx`

The approvals table is read-only — there are no Approve/Reject buttons inline. Approvers must navigate to the entity detail page to act. This is an unnecessary friction point for a workflow-driven feature.

**Fix:** Add inline Approve/Reject action buttons for rows with `SUBMITTED` status.

---

### 3.3 Responsibilities Page: Search Input Has Broken RTL Padding

**Location:** `responsibilities/page.tsx` line 304–310

```tsx
<Search className="absolute left-3 top-1/2 ..." />
<Input ... className="pl-10" />
```
The search icon is positioned with `left-3` and the input has `pl-10` padding — these are hardcoded LTR values. In Arabic (RTL) mode, the icon will appear inside the text, not at the leading edge.

**Fix:** Use `start-3` / `ps-10` instead of `left-3` / `pl-10`.

---

### 3.4 Native `<select>` Used Alongside shadcn/ui Selects

**Location:** `responsibilities/page.tsx` lines 312–323

```tsx
<select
  value={selectedType}
  onChange={(e) => setSelectedType(e.target.value)}
  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
>
```
A native HTML `<select>` is used for the entity type filter while every other dropdown in the app uses `shadcn/ui`'s `<Select>`. In dark mode and RTL, the native select looks inconsistent and doesn't respect the app's theme tokens properly.

**Fix:** Replace with the shadcn/ui `<Select>` component.

---

### 3.5 Native HTML Checkboxes Inside Variable Editor

**Location:** `entities/[entityTypeCode]/new/page.tsx` lines 538–597, `edit/page.tsx` lines 573–598

```tsx
<input
  type="checkbox"
  checked={v.isRequired}
  onChange={...}
/>
```
Native `<input type="checkbox">` elements are used for "Required" and "Static" flags in the variable editor, while the rest of the form uses shadcn/ui `<Checkbox>`. This is visually inconsistent and the native checkbox doesn't inherit the app's dark mode styles.

**Fix:** Replace with `<Checkbox>` from `@/components/ui/checkbox`.

---

### 3.6 Entity List Page: Search Requires Manual Button Click

**Location:** `entities/[entityTypeCode]/page.tsx` lines 172–182

The search input does not auto-search on type (or with a debounce). Users must type their query and then click a "Search" button. This is a regression from standard UX patterns.

**Fix:** Add a `useEffect` with a 300ms debounce on `q` that calls `loadData()` automatically.

---

### 3.7 Dashboard Page Has Duplicate Data Between `/overview` and `/dashboards`

**Location:** `overview/page.tsx`, `dashboards/page.tsx`

Both pages render nearly identical sections:
- "Browse by Type" bar chart (same card, same title key duplication)
- Monthly activity sparklines
- Quick action links

The distinction between the two pages is unclear to users. The sidebar has both a "Home" (overview) and "Dashboards" item that look visually similar.

**Fix:** Clearly differentiate the two pages — "Overview" should be the executive summary (health, alerts, attention items) while "Dashboards" should be the detailed analytics view (charts, trends, top performers). Remove duplicate sections.

---

### 3.8 Profile Page: Department Field Always Shows "—"

**Location:** `profile/page.tsx` line 131

```tsx
<p className="mt-1 text-foreground">—</p>
```
The "Department" field in the profile card is hardcoded to display a dash. This is either unimplemented or the data isn't being fetched.

**Fix:** Either remove the field, or wire it up to the actual department data from the user's org structure.

---

### 3.9 Admin Page Has Hardcoded Placeholder/Demo Data

**Location:** `admin/page.tsx` lines 27–63

The admin page shows:
- `{t("demoOrganization")}` as the org name (hardcoded translation key)
- `example.com` as a hardcoded domain
- Audit log entries that are hardcoded static strings (`"kpiTargetUpdated"`, `"financeOpsDaysAgo"`)

This data is not pulled from the database.

**Fix:** Fetch real organization data from the org profile action and display the actual audit trail.

---

### 3.10 Users Page: Role Values in Dropdown Are Raw Enum Strings

**Location:** `users/page.tsx` lines 339–345, 527–533

```tsx
{roles.map((r) => (
  <SelectItem key={r} value={r}>{r}</SelectItem>
))}
```
Role select items show `ADMIN`, `EXECUTIVE`, `MANAGER` as raw enum values. Arabic users see English technical identifiers.

**Fix:** Map each role to its translated label using the i18n system.

---

### 3.11 `Insert get()` Button Uses Hardcoded `mr-2` (LTR Only)

**Location:** `entities/[entityTypeCode]/new/page.tsx` line 650, `edit/page.tsx` line 685

```tsx
<Code2 className="h-4 w-4 mr-2" />
```
`mr-2` is a LTR-only margin. In RTL (Arabic), the icon spacing will be on the wrong side.

**Fix:** Replace `mr-2` with `me-2` (margin-end) which flips correctly with RTL.

---

## 4. 🔵 Low-Priority / Enhancement Suggestions

### 4.1 No Breadcrumb Navigation

On deep pages (entity detail → edit), there are no breadcrumbs. The only navigation is a "Back" button. With deeply nested routes like `/entities/kpi/[id]/edit`, breadcrumbs would significantly aid orientation.

**Suggestion:** Add a `<Breadcrumb>` component to `PageHeader` for routes with depth ≥ 3.

---

### 4.2 Sidebar: No Scroll Indicator When Nav Items Overflow

**Location:** `app-shell.tsx` line 496

The sidebar nav uses `overflow-y-auto` but there's no visual indicator (gradient fade or scrollbar styling) that the nav is scrollable when it overflows. Organizations with many entity types will have an invisible scroll area.

**Suggestion:** Add a subtle bottom gradient fade to indicate scrollability.

---

### 4.3 Login Page: No "Show Password" Toggle

**Location:** `auth/login/page.tsx`

The password input has no visibility toggle. This is a standard pattern for password fields.

**Suggestion:** Add an eye icon button to toggle `type="password"` / `type="text"`.

---

### 4.4 Entity List Cards: No Status Badge Visible

**Location:** `entities/[entityTypeCode]/page.tsx` lines 247–249

The entity card shows the status as a tiny text label at the bottom in `text-xs text-muted-foreground`. For KPIs at-risk or overdue, there's no visual urgency indicator.

**Suggestion:** Add a colored status badge (`ACTIVE` = green, `AT_RISK` = amber, `COMPLETED` = blue, `PLANNED` = gray) in the card header.

---

### 4.5 Dark Mode: EChart Series Colors Are Hardcoded for Dark

**Location:** `entities/[entityTypeCode]/[entityId]/page.tsx` lines 380–384

```tsx
xAxis: { ..., axisLabel: { color: "rgba(226,232,240,0.75)" } },
```
Chart axis label colors and tooltip backgrounds are hardcoded to dark-mode values (`rgba(226,232,240,...)`), making them invisible or very low-contrast in light mode.

**Suggestion:** Derive chart colors from CSS custom properties or pass the current `theme` to the chart config (similar to how `MonacoEditor` already handles it).

---

### 4.6 Landing Page FAQ: Framer Motion Animation Bug

**Location:** `page.tsx` lines 376–388

The FAQ uses `<m.details>` (Framer Motion on a `<details>` element) with `initial/animate` inside, but `<details>` is a browser-native disclosure element. The animated `height` transition on the inner `<m.div>` won't work correctly because the `<details>` element controls visibility natively — the Framer Motion `height: 0 → auto` animation will conflict.

**Suggestion:** Replace `<m.details>` with a custom controlled accordion using shadcn/ui's `Accordion` component, or use a controlled `open` state + `AnimatePresence` for correct animation.

---

### 4.7 Missing `aria-label` on Notification Bell Button

**Location:** `app-shell.tsx` line 603

```tsx
aria-label="Notifications"
```
The `aria-label` is hardcoded in English. In Arabic mode it should read "الإشعارات".

**Suggestion:** Use `aria-label={t("notifications")}` with a translation key.

---

### 4.8 Profile Page: Logout Button Uses `variant="destructive"`

**Location:** `profile/page.tsx` line 86

```tsx
<Button variant="destructive" onClick={() => void signOut()}>
  {t("logout")}
```
Logout is not a destructive action in the traditional sense (it doesn't delete data). Using `destructive` styling (red button) for logout signals danger and may confuse users.

**Suggestion:** Use `variant="outline"` or `variant="secondary"` for logout.

---

### 4.9 No Empty State Illustration/Guidance for New Organizations

When an org has no entities yet, pages like `overview`, `dashboards`, and entity lists show a plain `{t("noItemsYet")}` text inside a bordered box. New organizations get no onboarding guidance.

**Suggestion:** Add an illustrated empty state with a CTA button (e.g., "Create your first KPI →") for zero-data states on the entity list and overview pages.

---

### 4.10 `max-w-7xl` Content Area is Too Wide on Ultra-Wide Screens

**Location:** `app-shell.tsx` line 657

```tsx
<main className="relative mx-auto grid w-full max-w-7xl gap-6 px-6 pb-12 pt-8 lg:px-8">
```
`max-w-7xl` (1280px) is a reasonable cap for most displays, but when the sidebar is collapsed (80px wide), the effective content area spans ~1200px. Reducing to `max-w-6xl` or adding a tighter cap for dashboard charts would improve readability on wide screens.

---

## 5. Accessibility Issues

| Issue | Location | Severity |
|-------|----------|----------|
| No `<html lang>` set in layout (only `[locale]` route param is used) | `layout.tsx` | High |
| Icon-only buttons lack `aria-label` in entity cards (Edit/Delete in list page) | `entities/[typeCode]/page.tsx` | Medium |
| Delete confirmation dialogs don't trap focus | All dialogs | Medium |
| Form labels in variable editor use `className="text-xs"` Label — no `htmlFor` | `new/page.tsx`, `edit/page.tsx` | Medium |
| Color alone distinguishes status (RAG badge) with no text alternative | `rag-badge.tsx` | Low |
| FAQ `<details>/<summary>` has no `aria-expanded` management in the custom animation layer | `page.tsx` | Low |

---

## 6. i18n / RTL Consistency Issues

| Issue | Location |
|-------|----------|
| Search icon in Responsibilities uses `left-3` / `pl-10` (hardcoded LTR) | `responsibilities/page.tsx:304` |
| `mr-2` used instead of `me-2` in formula insert button | `new/page.tsx:650`, `edit/page.tsx:685` |
| `aria-label="Notifications"` hardcoded in English | `app-shell.tsx:603` |
| Hardcoded `"Entity"` column header in Approvals (not using translation key) | `approvals/page.tsx:105` |
| Role values in dropdowns shown as raw English enums (`ADMIN`, `MANAGER`) | `users/page.tsx:339` |
| EChart trend colors hardcoded for dark theme | `entities/[id]/page.tsx:380` |

---

## 7. Code Quality Issues Affecting UX

| Issue | Location | Impact |
|-------|----------|--------|
| `new/page.tsx` and `edit/page.tsx` are ~700 lines each with identical code | Both files | Maintenance — any bug fix must be applied twice |
| `entities/[id]/page.tsx` is 1316 lines with 5 async waterfalls on mount | Entity detail | Perceived performance |
| `any` types in `overview/page.tsx` activity and topTypes maps | overview | Silent runtime failures |
| Inline `tr("...", "...")` calls mixed with `t("key")` usage inconsistently | All forms | Translation parity issues |

---

## Summary Priority Matrix

| # | Issue | Priority | Effort |
|---|-------|----------|--------|
| 1.1 | Raw enum status values on entity cards | 🔴 Critical | Low |
| 1.2 | Duplicate CardTitle/Description on dashboards | 🔴 Critical | Low |
| 1.3 | Delete dialog has no warning message | 🔴 Critical | Low |
| 1.4 | Notification bell uses full page reload | 🔴 Critical | Low |
| 2.1 | No search on approvals page | 🟠 High | Medium |
| 2.2 | Entity detail page 1316-line God component | 🟠 High | High |
| 2.3 | KPI fields shown for all entity types | 🟠 High | Low |
| 2.4 | Raw role enum labels everywhere | 🟠 High | Low |
| 2.5 | No success feedback on mutations | 🟠 High | Medium |
| 2.6 | Sidebar active state case sensitivity | 🟠 High | Low |
| 3.1 | No skeleton loading states | 🟡 Medium | Medium |
| 3.2 | Approvals table lacks action buttons | 🟡 Medium | Medium |
| 3.3 | RTL broken search icon in Responsibilities | 🟡 Medium | Low |
| 3.4 | Native `<select>` inconsistency | 🟡 Medium | Low |
| 3.5 | Native checkbox inconsistency in variable editor | 🟡 Medium | Low |
| 3.6 | Entity search requires button click | 🟡 Medium | Low |
| 3.7 | Overview vs Dashboards duplication | 🟡 Medium | Medium |
| 3.8 | Department always shows "—" on profile | 🟡 Medium | Low |
| 3.9 | Admin page hardcoded demo data | 🟡 Medium | Medium |
| 4.1 | No breadcrumb navigation | 🔵 Low | Medium |
| 4.3 | No show/hide password on login | 🔵 Low | Low |
| 4.5 | Chart colors hardcoded for dark mode | 🔵 Low | Medium |
| 4.8 | Logout uses destructive button style | 🔵 Low | Low |

---

*Generated by deep code review of `/web/src` — all referenced line numbers are accurate as of the review date.*
