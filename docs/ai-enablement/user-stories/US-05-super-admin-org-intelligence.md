# US-05 — Super Admin AI User Stories
## Role: SUPER_ADMIN

The Super Admin manages the entire Rafed KPI platform — creating organizations, configuring
system-wide settings, and monitoring health across all tenants. AI gives them a
cross-organization intelligence layer that would otherwise require hours of manual inspection.

---

### AI-SA-01 — Cross-Organization Performance Chat

**As a** Super Admin  
**I want to** ask the AI about performance across all organizations on the platform  
**So that** I can quickly identify which organizations need attention without manually reviewing each one

**Trigger:** Super Admin opens the Super Admin dashboard and uses the chat assistant  
**Preconditions:**
- Super Admin is authenticated with `SUPER_ADMIN` role
- At least 2 organizations exist with approved KPI data

---

#### Happy Path Flow

```
1. Super Admin opens the Super Admin panel
   → Chat button is available (scoped to platform-wide view)

2. Super Admin types:
   "Which organizations are performing below 60% health this month?"

3. AI responds:

   "Based on approved data as of today (5 March 2026):

   Organizations below 60% overall health:

   🔴 Al-Baraka Group — 44% health
      18 KPIs | 4 red | 7 amber | 7 green
      Concern: 9 KPIs have no approved value this quarter

   🔴 Northern Region Authority — 52% health
      12 KPIs | 3 red | 4 amber | 5 green
      Concern: Approval queue has 8 items — oldest 21 days

   ⚠️ Coastal Development Corp — 58% health
      22 KPIs | 1 red | 9 amber | 12 green
      Trend: Declining for 3 consecutive quarters

   All other organizations (4) are above 60%."

4. Super Admin follows up:
   "What is the average approval turnaround time across all orgs?"

5. AI responds:
   "Platform average approval time this month: 6.2 days
    Fastest: Tech Ventures Ltd — 1.4 days
    Slowest: Al-Baraka Group — 15.3 days
    3 organizations exceed the recommended 7-day SLA."
```

---

#### Data Scoping Rules

| Role | Data Visible to AI |
|------|-------------------|
| SUPER_ADMIN | All organizations, aggregated metrics only |
| EXECUTIVE | Their organization only |
| ADMIN | Their organization only |
| MANAGER | Their assigned entities only |

**Privacy rule:** Super Admin AI context never includes individual user names, email
addresses, or personal KPI ownership details — only aggregated org-level metrics.

---

#### Acceptance Criteria
- [ ] Chat context includes aggregated metrics for ALL organizations (org name, health %, KPI counts, approval queue depth)
- [ ] No individual user PII in Super Admin prompts (no names, emails)
- [ ] "Data as of [timestamp]" shown on every response
- [ ] Org names in responses link to the org's detail page in super-admin panel
- [ ] Super Admin cannot retrieve individual user data through the chat (by design)
- [ ] Chat response time < 8 seconds even with 20+ orgs in context
- [ ] Arabic and English responses supported

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| No orgs have data yet | "No approved KPI data is available across any organization yet." |
| Only 1 org exists | Chat scoped to that org only |
| Super Admin asks about a specific user's data | AI declines: "I only have access to organization-level aggregated data, not individual user details." |
| Very large platform (100+ orgs) | Use summarized context (top/bottom 10 by health, not all 100) |

**Phase:** 2 | **Priority:** P2

---

---

### AI-SA-02 — Organization Onboarding Assistant

**As a** Super Admin  
**I want to** describe a new organization's sector and size and have AI suggest a starter configuration  
**So that** I can onboard new organizations faster with a sensible, sector-appropriate KPI structure from day one

**Trigger:** Super Admin is on the "Create Organization" page and clicks "Use AI Setup Assistant"  
**Preconditions:**
- Super Admin has SUPER_ADMIN role
- On the organization creation page

---

#### Happy Path Flow

