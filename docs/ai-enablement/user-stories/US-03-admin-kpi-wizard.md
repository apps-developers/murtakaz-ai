# US-03 — Admin AI User Stories
## Role: ADMIN

The Admin role configures the organization — creating entity types, defining KPIs, managing
users, and overseeing governance. AI dramatically reduces the time spent on setup and
configuration work, and helps Admins catch governance issues before they escalate.

---

### AI-ADM-01 — KPI Definition Wizard

**As an** Admin  
**I want to** describe a strategic objective in plain language and have AI suggest relevant KPIs  
**So that** I can create a complete, well-defined KPI set quickly without needing deep KPI design expertise

**Trigger:** Admin clicks "Create KPI" on the entities list page and selects "Use AI Wizard"  
**Preconditions:**
- Admin is logged in with `ADMIN` role
- At least one entity type with code `KPI` exists in the organization

---

#### Happy Path Flow

```
1. Admin navigates to /entities/kpi and clicks "New KPI"
   → A choice appears: [Create manually] [Use AI Wizard ✨]

2. Admin clicks "Use AI Wizard"
   → Modal opens with a text area:

   ┌────────────────────────────────────────────────────────────┐
   │ 🤖 KPI Definition Wizard                                    │
   │                                                             │
   │ Describe your strategic objective or department goal:       │
   │ ┌─────────────────────────────────────────────────────┐    │
   │ │ We want to improve customer service quality and     │    │
   │ │ reduce response time in our call center.            │    │
   │ └─────────────────────────────────────────────────────┘    │
   │                                                             │
   │ Sector context: [Government ▼]                              │
   │ Number of suggestions: [5 ▼]                               │
   │                                   [Generate Suggestions]   │
   └────────────────────────────────────────────────────────────┘

3. Admin clicks "Generate Suggestions" → loading indicator (~3–5 seconds)

4. AI returns 5 KPI cards:

   ┌─────────────────────────────────────────────────────────────┐
   │ ✅ Suggestion 1 of 5                              [Accept]  │
   │                                                             │
   │ Title (EN): First Call Resolution Rate (FCR)               │
   │ Title (AR): معدل الحل في المكالمة الأولى                   │
   │ Unit: %  |  Direction: Increase is good  |  Period: Monthly│
   │ Target: 80%  |  Baseline: (to be set)                      │
   │ Formula: (vars.RESOLVED_FIRST_CALL / vars.TOTAL_CALLS)*100  │
   │                                                             │
   │ Why this KPI? Directly measures efficiency of first contact │
   │ resolution — a core indicator of call center effectiveness. │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │ ✅ Suggestion 2 of 5                              [Accept]  │
   │ Title (EN): Average Handle Time (AHT)                      │
   │ Title (AR): متوسط وقت معالجة المكالمة                      │
   │ Unit: minutes  |  Direction: Decrease is good  |  Monthly  │
   │ Target: ≤ 5 min  |  Formula: vars.TOTAL_HANDLE_TIME / vars.CALLS│
   └─────────────────────────────────────────────────────────────┘

   ... (3 more cards)

   [Accept All Selected]  [Start Over]

5. Admin selects suggestions 1, 2, and 4
   → Clicks "Accept Selected (3)"

6. For each accepted KPI, the create entity form opens pre-filled:
   - Title, titleAr, unit, direction, periodType, formula, variables pre-populated
   - Admin reviews, sets baseline value, assigns owner
   - Saves each KPI
```

---

#### Acceptance Criteria
- [ ] Wizard accessible from entity list page (not replacing manual create)
- [ ] AI returns exactly the requested number of suggestions (default 5)
- [ ] Each suggestion includes: EN title, AR title, unit, direction, period, suggested target, formula (if applicable), rationale
- [ ] "Accept" pre-fills the create entity form — Admin still confirms before saving
- [ ] Suggestions are SMART-compliant (specific, measurable, time-bound)
- [ ] Arabic titles use correct KPI domain terminology (not generic translations)
- [ ] Admin can edit any field after accepting a suggestion
- [ ] "Start Over" clears suggestions and returns to description input
- [ ] All suggestions logged to `AiInteraction` audit table

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Vague objective ("improve performance") | AI asks for clarification: "Could you specify which department or area?" |
| Objective in Arabic | AI accepts Arabic input and returns Arabic-primary suggestions |
| Duplicate KPI already exists | AI flags: "A similar KPI ('Customer Satisfaction Score') already exists in your org." |
| Formula variables not yet defined | Variables shown as suggestions — Admin adds them after accepting |

**Phase:** 2 | **Priority:** P1

---

---

### AI-ADM-02 — Formula Builder from Description

**As an** Admin  
**I want to** describe a calculation in plain language and have AI write the formula code  
**So that** I can define calculated KPIs without needing to know the formula syntax

**Trigger:** Admin is on the entity create/edit form and clicks "Ask AI" next to the formula editor  
**Preconditions:**
- Entity `sourceType` is set to `CALCULATED`
- Admin has access to the formula editor

---

#### Happy Path Flow

