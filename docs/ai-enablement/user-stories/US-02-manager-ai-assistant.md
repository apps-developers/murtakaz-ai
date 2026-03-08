# US-02 — Manager AI User Stories
## Role: MANAGER

The Manager role enters KPI values, submits them for approval, and monitors their assigned
entities. They are the primary data contributors. AI assists them in entering accurate values
faster, understanding their performance, and knowing what to focus on each day.

---

### AI-MGR-01 — Smart Value Entry Assist

**As a** Manager  
**I want to** see AI-powered context when I open the value entry form  
**So that** I can catch potential errors before submitting and understand what a normal value looks like

**Trigger:** Manager opens the value entry form on an entity detail page  
**Preconditions:**
- Manager has at least one assigned entity with `DRAFT` status
- Entity has at least 2 previous approved values (for baseline comparison)

---

#### Happy Path Flow

```
1. Manager navigates to entity detail page for "Customer Satisfaction Score"
   → Value entry section is visible

2. Before Manager types anything, AI context panel appears below the input:

   ┌─────────────────────────────────────────────────────────────┐
   │ 🤖 AI Context                                                │
   │ Last month: 84%  |  6-month avg: 82%  |  Target: 85%       │
   │ Expected range this period: 79% – 90%                       │
   │ Trend: ↗ Gradually improving                                │
   └─────────────────────────────────────────────────────────────┘

3. Manager enters a value: 41

4. AI immediately shows warning (inline, below the input):

   ┌─────────────────────────────────────────────────────────────┐
   │ ⚠️  Unusual Value Detected                                  │
   │ 41% is 43 points below your 6-month average of 82%.        │
   │ This is outside the expected range (79%–90%).               │
   │ If this is correct, please add a note explaining the drop. │
   │                                                             │
   │ [This is correct — I'll add a note]  [Let me re-check]     │
   └─────────────────────────────────────────────────────────────┘

5a. Manager clicks "This is correct — I'll add a note"
    → Note field is highlighted / focused
    → AI suggests note text (see AI-MGR-05)

5b. Manager clicks "Let me re-check"
    → Warning dismissed, value field cleared
```

---

