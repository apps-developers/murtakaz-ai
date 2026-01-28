# Murtakaz — Features

## What “Entities” Means

In Murtakaz, **entities** are the configurable building blocks (business objects) your organization uses to model its work.

- **Flexible by design**: each organization can define which entity types it needs, rename them, and order them.
- **Connected**: entities can be linked in a hierarchy and can also reference/depend on each other.
- **Governed**: entities and their metric updates can follow approval and audit rules.

## Non-Technical / Business Features
- **Configurable strategy execution framework**
  - Built around configurable “entities” and a configurable hierarchy, so each organization can model what it needs (and hide what it doesn’t).
- **Highly adaptable / dynamic for different organizations**
  - Uses configurable organization entity types (so it can fit different company structures and methodologies).
- **Clear drill-down traceability**
  - Drill down from high-level views into the underlying items and metrics, designed to reduce manual reporting and ambiguity.
- **Strong governance model**
  - Change requests + approvals flow (governance queue, approve/reject, audit visibility).
- **Role-based experience for different personas**
  - Admin, Executive, Manager, (with different navigation + access scope).
- **KPI governance & consistency**
  - KPI definitions include owner, target, unit, period type, direction, aggregation, and formula-driven KPIs.
- **Automated calculations**
  - Supports calculated/derived metrics using formulas, variables, and references to other metrics.
- **Tree / dependency visualization**
  - A graph view makes dependencies and relationships easy to understand.
- **Advanced dashboards**
  - Executive-grade dashboards with “needs attention” patterns (stale KPIs, at-risk initiatives, approval aging, etc.).
- **Bilingual experience**
  - English + Arabic with proper RTL support and Arabic labels across the UI.

---

## Technical Features
- **Secure access & protected workspace**
  - Sign-in is required for the workspace, and protected pages redirect to login when not authenticated.
- **Multi-organization ready**
  - Data and settings are scoped per organization, with an elevated role for organization administration.
- **Role-based access control**
  - Users see only what they are allowed to see, with support for manager/subordinate visibility.
- **Configurable entities and navigation**
  - Each organization can define its own entity types and ordering, and the UI adapts automatically.
- **Formula engine (advanced calculations)**
  - Supports formulas, variables, weighted scoring, and references between metrics.
- **Approvals workflow**
  - Metric updates can follow a draft → submit → approve/lock flow depending on organization rules.
- **Interactive dashboards**
  - Dashboards are generated from system data and calculated insights (health, freshness, trends, and attention queues).
- **Bilingual UI + RTL support**
  - English and Arabic support with correct RTL layout behavior.
- **Prototype mode data persistence**
  - In the prototype, edits persist locally in the browser so you can demo without a backend.
