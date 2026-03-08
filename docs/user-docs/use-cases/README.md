# Use Cases & User Journeys — Rafed KPI

This folder contains detailed use cases and end-to-end user journeys for the Rafed KPI platform. Each use case describes a real scenario a user performs, including the full journey, step-by-step flow, alternative paths, and business rules.

---

## Available Languages

| Language | Folder |
|----------|--------|
| English | [`./en/`](./en/) |
| Arabic | [`./ar/`](./ar/) |

---

## Use Cases Index

| ID | Title | Primary Actor | Priority |
|----|-------|--------------|----------|
| [UC-01](./en/UC-01-manager-enters-kpi-value.md) | Manager enters a KPI value | Manager | High |
| [UC-02](./en/UC-02-executive-reviews-dashboard.md) | Executive reviews strategic performance dashboards | Executive | High |
| [UC-03](./en/UC-03-admin-creates-kpi.md) | Admin creates a new KPI entity | Admin | High |
| [UC-04](./en/UC-04-approver-reviews-submission.md) | Approver reviews and decides on a submitted KPI value | Approver | High |
| [UC-05](./en/UC-05-admin-onboards-new-user.md) | Admin onboards a new user | Admin | Medium |
| [UC-06](./en/UC-06-super-admin-creates-organization.md) | Super Admin creates a new organization | Super Admin | Medium |
| [UC-07](./en/UC-07-manager-monitors-responsibilities.md) | Manager monitors responsibilities and KPI health | Manager | Medium |

---

## Use Case Structure

Each use case file follows this structure:

```
## Use Case Summary         — ID, actors, trigger, pre/postconditions
## User Journey             — Visual flowchart of the end-to-end journey
## Main Flow                — Numbered step-by-step walkthrough
## Alternative Flows        — Edge cases and variant paths
## Business Rules           — Constraints and logic that govern the use case
## Screens Involved         — Page names and URL patterns
```

---

## Actor Summary

| Actor | Role | Typical Use Cases |
|-------|------|-------------------|
| **Manager** | Enters KPI data; monitors their portfolio | UC-01, UC-07 |
| **Executive** | Reviews performance; approves values (if configured) | UC-02, UC-04 |
| **Admin** | Manages KPIs, users, organization settings | UC-03, UC-04, UC-05 |
| **Approver** | Reviews and approves/rejects submitted values | UC-04 |
| **Super Admin** | Platform-level: creates/manages organizations | UC-06 |