#### Acceptance Criteria
- [ ] AI context panel shows last value, 6-month average, expected range, and trend
- [ ] Warning triggers when entered value is > 2 standard deviations from historical average
- [ ] Warning appears within 1 second of value entry (debounced at 800ms)
- [ ] Warning message is bilingual (matches user's locale preference)
- [ ] Warning does not block submission — it is advisory only
- [ ] If < 2 historical values exist, show: "Not enough history for comparison yet"
- [ ] Context panel does not appear for MANUAL KPIs with no history

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| First-ever value entry (no history) | No AI context shown; show "First entry for this KPI — no baseline available" |
| KPI with direction=DECREASE_IS_GOOD and value lower than average | Show green confirmation: "This value represents an improvement" |
| Value exactly at target | Show: "✅ This value meets the target exactly (100% achievement)" |
| Formula KPI (variables, not manual input) | AI context shown per variable, not final value |

**Phase:** 2 | **Priority:** P2

---

---

### AI-MGR-02 — Anomaly Warning Before Submission

**As a** Manager  
**I want to** be warned if my submitted value looks anomalous before I submit  
**So that** I don't accidentally submit incorrect data that wastes the approver's time

**Trigger:** Manager clicks "Submit for Approval" button  
**Preconditions:**
- Entity has at least 3 previous approved values
- Submitted value is statistically anomalous (z-score > 2.5)

---

#### Happy Path Flow

```
1. Manager clicks "Submit for Approval" for a value of 12%
   (Historical average: 84%, std dev: 6%)

2. Before submission is processed, a confirmation dialog appears:

   ┌──────────────────────────────────────────────────────────────┐
   │  ⚠️ Review Before Submitting                                  │
   │                                                               │
   │  The value you're about to submit (12%) is significantly     │
   │  different from recent history:                              │
   │                                                               │
   │  • Last period: 84%                                          │
   │  • 6-month average: 82%                                      │
   │  • Your value: 12% (70 points below average)                 │
   │                                                               │
   │  This may be correct if there was a major event this period. │
   │  The approver will also see this warning.                    │
   │                                                               │
   │  ✏️ Note (optional but recommended):                         │
   │  [_______________________________________________]            │
   │                                                               │
   │  [Cancel — go back]    [Submit anyway]                       │
   └──────────────────────────────────────────────────────────────┘

3a. Manager adds a note and clicks "Submit anyway"
    → Value submits with SUBMITTED status + note attached
    → Anomaly flag is stored on the EntityValue record for approver

3b. Manager clicks "Cancel — go back"
    → Dialog closes, value entry form still open
    → Manager can edit the value
```

---

#### Acceptance Criteria
- [ ] Anomaly check runs server-side on submit (not just client-side)
- [ ] Anomaly threshold: value > 2.5 std deviations from last 6 approved values
- [ ] Dialog is non-blocking — Manager CAN submit even with warning
- [ ] Note field in dialog pre-populated with AI suggestion (AI-MGR-05)
- [ ] Anomaly flag stored on `EntityValue` so approver also sees it
- [ ] Warning shown in both AR and EN based on locale
- [ ] No warning shown if insufficient history (< 3 values)

**Phase:** 2 | **Priority:** P1

---

---

### AI-MGR-03 — Formula Explanation in Plain Language

**As a** Manager  
**I want to** understand what a calculated KPI's formula actually means in plain language  
**So that** I can correctly enter the input variables and understand what I'm measuring

**Trigger:** Manager opens a CALCULATED entity detail page and clicks "Explain Formula"  
**Preconditions:**
- Entity has `sourceType = CALCULATED` with a non-empty formula
- Manager is assigned to this entity

---

#### Happy Path Flow

```
1. Manager opens entity: "Net Profit Margin"
   Formula: (vars.REVENUE - vars.COST) / vars.REVENUE * 100

2. Manager clicks "Explain this formula" (link below the formula display)

3. AI generates explanation (inline, no modal needed):

   ┌──────────────────────────────────────────────────────────────┐
   │ 🤖 Formula Explanation                                        │
   │                                                               │
   │ This KPI calculates Net Profit Margin as a percentage.       │
   │                                                               │
   │ It works like this:                                          │
   │ 1. Subtract your total costs (COST) from your revenue        │
   │    (REVENUE) to get net profit.                              │
   │ 2. Divide that by total revenue to get the profit ratio.     │
   │ 3. Multiply by 100 to express it as a percentage.            │
   │                                                               │
   │ Example:                                                     │
   │   Revenue = 500,000 SAR | Cost = 350,000 SAR                 │
   │   Net Profit = 150,000 SAR                                   │
   │   Margin = (150,000 ÷ 500,000) × 100 = 30%                  │
   │                                                               │
   │ Direction: Higher % = better performance                     │
   └──────────────────────────────────────────────────────────────┘

4. Arabic toggle shows same explanation in Arabic
```

---

#### Acceptance Criteria
- [ ] Explanation renders inline on the entity detail page (no navigation away)
- [ ] Explanation includes a concrete numeric example using realistic values
- [ ] Direction (higher/lower is better) is always stated
- [ ] Arabic explanation uses correct MSA financial terminology
- [ ] Explanation cached per formula (same formula → same explanation without re-calling LLM)
- [ ] Works for cross-entity formulas using `get("KEY")` syntax — explains what the referenced entity is

**Phase:** 1 | **Priority:** P2

---

---

### AI-MGR-04 — Personal Workload & Deadline Summary

**As a** Manager  
**I want to** get a daily AI summary of what I need to do today regarding my KPIs  
**So that** I never miss a submission deadline or leave stale data unattended

**Trigger:** Manager logs in — shown on Overview page, or via chat "What do I need to do today?"  
**Preconditions:**
- Manager has at least one assigned entity

---

#### Happy Path Flow

```
1. Manager logs in and lands on the Overview page

2. A personalized AI card appears at the top:

   ┌──────────────────────────────────────────────────────────────┐
   │ 🤖 Your AI Briefing — Wednesday, 5 March 2026                │
   │                                                               │
   │ You have 8 assigned KPIs. Here's what needs attention:       │
   │                                                               │
   │ 🔴 Overdue (submit now):                                     │
   │   • Customer Satisfaction Score — 45 days since last update  │
   │   • Cost Per Unit — no value entered this quarter            │
   │                                                               │
   │ ⏰ Due this week:                                            │
   │   • Employee Training Hours — monthly KPI, 4 days remaining  │
   │   • Process Compliance Rate — quarterly KPI, due 9 March     │
   │                                                               │
   │ ✅ Up to date (4 KPIs):                                      │
   │   Revenue, CSAT, Onboarding Rate, Project Delivery Rate      │
   │                                                               │
   │ ⏳ Awaiting approval (1 pending):                            │
   │   • Staff Turnover Rate — submitted 3 days ago               │
   └──────────────────────────────────────────────────────────────┘

3. Each KPI name is a clickable link to its entity detail page

4. Manager can also ask via chat:
   "What KPIs do I need to update this month?"
   → Same information via chat response
```

---

#### Acceptance Criteria
- [ ] Summary scoped to Manager's assigned entities only (RBAC enforced)
- [ ] "Overdue" = KPIs past their period end with no submitted value
- [ ] "Due this week" = KPIs whose period ends within 7 days
- [ ] "Awaiting approval" = values in SUBMITTED status
- [ ] All KPI names are clickable links
- [ ] Card is dismissible for the current session
- [ ] Arabic version shows same information in RTL layout
- [ ] If all KPIs are up to date: "✅ All your KPIs are up to date. Great work!"

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Manager has no assigned KPIs | "You have no assigned KPIs yet. Contact your administrator." |
| All KPIs are up to date | Positive message, no action required section |
| Manager has 0+ DRAFT values (started but not submitted) | Show under "In progress — don't forget to submit" |

**Phase:** 1 | **Priority:** P1

---

---

### AI-MGR-05 — AI-Suggested Submission Note

**As a** Manager  
**I want to** get an AI-suggested note explaining an unusual KPI value  
**So that** I can submit a meaningful explanation quickly without spending time writing from scratch

**Trigger:** Manager enters an anomalous value (triggers AI-MGR-02) OR manually clicks "Suggest note"  
**Preconditions:**
- Note field is visible on value entry form
- Value has been entered (manual or calculated)

---

#### Happy Path Flow

```
1. Manager has entered value 41% for Customer Satisfaction Score
   (Historical average: 82% — anomaly detected)

2. Note field shows a "Suggest note" button:

   Note: [_________________________________] [🤖 Suggest note]

3. Manager clicks "Suggest note"

4. AI generates suggestion (streamed into the note field):

   "Significant decline in Customer Satisfaction Score this period (41% vs 82%
   average). Possible contributing factors: service disruption on 15–17 February
   affecting approximately 30% of customers, and delayed resolution of ticket
   backlog. Root cause analysis in progress with Customer Service team."

5. Manager reads, edits if needed, then submits
```

---

#### Acceptance Criteria
- [ ] "Suggest note" button appears when entered value is anomalous or note field is empty
- [ ] AI suggestion draws on: KPI name, previous values, trend, magnitude of change
- [ ] Suggestion is editable before submission — not auto-saved
- [ ] Note is stored verbatim (what the Manager types, not what AI suggested)
- [ ] Arabic locale → Arabic suggestion; English locale → English suggestion
- [ ] Suggestion limited to 200 words

**Phase:** 2 | **Priority:** P2