```
1. Admin is creating a new KPI: "Profit Margin %"
   sourceType = CALCULATED

2. In the formula section, Admin clicks "Ask AI 🤖" button

3. Modal opens:

   ┌────────────────────────────────────────────────────────────┐
   │ 🤖 Formula Builder                                          │
   │                                                             │
   │ Describe what you want to calculate:                        │
   │ ┌─────────────────────────────────────────────────────┐    │
   │ │ Net profit divided by total revenue, expressed      │    │
   │ │ as a percentage                                     │    │
   │ └─────────────────────────────────────────────────────┘    │
   │                                                             │
   │ Your variables so far:                                     │
   │ • NET_PROFIT (Number)                                      │
   │ • TOTAL_REVENUE (Number)                                   │
   │                                                             │
   │                              [Generate Formula]            │
   └────────────────────────────────────────────────────────────┘

4. AI generates:

   ┌────────────────────────────────────────────────────────────┐
   │ Generated Formula:                                          │
   │                                                             │
   │ (vars.NET_PROFIT / vars.TOTAL_REVENUE) * 100               │
   │                                                             │
   │ Explanation:                                               │
   │ Divides net profit by total revenue, then multiplies by    │
   │ 100 to express as a percentage.                            │
   │                                                             │
   │ Example:  NET_PROFIT=150,000  TOTAL_REVENUE=500,000        │
   │ Result:  (150,000 / 500,000) * 100 = 30%                   │
   │                                                             │
   │ Safety check: ✅ Formula passed safety validation           │
   │                                                             │
   │ [Insert into editor]  [Try again]                          │
   └────────────────────────────────────────────────────────────┘

5. Admin clicks "Insert into editor"
   → Formula inserted into Monaco editor
   → Admin runs the built-in test with sample values to verify
   → Admin saves the entity
```

---

#### Acceptance Criteria
- [ ] "Ask AI" button visible only when `sourceType = CALCULATED`
- [ ] AI output uses `vars.CODE` for defined variables and `get("KEY")` for cross-entity references
- [ ] Safety validation runs before "Insert" button is enabled (`isSafeFormula()` check)
- [ ] Example calculation shown with realistic numbers
- [ ] "Try again" allows Admin to refine the description without closing modal
- [ ] If Admin mentions an entity that exists in the org, AI uses `get("KEY")` syntax automatically
- [ ] Formula inserted at cursor position in Monaco (not replacing existing content unless empty)

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Description references a variable not yet created | AI adds the variable to the suggestion list with a note: "You'll need to add a variable named X" |
| Description is too vague ("calculate the score") | AI asks: "Could you be more specific about what inputs the score uses?" |
| Admin describes an unsafe operation (e.g., "fetch from external API") | AI returns: "I can only create formulas using numeric calculations. I cannot access external data sources." |
| Formula would divide by zero | AI adds a note: "Consider adding a zero-check: `vars.REVENUE !== 0 ? ... : 0`" |

**Phase:** 1 | **Priority:** P1

---

---

### AI-ADM-03 — Auto Arabic / English Translation

**As an** Admin  
**I want to** click a button to automatically fill Arabic fields when I've typed English content (or vice versa)  
**So that** every KPI and entity has complete bilingual data without me manually typing every Arabic translation

**Trigger:** Admin is filling out the entity create/edit form and clicks "Auto-translate"  
**Preconditions:**
- At least one language direction has content filled (EN or AR)
- Entity type allows bilingual fields

---

#### Happy Path Flow

```
1. Admin creates a new KPI and fills in English fields:
   Title (EN):       "Employee Retention Rate"
   Description (EN): "Percentage of employees who remain with the org over a 12-month period"
   Unit (EN):        "%"

2. Admin clicks "🌐 Auto-translate to Arabic" button
   (appears as a row of small buttons next to the AR input fields)

3. Translation runs (~1–2 seconds)

4. Arabic fields are populated:
   Title (AR):       "معدل الاحتفاظ بالموظفين"
   Description (AR): "نسبة الموظفين الذين يبقون في المنظمة على مدار فترة 12 شهراً"
   Unit (AR):        "%"

5. Fields are editable — Admin reviews and adjusts if needed

6. Admin saves the entity
```

---

#### Accepted Translation Fields

| English Field | Arabic Field Filled |
|---------------|-------------------|
| `title` | `titleAr` |
| `description` | `descriptionAr` |
| `unit` | `unitAr` |
| `variable.displayName` | `variable.nameAr` |
| `org.mission` | `org.missionAr` |
| `org.vision` | `org.visionAr` |
| `org.about` | `org.aboutAr` |

---

#### Acceptance Criteria
- [ ] Button appears next to every `*Ar` field on the form
- [ ] Translation fills only empty AR fields — does not overwrite existing AR content (without confirmation)
- [ ] If AR field already has content, show: "AR field already has content — overwrite?" confirmation
- [ ] Translation quality uses KPI domain terminology (not generic Google-translate style)
- [ ] Arabic output is MSA, right-to-left rendered
- [ ] AR → EN translation also works (button direction reverses)
- [ ] Translation is a suggestion — must be explicitly saved
- [ ] Fields marked "AI-translated — please review" until Admin edits or explicitly confirms

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Title is a proper noun or acronym | Transliterated, not translated: "KPI" stays as "KPI" |
| Unit is a currency (SAR, USD) | Not translated — kept as-is |
| Description is very long (> 500 chars) | Truncated translation with note to review |
| Both EN and AR already filled | Button shows "Re-translate?" with confirmation |

