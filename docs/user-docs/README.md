# Rafed KPI — User Documentation

Welcome to the user guide for **Rafed KPI**, a Strategy Execution & Performance Management System. This documentation covers everything you need to know to use the platform effectively, from signing in to reviewing dashboards and approving KPI updates.

---

## Table of Contents

| # | Document | Description |
|---|----------|-------------|
| 1 | [Getting Started](./01-getting-started.md) | Sign in, language switching, primary navigation |
| 2 | [Roles & Permissions](./02-roles-and-permissions.md) | What each role can see and do |
| 3 | [Overview Page](./03-overview-page.md) | Reading your personalized executive summary |
| 4 | [Entities & KPIs](./04-entities-and-kpis.md) | Browsing, creating, and editing KPIs and strategy items |
| 5 | [Entering KPI Values](./05-entering-kpi-values.md) | Draft → Submit → Approve data entry workflow |
| 6 | [Approvals](./06-approvals.md) | Reviewing and deciding on submitted KPI values |
| 7 | [Dashboards](./07-dashboards.md) | All available dashboards and how to read them |
| 8 | [Admin Guide](./08-admin-guide.md) | Managing users, organizations, and settings |
| 9 | [Glossary](./09-glossary.md) | Key terms and concepts used throughout the system |

---

## Quick-Start Summary

1. **Sign in** at `/<locale>/auth/login` with your organizational credentials.
2. Your landing page is the **Overview** — a personalized health snapshot.
3. Navigate using the **left sidebar**: Overview → Entities (KPIs) → Approvals → Dashboards.
4. Your access level is determined by your **role** (Admin, Executive, Manager, or Employee).
5. KPI data flows through a **Draft → Submit → Approve** lifecycle before it counts.
6. The **bell icon** (🔔) in the header shows pending approval notifications in real time.

---

## System Concepts at a Glance

```
Organization
 └── Entity Types  (e.g. Strategy, Objective, KPI)
      └── Entities  (individual records)
           │   ├── Direction (INCREASE_IS_GOOD / DECREASE_IS_GOOD)
           │   ├── Indicator Type (LEADING / LAGGING)
           │   └── Value Range (Min Value / Max Value)
           └── Entity Values  (periodic measurements)
                └── Approval Workflow  (Draft → Submitted → Approved/Locked)
                     └── Notifications  (bell icon, auto-dispatched)
```

- **Entities** are the configurable building blocks — each organization defines its own types (e.g., Strategic Pillar, Initiative, KPI).
- **Entity Values** are the actual data points (numeric measurements) entered against an entity over time.
- **Approvals** control which values become official — based on the organization's configured approval level.
- **Notifications** are automatically dispatched to eligible approvers on submission, and to submitters on approve/reject.
- **RAG thresholds** (Green ≥ 75%, Amber ≥ 50% by default) are configurable per organization in Organization Settings.

---

## Languages

The system supports both **English** (LTR) and **Arabic** (RTL). Switch language via the locale prefix in the URL (`/en/...` or `/ar/...`) or the language toggle in the UI.