```
1. Super Admin is on /super-admin/organizations/create

2. Clicks "Use AI Setup Assistant ✨" at the top of the form

3. A setup wizard modal opens:

   ┌────────────────────────────────────────────────────────────┐
   │ 🤖 Organization Setup Assistant                             │
   │                                                             │
   │ Tell me about this organization:                            │
   │ ┌──────────────────────────────────────────────────────┐   │
   │ │ Government municipality — responsible for city       │   │
   │ │ services including infrastructure, licensing, and    │   │
   │ │ public health. Around 500 employees.                 │   │
   │ └──────────────────────────────────────────────────────┘   │
   │                                                             │
   │ Vision 2030 alignment: [Yes ✓]                             │
   │ Primary language: [Arabic ▼]                               │
   │                                                             │
   │                         [Generate Configuration]           │
   └────────────────────────────────────────────────────────────┘

4. AI generates a starter configuration in ~5 seconds:

   ────────────────────────────────────────────────────────────
   SUGGESTED ORGANIZATION CONFIGURATION
   Sector: Government / Municipality
   ────────────────────────────────────────────────────────────

   ENTITY TYPE HIERARCHY (4 levels):
   1. Strategic Pillars (المحاور الاستراتيجية)
   2. Strategic Objectives (الأهداف الاستراتيجية)
   3. Initiatives (المبادرات)
   4. KPIs (مؤشرات الأداء الرئيسية)

   SUGGESTED STARTER KPIs (10):
   ┌────────────────────────────────────────────────────────┐
   │ 1. Citizen Satisfaction Index                          │
   │    AR: مؤشر رضا المواطنين | Unit: % | Monthly | ↑    │
   │    Target: ≥ 85% | Formula: Survey-based (manual)     │
   ├────────────────────────────────────────────────────────┤
   │ 2. Service Request Resolution Rate                     │
   │    AR: معدل تسوية طلبات الخدمة | Unit: % | Monthly   │
   │    Target: ≥ 90%                                       │
   ├────────────────────────────────────────────────────────┤
   │ 3. Average Service Response Time                       │
   │    AR: متوسط وقت الاستجابة للخدمة | Unit: days | ↓   │
   │    Target: ≤ 3 days                                    │
   │ ... (7 more KPIs)                                      │
   └────────────────────────────────────────────────────────┘

   APPROVAL LEVEL: Executive (recommended for government orgs)

   [Apply this configuration]  [Customize]  [Start from scratch]

5a. Super Admin clicks "Apply" → entity types and KPIs pre-seeded
5b. Super Admin clicks "Customize" → can edit individual items before applying
5c. Super Admin clicks "Start from scratch" → returns to manual form
```

---

#### Sector Knowledge Base

AI uses embedded sector knowledge to generate relevant KPIs:

| Sector | Key KPI Categories |
|--------|-------------------|
| Government / Municipality | Citizen satisfaction, service delivery time, digital transformation rate, employee productivity |
| Healthcare | Patient satisfaction, bed occupancy rate, readmission rate, average wait time |
| Education | Graduation rate, student satisfaction, teacher-to-student ratio, digital learning adoption |
| Financial Services | Return on equity, non-performing loan ratio, customer acquisition cost, digital transactions % |
| Real Estate / Construction | Project delivery on time, cost variance, occupancy rate, defect rate |
| Retail / FMCG | Sales per sqm, inventory turnover, customer retention rate, fulfillment accuracy |

---

#### Acceptance Criteria
- [ ] Wizard accessible from the Create Organization page
- [ ] AI returns: entity type hierarchy, 8–12 starter KPIs, recommended approval level
- [ ] All KPIs include EN and AR names, unit, direction, period, suggested target
- [ ] "Apply" pre-fills the create org form — Super Admin still confirms before saving
- [ ] "Customize" allows editing each suggested item before applying
- [ ] Vision 2030 KPIs prioritized when "V2030 alignment" is checked
- [ ] Configuration is a starting point, not locked — Super Admin can always add/remove later
- [ ] All AI interactions logged to `AiInteraction`

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Description is too vague ("a company") | AI asks clarifying questions: "What sector or industry? What are the main activities?" |
| Sector not in knowledge base | AI generates generic management KPIs with a note: "These are general suggestions — customize for your sector." |
| Admin types in Arabic | AI accepts Arabic input and generates Arabic-primary configuration |
| Super Admin applies configuration but org already has entity types | Confirmation: "This will add to existing entity types. Continue?" |

**Phase:** 2 | **Priority:** P2

---

---

### AI-SA-03 — Platform AI Usage Dashboard

**As a** Super Admin  
**I want to** see a dashboard showing how AI features are being used across the platform  
**So that** I can monitor costs, identify which features deliver value, and detect misuse

**Trigger:** Super Admin navigates to /super-admin/ai-usage  
**Preconditions:**
- `AiInteraction` table has data (at least one AI call logged)

---

#### Happy Path Flow