**Phase:** 1 | **Priority:** P1

---

---

### AI-ADM-04 — Governance Health Advisory Report

**As an** Admin  
**I want to** receive a weekly AI-generated governance health report  
**So that** I can proactively fix data quality issues before they affect executive reporting

**Trigger:** Weekly scheduled job (Monday 7:00 AM) OR Admin clicks "Generate Governance Report" in org settings  
**Preconditions:**
- Admin has `ADMIN` role
- Organization has at least 5 KPIs

---

#### Happy Path Flow

```
1. Admin opens the Organization settings page

2. Clicks "Generate Governance Report" button

3. AI generates report in ~10 seconds:

   ────────────────────────────────────────────
   GOVERNANCE HEALTH REPORT — Week of 3 March 2026
   Prepared by Rafed KPI AI
   ────────────────────────────────────────────

   DATA FRESHNESS                                    Status: ⚠️
   • 14 of 22 KPIs (64%) have approved values within the last 30 days ✅
   • 5 KPIs have not been updated in 31–60 days ⚠️
   • 3 KPIs have not been updated in over 90 days 🔴
     → Customer Satisfaction (owned by: Unassigned)
     → Cost Per Unit (owned by: Omar Al-Farouk)
     → Market Share (owned by: Unassigned)

   APPROVAL QUEUE                                    Status: 🔴
   • 9 values currently pending approval
   • Oldest pending: 14 days (Staff Turnover Rate — submitted by Sara Al-Nasser)
   • Average approval time this month: 8.4 days (↑ from 2.9 days last month)
   • Recommendation: Review approval workload distribution — one approver may be a bottleneck

   DATA COMPLETENESS                                 Status: ⚠️
   • 8 KPIs have no description (36% coverage gap)
   • 5 KPIs have no Arabic title
   • 4 KPIs have no assigned owner

   TOP RISKS
   1. 3 KPIs are unassigned — no owner means no accountability
   2. Approval turnaround has tripled — investigate approver availability
   3. Market Share KPI has never had a value entered (created 45 days ago)

   RECOMMENDED ACTIONS
   1. Assign owners to: Customer Satisfaction, Market Share, Cost Per Unit
   2. Contact Omar Al-Farouk re: overdue Cost Per Unit submission
   3. Escalate 14-day pending approval for Staff Turnover Rate
   ────────────────────────────────────────────

4. Admin can click each KPI name to navigate directly to it
5. Admin can click "Send to me via email" (future: email integration)
```

---

#### Acceptance Criteria
- [ ] Report covers: freshness, approval queue age, data completeness, unassigned KPIs
- [ ] Each issue item links to the relevant entity or user
- [ ] Report available in both Arabic and English
- [ ] Scheduled generation sends in-app notification to Admin
- [ ] Manual generation available on demand
- [ ] Report reflects only current org data (RBAC enforced)

**Phase:** 2 | **Priority:** P2

---

---

### AI-ADM-05 — Duplicate KPI Detection

**As an** Admin  
**I want to** be warned when I'm creating a KPI that is semantically similar to an existing one  
**So that** I avoid creating redundant KPIs that dilute focus and confuse users

**Trigger:** Admin types a KPI title in the create form (debounced at 800ms)  
**Preconditions:**
- Organization has at least 10 KPIs (enough for meaningful comparison)
- Embeddings are enabled (Phase 2)

---

#### Happy Path Flow

```
1. Admin types "Customer Satisfaction Index" in the title field

2. After 800ms, AI runs semantic similarity check against existing KPIs

3. A soft warning appears below the title field:

   ┌──────────────────────────────────────────────────────────┐
   │ 💡 Similar KPI exists                                    │
   │                                                          │
   │ "Customer Satisfaction Score" (CSAT) already exists.    │
   │ It measures: Percentage of satisfied customers (monthly) │
   │ Achievement: 84% | Owner: Sara Al-Nasser                │
   │                                                          │
   │ [View existing KPI]  [Continue creating new]            │
   └──────────────────────────────────────────────────────────┘

4a. Admin clicks "View existing KPI" → opens entity detail in new tab
4b. Admin clicks "Continue creating new" → warning dismissed, form continues
```

---

#### Acceptance Criteria
- [ ] Warning is advisory only — does not block creation
- [ ] Similarity threshold: cosine similarity > 0.85 triggers warning
- [ ] At most 2 similar KPIs shown (not a long list)
- [ ] Warning disappears if Admin clears the title field
- [ ] No warning shown if no similar KPI found
- [ ] Requires pgvector embeddings (Phase 2 dependency — gracefully hidden if not enabled)

**Phase:** 2 | **Priority:** P3
