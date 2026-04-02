# UI/UX Review Report — web-classic

**Date:** April 2, 2026  
**Scope:** Full review of `web-classic` — layout, navigation, pages, components, theming, flow, and accessibility.  
**Stack:** Next.js 15 · React 19 · Tailwind CSS · shadcn/ui (New York) · ECharts · Framer Motion · Prisma · better-auth  

---

## Executive Summary

`web-classic` is a well-structured strategy execution & KPI management platform with bilingual (EN/AR) support, dark/light mode, role-based access (Super Admin / Admin / Executive / Manager), and multi-org theming. The foundation is solid — shadcn/ui provides consistent primitives, the `AppShell` sidebar is polished, and the data-heavy pages are feature-rich.

However, there are **significant opportunities** to improve perceived performance, reduce cognitive load, strengthen mobile UX, and bring the experience to a modern executive-dashboard standard. Below are findings grouped by category, each with a severity rating and concrete recommendations.

---

## Table of Contents

1. [Navigation & Information Architecture](#1-navigation--information-architecture)
2. [Loading States & Perceived Performance](#2-loading-states--perceived-performance)
3. [Overview Page (Home Dashboard)](#3-overview-page-home-dashboard)
4. [Entity List & Detail Pages](#4-entity-list--detail-pages)
5. [Dashboards Page](#5-dashboards-page)
6. [Reports Page](#6-reports-page)
7. [Approvals Page](#7-approvals-page)
8. [Responsibilities Page](#8-responsibilities-page)
9. [Strategy Map Page](#9-strategy-map-page)
10. [Login & Authentication Flow](#10-login--authentication-flow)
11. [Global Styles & Theming](#11-global-styles--theming)
12. [Component-Level Issues](#12-component-level-issues)
13. [Accessibility (a11y)](#13-accessibility-a11y)
14. [Mobile & Responsive UX](#14-mobile--responsive-ux)
15. [Performance & Technical UX](#15-performance--technical-ux)
16. [Internationalization (i18n / RTL)](#16-internationalization-i18n--rtl)
17. [Prioritized Action Plan](#17-prioritized-action-plan)

---

## 1. Navigation & Information Architecture

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 1.1 | **Sidebar sections have ambiguous labels** — "kpiCatalog" label is used for the "Entities" section, and "approvals" label is used for the "Workflow" section. These don't match the content. | Medium |
| 1.2 | **Duplicate "overview" icons** — Both `overview` and `dashboards` nav items use `tabler:layout-dashboard`. Users can't visually distinguish them. | Low |
| 1.3 | **No breadcrumb home link** — The `Breadcrumbs` component renders "Home" but with `href: undefined`, making it non-clickable. Users lose the fastest way to navigate back to overview. | Medium |
| 1.4 | **Sidebar collapsed state shows theme/language toggles vertically** — In collapsed mode, the footer stacks `ThemeToggle` and `LanguageToggle` vertically, which looks awkward and takes up excessive space. | Low |
| 1.5 | **No keyboard shortcut for sidebar toggle** — Power users (executives reviewing daily) would benefit from `Cmd/Ctrl + B` to pin/unpin the sidebar. | Low |
| 1.6 | **Mobile nav lacks section dividers** — On mobile, all nav items render as a flat list without the section grouping visible on desktop. This makes it harder to find items. | Medium |
| 1.7 | **No "active section" scroll-into-view** — When sidebar opens (mobile or hover), the active item is not scrolled into view if the list is long. | Low |

### Recommendations

- Rename sidebar section labels to match their content: "Strategic Entities" for entities, "Workflow & Tools" for workflow items.
- Give unique icons to `overview` vs `dashboards` (e.g., `tabler:home` for overview, `tabler:chart-line` for dashboards).
- Make the breadcrumb "Home" item link to `/${locale}/overview`.
- In collapsed sidebar, hide the language toggle text and show only icon-based toggles side by side.
- Add section labels (as small dividers) in the mobile nav drawer.

---

## 2. Loading States & Perceived Performance

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 2.1 | **All pages show a plain text "Loading…" string** — No skeleton screens, no shimmer placeholders. The user sees a blank page then a sudden content pop. | High |
| 2.2 | **Root page (`/`) shows only a spinner** — No branding, no message. A new user sees a spinning circle with zero context. | Medium |
| 2.3 | **Overview page makes 3 parallel server calls client-side** — `getOverviewInsights`, `getFirstEntityTypeCode`, `getOverdueKpis` all fire in `useEffect`. No streaming, no Suspense. | High |
| 2.4 | **Entity detail page makes 5+ sequential server calls** — `getOrgEntityDetail` → then `getOrgEntitiesByKeys` → then `getEntityDependencyTree` → then `getEntityAttachments`. This creates a waterfall. | High |
| 2.5 | **No optimistic UI for save/submit actions** — When saving a KPI draft or submitting for approval, the button just spins. No visual feedback that the action started. | Medium |
| 2.6 | **`Skeleton` component exists but is only used in Reports page** — Other pages that would benefit (overview, dashboards, entity list) don't use it. | Medium |

### Recommendations

- **Add skeleton placeholders** to all data-heavy pages (overview, dashboards, entity list, entity detail, approvals, responsibilities). Use the existing `Skeleton` component from shadcn/ui.
- **Root page**: Show the brand logo + app name + a subtle loading bar instead of a raw spinner.
- **Entity detail page**: Restructure to load core entity data first, then lazy-load attachments, dependency tree, and referenced entities as separate components with their own loading states.
- **Optimistic UI**: After "Save Draft", immediately update the local state and show a success toast, then sync in background.
- **Consider Server Components**: Convert overview/dashboards to server components with `Suspense` boundaries instead of client-side `useEffect` fetching.

---

## 3. Overview Page (Home Dashboard)

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 3.1 | **Information overload** — The page has 7 sections: welcome card, coverage snapshot, 6 stat cards, browse-by-type chart, organizational health donut, recent activity, quarterly progress, needs attention, team performance, and strategic navigation. That's ~13 cards on one scroll. | High |
| 3.2 | **Duplicate quick-action links** — "KPI Management", "Approvals", and "Responsibilities" appear in both the welcome card (top) AND the strategic navigation card (bottom). | Medium |
| 3.3 | **6-column stat row is too dense on medium screens** — `lg:grid-cols-6` creates very narrow cards that truncate text. | Medium |
| 3.4 | **No personalization** — The welcome card says "Welcome Back" but doesn't show anything personalized beyond the user's name (e.g., "You have 3 KPIs due this week"). | Medium |
| 3.5 | **Charts lack interactivity** — The Bar and Donut charts are view-only. Clicking a bar segment should navigate to the relevant entity type. | Low |
| 3.6 | **"Needs Attention" section uses a progress bar as a staleness indicator** — `Progress value={(daysSinceLastUpdate / 90) * 100}` is semantically confusing — higher progress = worse. | Medium |

### Recommendations

- **Reduce to 3-4 key sections** above the fold: (1) Personalized greeting with actionable insights ("3 KPIs overdue, 2 pending approvals"), (2) Key metrics row (4 cards max), (3) One featured chart, (4) Recent activity.
- Move "Strategic Navigation" and "Browse by Type" into the sidebar or a secondary "Explore" page.
- Remove duplicate quick-action links.
- Change the 6-col stat row to `lg:grid-cols-4` with the 2 least important stats moved elsewhere.
- Make chart segments clickable with navigation.
- Replace the staleness progress bar with a color-coded "days since update" badge (green/amber/red).

---

## 4. Entity List & Detail Pages

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 4.1 | **Entity detail page is 1,430 lines in a single component** — This is a maintenance and UX issue; the page tries to do everything (overview, inputs, history, attachments, dependencies, assignments) in one file. | High |
| 4.2 | **20+ useState hooks in entity detail** — The component manages saving, deleting, submitting, approving, rejecting, calculating, uploading, adding URLs, etc. all in one place. This leads to complex conditional rendering and potential state bugs. | High |
| 4.3 | **Entity list loads up to 250 items at once** — `pageSize: 250` with no pagination UI. For orgs with many KPIs, this creates a large initial payload and slow rendering. | High |
| 4.4 | **No empty state illustrations** — "No items yet" is plain text in a box. An illustration + CTA ("Create your first KPI") would guide new users. | Medium |
| 4.5 | **View mode toggle (gauge/ring/line/table) doesn't persist** — Switching away and coming back resets to "ring". User preference should be saved in localStorage. | Low |
| 4.6 | **Filter/sort/group controls are complex but flat** — 5+ dropdown menus in a row can overwhelm. Consider a collapsible "Filters" panel. | Medium |
| 4.7 | **Table view lacks horizontal scroll indicator on mobile** — The table has 9 columns which overflow on mobile, but there's no visual cue that more content exists to the right. | Medium |
| 4.8 | **Entity detail tabs don't update the URL** — Switching between "Overview", "Inputs", "History", "Attachments" doesn't change the URL hash, so you can't bookmark or share a specific tab. | Low |
| 4.9 | **Delete confirmation dialog is too minimal** — It only shows the entity title. For destructive actions, it should warn about cascading effects (e.g., "This will also remove X values and Y assignments"). | Medium |

### Recommendations

- **Split entity detail into sub-components**: `EntityOverviewTab`, `EntityInputsTab`, `EntityHistoryTab`, `EntityAttachmentsTab`, each managing their own state.
- **Add pagination** to the entity list (25-50 per page) with a pagination bar.
- **Add empty state illustrations** using a simple SVG or Lucide icon composition.
- **Persist view mode** in `localStorage`.
- **Collapse filters** behind a "Filters" button that reveals a panel — show active filter count as a badge.
- **Add URL hash routing** for tabs (`#overview`, `#inputs`, `#history`, `#attachments`).
- **Enhance delete dialog** with impact summary.

---

## 5. Dashboards Page

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 5.1 | **Heavily duplicates the Overview page** — "Browse by Type" bar chart, stat cards, and quick-action links are nearly identical to the overview page. Users see the same data twice. | High |
| 5.2 | **No date range selector** — All data is hardcoded to "last 30 days" or "all time". Executives need to filter by quarter, year, or custom range. | High |
| 5.3 | **"Specific Dashboards" section is just a link grid** — These should be inline previews or at least show a metric preview (e.g., "Department Health: 78%"). | Medium |
| 5.4 | **No export/print functionality** — Dashboards should support PDF export or print-optimized view for board presentations. | Medium |

### Recommendations

- **Differentiate dashboards from overview**: Overview = personalized action center. Dashboards = analytical deep-dive with filters.
- **Add a date range picker** (quarter selector at minimum) that filters all charts on the page.
- **Show metric previews** in the "Specific Dashboards" cards (mini sparkline or a single number).
- **Add export button** — use `window.print()` with `@media print` styles as a quick win, or integrate a PDF library.

---

## 6. Reports Page

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 6.1 | **Good tab structure** — Executive, Strategic, KPI, and Tabular tabs are well-organized. | Positive |
| 6.2 | **Tab headers repeat content** — Each tab has both a `TabsTrigger` label AND a header below with icon + title + description. This wastes vertical space. | Low |
| 6.3 | **No way to save/share report configurations** — Users can't bookmark a filtered tabular report view. | Medium |
| 6.4 | **TabularReport is 30,875 bytes (800+ lines)** — Like entity detail, this needs decomposition. | Medium |

### Recommendations

- Remove the redundant in-tab headers; the `TabsTrigger` label is sufficient, with descriptions as tooltips.
- Add URL query params for report filters so configurations are shareable.
- Break `TabularReport` into smaller sub-components.

---

## 7. Approvals Page

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 7.1 | **Filter buttons use non-standard styling** — Custom className overrides for inactive buttons instead of using shadcn's built-in variant system. | Low |
| 7.2 | **No batch approve/reject** — Users must approve KPIs one by one. For organizations with dozens of pending approvals, this is tedious. | High |
| 7.3 | **No approval comments** — When rejecting, there's no way to provide a reason. This is critical for governance workflows. | High |
| 7.4 | **Table doesn't show the KPI value context** — Just shows a number. Should show target, achievement %, and trend for informed decisions. | Medium |
| 7.5 | **Hardcoded Arabic strings** — `locale === "ar" ? "رفض" : "Reject"` — should use the translation system. | Low |

### Recommendations

- **Add batch selection** with "Select All" checkbox and bulk approve/reject buttons.
- **Add rejection reason dialog** — a textarea that captures the reason, which gets sent as a notification to the submitter.
- **Show context columns** — add target, achievement %, and a mini sparkline to the table.
- Move all hardcoded strings to the translation files.

---

## 8. Responsibilities Page

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 8.1 | **Good dual-view (by entity / by user)** — Well-designed tab structure. | Positive |
| 8.2 | **Entity cards are too tall** — Each entity renders as a full card with header + content. For long lists, this creates excessive scrolling. | Medium |
| 8.3 | **Assignment dialog has no search** — For organizations with many users, scrolling through a checkbox list is slow. | Medium |
| 8.4 | **No drag-and-drop** — Would be a nice power-user feature for bulk reassignment. | Low |

### Recommendations

- Switch to a compact list view for entities (single row per entity with inline assignment chips).
- Add search/filter inside the assignment dialog.
- Consider a command palette (like shadcn's `Command` component) for user selection.

---

## 9. Strategy Map Page

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 9.1 | **Two strong visualization modes** — Tree and Treemap are both useful. | Positive |
| 9.2 | **Tree nodes are not clickable for navigation** — Users can expand/collapse but can't click to go to the entity detail page. | Medium |
| 9.3 | **Color legend is well-implemented** — Clear RAG color coding. | Positive |
| 9.4 | **No search/filter** — Can't highlight or filter for a specific pillar or objective. | Low |

### Recommendations

- Make tree nodes clickable — single click to navigate to entity detail.
- Add a search overlay that highlights matching nodes in the tree.

---

## 10. Login & Authentication Flow

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 10.1 | **Clean split-panel layout** — Branding left, form right. Works well. | Positive |
| 10.2 | **Good error handling** — Specific messages for 401, 429, 500. Shake animation on error. | Positive |
| 10.3 | **Post-login uses `window.location.href`** — This causes a full page reload instead of a client-side transition. Creates a jarring flash. | Medium |
| 10.4 | **No "Remember me" option** — Common expectation for enterprise apps. | Low |
| 10.5 | **Forgot password page exists but may not be functional** — Needs verification. | Low |
| 10.6 | **No session timeout warning** — Users get silently redirected to login when their session expires, losing any unsaved work. | High |

### Recommendations

- Use `router.push()` instead of `window.location.href` for post-login redirect, or add a transition overlay.
- Add a session timeout warning modal (e.g., "Your session will expire in 5 minutes. Click to extend.").
- Verify forgot-password flow works end-to-end.

---

## 11. Global Styles & Theming

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 11.1 | **Clean, monochromatic "Clean Slate" theme** — Professional look, well-suited for enterprise. | Positive |
| 11.2 | **Dual font loading** — `globals.css` imports Almarai + Inter via Google Fonts, while `layout.tsx` also imports Rubik. Three font families = unnecessary bandwidth. | Medium |
| 11.3 | **`!important` on font-family** — In `globals.css` and `body` styles. This makes it hard to override for specific components. | Low |
| 11.4 | **Chart colors are monochrome (all blue #3b82f6)** — All charts use the same blue, making it hard to distinguish data series. The `--chart-1` through `--chart-5` CSS variables exist but aren't used. | Medium |
| 11.5 | **Color theme selector labels are not translated** — "Blue", "Emerald", etc. are hardcoded English in `color-theme-selector.tsx`. | Low |
| 11.6 | **`border-radius: 0.375rem`** — This is very subtle (6px). The trend in 2025-2026 is larger radii (8-12px) for a friendlier feel. The `Card` component uses `rounded-xl` (12px) which conflicts with the CSS variable. | Low |

### Recommendations

- **Remove Rubik font** — it's loaded but appears unused. Stick with Inter (EN) + Almarai (AR).
- **Use chart CSS variables** in ECharts configs instead of hardcoded `#3b82f6`.
- Translate color theme labels using the `tr()` function.
- Consider increasing `--radius` to `0.5rem` (8px) for consistency with the `rounded-xl` cards.

---

## 12. Component-Level Issues

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 12.1 | **`NotificationBell` uses a custom dropdown** — Not using Radix `DropdownMenu` or `Popover`. This means no focus trapping, no keyboard navigation, no ESC-to-close from inside. | Medium |
| 12.2 | **`UserMenu` component exists but is not used** — `app-shell.tsx` renders its own inline user menu in the sidebar footer. The dedicated `UserMenu` component with `DropdownMenu` is unused. | Medium |
| 12.3 | **Toast component is custom** — Only used in entity detail page. Other pages show errors inline but don't use toasts for success. Inconsistent feedback pattern. | Medium |
| 12.4 | **`PageHeader` has inconsistent usage** — Some pages wrap it in an extra `<div>` with `flex justify-between`, others don't. The `actions` prop should handle all action layouts. | Low |
| 12.5 | **Mixed icon libraries** — `@iconify/react` (tabler icons via `<Icon>`) and `lucide-react` are both used, sometimes on the same page. This adds bundle size and visual inconsistency. | Medium |

### Recommendations

- **Refactor `NotificationBell`** to use Radix `Popover` for proper focus management and accessibility.
- **Use the `UserMenu` component** in the AppShell instead of the inline implementation, or consolidate.
- **Standardize feedback**: Use toasts for all success/error messages globally via a context provider.
- **Pick one icon library** — recommend Lucide (already used heavily) and migrate remaining Iconify usage, or vice versa. Don't mix.

---

## 13. Accessibility (a11y)

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 13.1 | **No skip-to-content link** — Screen reader users must tab through the entire sidebar to reach the main content. | High |
| 13.2 | **Sidebar `<aside>` lacks `role="navigation"` or `aria-label`** — Screen readers can't identify it. | Medium |
| 13.3 | **`aria-current="page"` is properly used** — Good. | Positive |
| 13.4 | **Charts are inaccessible** — ECharts renders as `<canvas>`, which is invisible to screen readers. No `aria-label` or data table fallback. | High |
| 13.5 | **Color-only status indicators** — RAG badges (Red/Amber/Green) rely solely on color. No shape or text differentiator for color-blind users. | Medium |
| 13.6 | **No focus-visible styles on custom buttons** — The view-mode toggle buttons (gauge/ring/line/table) are plain `<button>` elements without visible focus rings. | Medium |
| 13.7 | **Mobile nav overlay has no focus trap** — When the mobile drawer opens, focus can escape to elements behind it. | Medium |

### Recommendations

- Add a `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` at the top of the layout.
- Add `aria-label="Main navigation"` to the sidebar `<aside>`.
- Provide `aria-label` on all EChart containers describing the data (e.g., "Bar chart showing entity counts by type").
- Add text labels or shape indicators alongside color in RAG badges.
- Use the `focus-clean` utility class on all custom interactive elements.
- Add focus trapping to the mobile nav drawer (use Radix `Dialog` internally or a focus-trap library).

---

## 14. Mobile & Responsive UX

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 14.1 | **No bottom navigation** — Mobile users must open the hamburger menu every time they want to switch sections. A bottom tab bar for the 4-5 most common items would dramatically improve mobile navigation. | High |
| 14.2 | **Cards are too wide for mobile** — The 6-column stat grid on overview becomes single-column but retains desktop-sized padding. | Low |
| 14.3 | **Tables overflow without horizontal scroll cue** — Approvals and entity table views have many columns that overflow on mobile with no visual indicator. | Medium |
| 14.4 | **Charts are cramped on mobile** — ECharts renders at a fixed height, but on narrow screens the labels overlap. | Medium |
| 14.5 | **Entity detail action buttons wrap awkwardly** — "Back", "Edit", "Delete" buttons in `PageHeader` stack vertically on mobile without proper spacing. | Low |
| 14.6 | **Sidebar hover-to-expand is desktop-only** — Good. The mobile drawer is separate. | Positive |

### Recommendations

- **Add a sticky bottom navigation bar** on mobile with 4-5 key items (Overview, Entities, Approvals, Reports, More).
- Add `overflow-x-auto` with a gradient fade or scroll shadow to table containers.
- Set responsive chart heights: `h-[200px] md:h-[300px]`.
- Make action buttons in `PageHeader` wrap into a dropdown on mobile.

---

## 15. Performance & Technical UX

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 15.1 | **All pages are `"use client"`** — The entire app is client-rendered. This means no server-side rendering for data, larger JS bundles, and slower TTI (Time to Interactive). | High |
| 15.2 | **ECharts is 600KB+ bundled** — Imported in full. Should use tree-shaking or dynamic imports. | Medium |
| 15.3 | **Monaco Editor is in dependencies** — 52MB package for what appears to be minimal usage. Should be dynamically imported. | Medium |
| 15.4 | **Font loaded from Google Fonts CDN** — Third-party dependency adds a DNS lookup + download. Should use `next/font` for self-hosting. | Medium |
| 15.5 | **`force-dynamic` on locale layout** — Every page request hits the server. This is correct for auth but prevents static optimization of public pages. | Low |
| 15.6 | **60-second polling intervals** — Notification count and approval count poll every 60s. Consider WebSocket or Server-Sent Events for real-time updates. | Low |
| 15.7 | **`alasql` in dependencies** — 400KB SQL engine in the browser. Verify this is necessary. | Low |

### Recommendations

- **Migrate key pages to Server Components** where possible (overview, dashboards) and use Suspense boundaries.
- **Dynamic import ECharts**: `const EChart = dynamic(() => import('./echart'), { ssr: false })`.
- **Dynamic import Monaco Editor** only on pages that use it.
- Use `next/font` for Inter and Almarai instead of Google Fonts CDN.
- Audit `alasql` usage — if only used for CSV export in reports, use a lighter library.

---

## 16. Internationalization (i18n / RTL)

### Findings

| # | Issue | Severity |
|---|-------|----------|
| 16.1 | **RTL support is well-implemented** — `dir="rtl"`, logical properties (`start`/`end`), and `ltr:`/`rtl:` variants are used correctly throughout. | Positive |
| 16.2 | **Dual translation approach** — Some strings use `t("key")` from the translation file, others use inline `tr("English", "Arabic")`. This creates maintenance burden. | Medium |
| 16.3 | **Some untranslated strings** — "Color Theme", "Gauge", "Ring", "Line", "Table", "Calculate", "Formula", etc. are hardcoded in English. | Medium |
| 16.4 | **Number formatting is locale-aware** — `formatNumber()` handles Arabic numerals. | Positive |
| 16.5 | **Date formatting uses `Intl.DateTimeFormat`** — Correct approach. | Positive |

### Recommendations

- Consolidate all strings into the `messages/ar.json` and `messages/en.json` files. Eliminate inline `tr()` calls over time.
- Audit for remaining hardcoded English strings and move them to translation files.

---

## 17. Prioritized Action Plan

### Phase 1 — Quick Wins (1-2 weeks)

| Priority | Task | Impact |
|----------|------|--------|
| P0 | Add skeleton loading states to all data pages | High perceived performance improvement |
| P0 | Add skip-to-content link and ARIA labels | Accessibility compliance |
| P0 | Fix breadcrumb home link (make clickable) | Navigation fix |
| P1 | Reduce overview page sections (remove duplicates) | Reduces cognitive load |
| P1 | Add batch approve/reject to approvals page | Major workflow improvement |
| P1 | Add rejection reason dialog | Governance requirement |
| P1 | Standardize on one icon library | Reduces bundle size |
| P1 | Remove Rubik font, use next/font for Inter + Almarai | Performance |

### Phase 2 — UX Improvements (2-4 weeks)

| Priority | Task | Impact |
|----------|------|--------|
| P1 | Split entity detail page into sub-components | Maintainability + UX |
| P1 | Add pagination to entity list | Handles scale |
| P1 | Add session timeout warning | Prevents data loss |
| P1 | Add date range picker to dashboards | Analytics flexibility |
| P2 | Add bottom navigation bar for mobile | Mobile UX |
| P2 | Add empty state illustrations | Onboarding experience |
| P2 | Persist view mode preference in localStorage | User preference |
| P2 | Add tab URL hash routing in entity detail | Shareability |

### Phase 3 — Architecture (4-8 weeks)

| Priority | Task | Impact |
|----------|------|--------|
| P2 | Migrate data-heavy pages to Server Components + Suspense | Performance |
| P2 | Dynamic import ECharts and Monaco | Bundle size reduction |
| P2 | Consolidate all translations to message files | Maintainability |
| P2 | Refactor NotificationBell to use Radix Popover | Accessibility |
| P3 | Add chart click-to-navigate interactivity | Discoverability |
| P3 | Add print/PDF export for dashboards and reports | Executive feature |
| P3 | Add WebSocket/SSE for real-time notifications | Modern UX |

---

## Summary Metrics

| Category | Score (1-10) | Notes |
|----------|:---:|-------|
| Visual Design | 8 | Clean, professional, consistent shadcn/ui usage |
| Navigation | 6 | Solid sidebar but missing mobile bottom nav, broken breadcrumb |
| Loading/Performance | 4 | No skeletons, client-side waterfalls, large bundles |
| Accessibility | 4 | No skip link, canvas charts, color-only indicators |
| Mobile UX | 5 | Functional but no bottom nav, cramped charts/tables |
| Information Architecture | 5 | Too much on overview, duplicate content across pages |
| Workflow Efficiency | 6 | Good CRUD but missing batch operations, no rejection reasons |
| Internationalization | 8 | Excellent RTL support, some untranslated strings |
| Code Maintainability | 5 | Some very large monolithic components |
| **Overall** | **5.7** | Solid foundation with clear improvement paths |

---

*This report covers the UI/UX layer only. Backend API performance, database optimization, and deployment architecture are out of scope.*