```
1. Super Admin navigates to /super-admin/ai-usage

2. Dashboard shows:

   ┌──────────────────────────────────────────────────────────────┐
   │ PLATFORM AI USAGE — March 2026                               │
   │                                                              │
   │  Total interactions: 847   Total tokens: 4.2M   Est. cost: $21.00  │
   │                                                              │
   │  BY FEATURE                    BY ORGANIZATION              │
   │  ─────────────                 ──────────────               │
   │  Chat Assistant:    312 (37%)  Al-Musa Group:       412     │
   │  Exec Summary:      201 (24%)  Coastal Dev:          198     │
   │  Auto-translate:    156 (18%)  Northern Authority:   127     │
   │  Formula Builder:    98 (12%)  Others (5 orgs):      110     │
   │  KPI Wizard:         80 ( 9%)                               │
   │                                                              │
   │  DAILY USAGE (last 14 days)                                  │
   │  [Bar chart]                                                  │
   │                                                              │
   │  TOP QUERIES (Chat)                                          │
   │  1. "What is our overall performance?" — 34 times           │
   │  2. "Which KPIs are at risk?" — 28 times                    │
   │  3. "Generate summary" — 22 times                           │
   │                                                              │
   │  COST ALERTS                                                 │
   │  ⚠️ Al-Musa Group is on pace to exceed monthly token limit  │
   │     (used 78% of limit with 8 days remaining)              │
   └──────────────────────────────────────────────────────────────┘

3. Super Admin can click any org row to see org-level breakdown
4. Can set/adjust token limits per org from this page
5. Can export usage data as CSV
```

---

#### Acceptance Criteria
- [ ] Dashboard sources data from `AiInteraction` table (no separate analytics DB needed)
- [ ] Metrics: total interactions, total tokens, estimated cost (tokens × rate), breakdown by feature and org
- [ ] Daily usage chart shows last 14 days
- [ ] Cost alert triggered when org is at ≥ 75% of monthly token limit
- [ ] Top chat queries shown (anonymized — no user names, no org names in query text)
- [ ] CSV export available for billing/reporting purposes
- [ ] Page accessible to SUPER_ADMIN only

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| AI features just enabled, few interactions | "Not enough data yet — check back after more usage." |
| An org exceeds token limit | AI features soft-disabled for that org with admin notice |
| Unusual spike in usage (possible abuse) | Flagged in dashboard with link to investigate interaction logs |

**Phase:** 2 | **Priority:** P3

---

---

## Use Case Diagram — Super Admin AI Interactions

```
                 ┌──────────────────────────┐
                 │        SUPER ADMIN        │
                 └──────────┬───────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                  ▼
 ┌────────────────┐ ┌──────────────┐ ┌─────────────────┐
 │  AI-SA-01      │ │  AI-SA-02    │ │  AI-SA-03       │
 │  Cross-Org     │ │  Org         │ │  AI Usage       │
 │  Performance   │ │  Onboarding  │ │  Dashboard      │
 │  Chat          │ │  Assistant   │ │                 │
 └───────┬────────┘ └──────┬───────┘ └────────┬────────┘
         │                 │                   │
         ▼                 ▼                   ▼
  "Which orgs are    "Seed new org with   "Are AI costs
   underperforming?" sector-appropriate    within budget?"
                     KPI configuration"
         │                 │                   │
         └─────────────────┴───────────────────┘
                           │
                           ▼
              Platform-wide intelligence with
              full multi-tenant isolation
```

---

## Cross-Role Use Case Summary

The table below shows which AI features each role accesses and the interaction point:

| Feature | EX | MGR | ADMIN | APPROVER | SUPER ADMIN |
|---------|----|----|-------|----------|-------------|
| Chat Assistant | ✅ Org-wide | ✅ Assigned only | ✅ Org-wide | ✅ Org-wide | ✅ Platform-wide |
| Executive Summary | ✅ Primary user | — | ✅ Can generate | — | ✅ Per org |
| At-Risk Alerts | ✅ Receives | ✅ Receives (own) | ✅ Configures | — | — |
| Formula Builder | — | ✅ Explain | ✅ Build | — | — |
| Auto-translate | — | — | ✅ Primary user | — | ✅ Org setup |
| KPI Wizard | — | — | ✅ Primary user | — | ✅ Org setup |
| Value Entry Assist | — | ✅ Primary user | — | — | — |
| Anomaly Warning | — | ✅ On submit | — | ✅ On review | — |
| Rejection Comment | — | — | — | ✅ Primary user | — |
| Queue Prioritization | — | — | — | ✅ Primary user | — |
| Governance Report | — | — | ✅ Primary user | — | ✅ Platform |
| Onboarding Assistant | — | — | — | — | ✅ Primary user |
| Usage Dashboard | — | — | — | — | ✅ Primary user |
