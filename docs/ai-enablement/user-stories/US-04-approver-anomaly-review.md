# US-04 — Approver AI User Stories
## Role: EXECUTIVE / ADMIN (as Approver)

The Approver role reviews submitted KPI values and decides whether to approve, reject, or
request changes. AI assists them in making better, faster approval decisions by surfacing
anomalies, historical context, and structured rejection language — without replacing their judgment.

---

### AI-APR-01 — Anomaly-Flagged Approval Review

**As an** Approver  
**I want to** see an AI-generated context panel when reviewing a submitted value that looks anomalous  
**So that** I can make an informed approval decision with full historical context — not just the number in front of me

**Trigger:** Approver opens the approval review page for a value that was flagged as anomalous at submission time  
**Preconditions:**
- A value is in `SUBMITTED` status
- The value was flagged as anomalous (z-score > 2.5 from historical average) when submitted

---

#### Happy Path Flow

```
1. Approver opens the Approvals page
   → Sees list of pending submissions

2. One submission has an orange ⚠️ "Anomaly Flagged" badge next to it:
   "Customer Satisfaction Score — 12% — submitted by Sara Al-Nasser"

3. Approver clicks to open the review detail

4. At the top of the review panel, an AI context card is shown:

   ┌────────────────────────────────────────────────────────────┐
   │ 🤖 AI Review Context                              ⚠️ Flag  │
   │                                                            │
   │ Submitted value:  12%                                      │
   │ Historical average (6 months):  82%                        │
   │ Deviation:  70 points below average                        │
   │ Trend before this period: ↗ Gradually improving            │
   │                                                            │
   │ Last 6 approved values:                                    │
   │ Oct: 78%  Nov: 81%  Dec: 84%  Jan: 83%  Feb: 85%          │
   │ Mar (submitted): 12% ← unusually low                       │
   │                                                            │
   │ Manager's note:  "Significant decline due to service       │
   │ disruption on 15–17 February. Root cause under review."   │
   │                                                            │
   │ AI Assessment: This value is statistically unusual.       │
   │ However, the manager provided a plausible explanation.    │
   │ Consider requesting evidence (e.g., service log or         │
   │ incident report) before approving.                        │
   └────────────────────────────────────────────────────────────┘

5. Approver reviews the context and makes a decision:
   → [Approve]  [Reject with comment]  [Request clarification]

6a. Approver clicks [Approve]
    → Value moves to APPROVED status
    → Anomaly flag retained in audit log (for governance reporting)

6b. Approver clicks [Reject with comment]
    → See AI-APR-02 (Rejection Comment Generator)
```

---

#### Acceptance Criteria
- [ ] Anomaly context card shown only for values flagged at submission (not all submissions)
- [ ] Context card shows: submitted value, historical average, last 6 approved values, deviation, trend direction
- [ ] Manager's submission note is prominently displayed
- [ ] AI Assessment is advisory — Approver can approve regardless
- [ ] Approver can dismiss/collapse the AI card if they find it distracting
- [ ] Anomaly flag and AI assessment retained in `AiInteraction` audit log after decision
- [ ] Context card renders correctly in both AR and EN
- [ ] No AI context card shown for non-anomalous submissions (clean submissions stay clean)

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Manager provided no note for anomalous value | AI Assessment emphasizes: "No explanation was provided — strongly consider requesting clarification." |
| Anomaly is positive (value much higher than average) | Card shows: "Value is unusually HIGH. This may indicate exceptional performance or a data entry error." |
| First-ever value (no history) | No anomaly card — cannot assess without baseline |
| Multiple anomalous values in the same period | Each reviewed independently |

**Phase:** 2 | **Priority:** P1

---

---

### AI-APR-02 — AI-Suggested Rejection Comment

**As an** Approver  
**I want to** get a structured, professional rejection comment suggested by AI  
**So that** I can give the Manager clear, actionable feedback quickly — without writing from scratch each time

**Trigger:** Approver clicks "Reject" on a submission  
**Preconditions:**
- A value is in `SUBMITTED` status
- Approver has clicked the Reject action

---

#### Happy Path Flow

```
1. Approver is reviewing an anomalous submission (12% CSAT — AI-APR-01 scenario)
   → Decides to reject

2. Approver clicks [Reject with comment]

3. Rejection dialog opens with an AI-suggested comment pre-populated:

   ┌────────────────────────────────────────────────────────────┐
   │ Rejection Reason                                           │
   │                                                            │
   │ AI Suggestion:                                             │
   │ ┌──────────────────────────────────────────────────────┐  │
   │ │ The submitted value of 12% represents a significant  │  │
   │ │ deviation from the 6-month average of 82% (a drop   │  │
   │ │ of 70 percentage points). While the note references  │  │
   │ │ a service disruption, additional documentation is    │  │
   │ │ required before approval:                            │  │
   │ │                                                      │  │
   │ │ 1. Please attach the service incident report or     │  │
   │ │    ticket system export covering 15–17 February.   │  │
   │ │ 2. Confirm whether the survey sample was impacted   │  │
   │ │    (reduced sample size can skew results).          │  │
   │ │ 3. Resubmit with updated documentation.             │  │
   │ └──────────────────────────────────────────────────────┘  │
   │                                                            │
   │ [Edit this comment]  [Use as-is]  [Write my own]          │
   │                                                            │
   │ Arabic version:  [Show ▼]                                  │
   └────────────────────────────────────────────────────────────┘

4. Approver reviews, optionally edits, and clicks [Confirm Rejection]

5. Value returns to DRAFT status
   Manager receives a notification with the rejection comment
   Comment is stored on `EntityValue` for audit trail
```

