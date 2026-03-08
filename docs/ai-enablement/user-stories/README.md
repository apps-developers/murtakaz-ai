# AI User Stories & Use Cases
## Rafed KPI — LLM Feature Stories by Role

This folder contains detailed user stories and use case flows for every AI feature in
Rafed KPI, organized by user role. Each story follows the standard format and includes
acceptance criteria, UI flow, edge cases, and the AI interaction design.

---

## Role Index

| File | Role | Stories Covered |
|------|------|----------------|
| [US-01](./US-01-executive-ai-analyst.md) | **EXECUTIVE / CEO** | Morning briefing chat, board report generation, at-risk early warning |
| [US-02](./US-02-manager-ai-assistant.md) | **MANAGER** | Value entry assist, anomaly warning, formula explanation, workload summary |
| [US-03](./US-03-admin-kpi-wizard.md) | **ADMIN** | KPI wizard, formula builder, auto-translate, governance health report |
| [US-04](./US-04-approver-anomaly-review.md) | **APPROVER** (Executive/Admin) | Anomaly-flagged review, rejection comment generator, queue prioritization |
| [US-05](./US-05-super-admin-org-intelligence.md) | **SUPER ADMIN** | Cross-org health chat, org onboarding assistant, usage dashboard |

---

## Story ID Convention

```
AI-[ROLE_CODE]-[NUMBER]

Role codes:
  EX  = Executive
  MGR = Manager
  ADM = Admin
  APR = Approver
  SA  = Super Admin

Examples:
  AI-EX-01  = Executive story #1
  AI-MGR-03 = Manager story #3
```

---

## Story Template

Each story follows this structure:

```
### [ID] — [Story Title]
**As a** [role]
**I want to** [action]
**So that** [business value]

**Trigger:** [What causes the user to need this feature]
**Preconditions:** [What must be true before this story can execute]

#### Happy Path Flow
Step-by-step interaction between user and AI

#### AI Interaction Design
Exact prompt input → expected output example

#### Acceptance Criteria
- [ ] Testable criteria 1
- [ ] Testable criteria 2

#### Edge Cases & Error Handling
- What happens when data is missing
- What happens when AI is unavailable

#### Phase / Priority
```

---

## Summary of All Stories

| Story ID | Title | Phase | Priority |
|----------|-------|-------|----------|
| AI-EX-01 | Morning Performance Briefing via Chat | 1 | P1 |
| AI-EX-02 | One-Click Board Report Generation | 1 | P1 |
| AI-EX-03 | At-Risk KPI Early Warning Alert | 3 | P1 |
| AI-EX-04 | Trend Forecast for Strategic KPI | 3 | P2 |
| AI-MGR-01 | Smart Value Entry Assist | 2 | P2 |
| AI-MGR-02 | Anomaly Warning Before Submission | 2 | P1 |
| AI-MGR-03 | Formula Explanation in Plain Language | 1 | P2 |
| AI-MGR-04 | Personal Workload & Deadline Summary | 1 | P1 |
| AI-MGR-05 | AI-Suggested Submission Note | 2 | P2 |
| AI-ADM-01 | KPI Definition Wizard | 2 | P1 |
| AI-ADM-02 | Formula Builder from Description | 1 | P1 |
| AI-ADM-03 | Auto Arabic/English Translation | 1 | P1 |
| AI-ADM-04 | Governance Health Advisory Report | 2 | P2 |
| AI-ADM-05 | Duplicate KPI Detection | 2 | P3 |
| AI-APR-01 | Anomaly-Flagged Approval Review | 2 | P1 |
| AI-APR-02 | AI-Suggested Rejection Comment | 2 | P2 |
| AI-APR-03 | Smart Queue Prioritization | 2 | P2 |
| AI-SA-01 | Cross-Org Performance Chat | 2 | P2 |
| AI-SA-02 | Org Onboarding Assistant | 2 | P2 |
| AI-SA-03 | Platform AI Usage Dashboard | 2 | P3 |