---

#### AI Suggestion Logic

The AI generates the rejection comment using:
- KPI name and description
- Submitted value vs. historical average
- Magnitude and direction of deviation
- Manager's note (if provided)
- Anomaly type (spike / drop / flat line)

The generated comment is always structured:
1. **Observation** — what was found
2. **Required evidence** — what is needed to support the value
3. **Action required** — what the Manager must do to resubmit

---

#### Acceptance Criteria
- [ ] AI suggestion pre-populated in rejection dialog when Reject is clicked
- [ ] Approver can edit the suggestion before submitting
- [ ] Approver can discard suggestion and write their own
- [ ] Arabic version generated alongside English version
- [ ] Rejection comment stored on `EntityValue.note` or a dedicated rejection field
- [ ] Manager receives notification with the full comment text
- [ ] Rejection comment visible to Manager on the entity value history page
- [ ] If no anomaly data exists (no history), AI generates a generic structured template

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Rejecting a non-anomalous value | AI generates a generic template: "Please provide supporting documentation for this value." |
| Approver rejects for a reason unrelated to the anomaly (e.g., wrong period) | "Write my own" option lets them override completely |
| Same KPI rejected 3+ times in a row | AI note: "This KPI has been rejected multiple times. Consider scheduling a call with the manager." |

**Phase:** 2 | **Priority:** P2

---

---

### AI-APR-03 — Smart Queue Prioritization

**As an** Approver  
**I want to** see my approval queue sorted by risk — with anomalous and overdue items first  
**So that** I can focus my attention on submissions that most need careful review

**Trigger:** Approver opens the Approvals page  
**Preconditions:**
- Approver has at least 3 items in their approval queue

---

#### Happy Path Flow

```
1. Approver opens the Approvals page
   → Default view shows submissions in submission-date order

2. AI Priority Sort is enabled by default (toggle in top-right):
   [Sort: AI Priority ▼]  ↔  [Sort: Date Submitted]

3. Queue is sorted into priority tiers with section headers:

   ┌────────────────────────────────────────────────────────────┐
   │ 🔴 Needs Careful Review (2)                                │
   ├────────────────────────────────────────────────────────────┤
   │ ⚠️ Customer Satisfaction Score — Sara Al-Nasser            │
   │    Submitted value 12% — 70pts below average — 3 days ago  │
   │                                                   [Review] │
   ├────────────────────────────────────────────────────────────┤
   │ ⚠️ Staff Turnover Rate — Omar Al-Farouk                    │
   │    Submitted value 28% — above target — 14 days ago ← OLD  │
   │                                                   [Review] │
   ├────────────────────────────────────────────────────────────┤
   │ ✅ Standard Review (5)                                     │
   ├────────────────────────────────────────────────────────────┤
   │ Revenue Growth — Ahmed Al-Rashidi     — submitted 1 day ago│
   │ Training Hours — Fatima Al-Zahrani    — submitted 2 days ago│
   │ ... (3 more)                                               │
   └────────────────────────────────────────────────────────────┘

4. Approver works through "Needs Careful Review" first
```

---

#### Priority Scoring Logic

AI assigns each submission a priority score based on:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Anomaly flag | 40% | Binary: flagged = high priority |
| Days waiting | 30% | > 7 days = high, > 3 days = medium |
| KPI weight | 20% | Higher weight entity → higher priority |
| Achievement delta | 10% | Larger drop from target → higher priority |

---

#### Acceptance Criteria
- [ ] Default sort is AI Priority (toggleable back to date order)
- [ ] "Needs Careful Review" tier shows all anomaly-flagged + overdue (> 7 days) submissions
- [ ] Each item shows: submitter, submitted value, days waiting, anomaly badge if flagged
- [ ] Approver can switch to date-order sort at any time
- [ ] Priority recalculates when new submissions arrive (not cached stale order)
- [ ] Priority sort visible in both AR and EN with RTL support

#### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| All submissions are anomalous | All in "Needs Careful Review" — no standard tier shown |
| No submissions | "Your approval queue is empty. ✅" |
| New submission arrives while Approver is on page | Badge updates without page refresh (polling every 30s) |

**Phase:** 2 | **Priority:** P2

---

---

## Use Case Diagram — Approver AI Interactions

```
                    ┌─────────────────────┐
                    │      APPROVER        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
   │  AI-APR-03      │ │  AI-APR-01   │ │  AI-APR-02     │
   │  Smart Queue    │ │  Anomaly     │ │  Rejection     │
   │  Prioritization │ │  Context     │ │  Comment       │
   │                 │ │  Card        │ │  Generator     │
   └────────┬────────┘ └──────┬───────┘ └───────┬────────┘
            │                 │                  │
            ▼                 ▼                  ▼
   Sees risky items    Understands why    Writes structured
   first in queue      value is unusual   feedback to manager
            │                 │                  │
            └─────────────────┴──────────────────┘
                               │
                               ▼
                    Makes informed decision:
                    APPROVE / REJECT / REQUEST CLARIFICATION
```
