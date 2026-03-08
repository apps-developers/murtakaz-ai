# Glossary

Key terms and concepts used throughout Rafed KPI.

---

## A

**Achievement Value**
A computed percentage showing how close a KPI's actual value is to its target. Formula: `(Actual / Target) × 100` for `INCREASE_IS_GOOD`, or `(Target / Actual) × 100` for `DECREASE_IS_GOOD`.

**Aggregation Method**
How multiple value entries are combined for reporting. Options: `LAST_VALUE`, `SUM`, `AVERAGE`, `MIN`, `MAX`.

**ADMIN**
A user role with full access to all entities, users, and settings within an organization.

**ApprovalStatus**
The current state of a change request or value: `PENDING`, `APPROVED`, or `REJECTED`.

**Assignment** → see *User–Entity Assignment*

---

## B

**Baseline Value**
The starting reference measurement for a KPI, used to contextualize progress. Set when the entity is created.

---

## C

**CALCULATED** (Source Type)
An entity whose value is computed automatically by the system using a user-defined **formula** and **variables**.

**Change Request**
A formal request to change an entity's configuration (e.g., target value, formula). Goes through an approval flow before taking effect.

**Coverage Snapshot**
The panel on the Overview page showing total KPIs, pending approvals, and the overall health percentage.

---

## D

**DERIVED** (Source Type)
An entity whose value is automatically taken from another entity's value, creating a dependency relationship.

**Direction**
A KPI attribute indicating whether increasing or decreasing the value is favorable:
- `INCREASE_IS_GOOD` — higher is better (e.g., revenue, satisfaction)
- `DECREASE_IS_GOOD` — lower is better (e.g., error rate, churn)

**Draft**
The initial status of a value entry. A Draft is private and not yet submitted for approval.

---

## E

**Entity**
The universal data object in the system. Can represent a KPI, strategic pillar, initiative, objective, project, or any other concept defined by the organization's entity types.

**Entity Type** → see *OrgEntityType*

**Entity Value**
A single data point (measurement) recorded against an entity for a specific period. Goes through the lifecycle: Draft → Submitted → Approved → Locked.

**EntityVariable**
An input variable defined on a CALCULATED entity. Each variable has a code, name, and data type, and its value is entered per measurement period.

**EXECUTIVE**
A user role with read-only access to all organization data and dashboards. May approve KPI values if the org approval level is set to EXECUTIVE.

---

## F

**Final Value**
The resolved value for a KPI entry. Computed as: `finalValue` (if set) → `calculatedValue` → `actualValue`.

**Formula**
A mathematical expression used on CALCULATED entities to derive the output value from input variables (e.g., `(revenue - cost) / revenue * 100`).

**Freshness**
A measure of how recently a KPI has had a value entered and approved. Used in the health score and the Organizational Health donut chart on the Overview page.

---

## H

**Health**
A system-calculated score reflecting how well an entity or the whole organization is performing relative to targets and data freshness. Displayed as a percentage and color-coded:
- 🟢 Green: ≥ 75%
- 🟡 Amber: 50–74%
- 🔴 Red: < 50%

---

## K

**KPI (Key Performance Indicator)**
A measurable value that demonstrates how effectively an organization is achieving a key objective. In this system, KPIs are represented as **entities** of a KPI-type.

**KPI Approval Level**
An organization-level setting that determines which user role is the designated approver for submitted KPI values. Options: `MANAGER`, `EXECUTIVE`, `ADMIN`.

**KPI Period Type**
The measurement cadence for a KPI: `MONTHLY`, `QUARTERLY`, or `YEARLY`.

**KpiValueStatus**
The lifecycle status of an entity value entry: `DRAFT`, `SUBMITTED`, `APPROVED`, `LOCKED`.

---

## L

**Locale**
The language/regional setting for the UI. Supported: `en` (English, LTR) and `ar` (Arabic, RTL). Controlled by the URL prefix.

**Locked**
The terminal status of an approved entity value. A locked value cannot be changed and is permanently part of the official record.

---

## M

**MANAGER**
A user role that can enter and submit KPI values for their assigned entities. May approve values if the org KPI approval level is set to MANAGER.

**MANUAL** (Source Type)
An entity where a user directly types in a numeric value each period.

---

## N

**Needs Attention**
A section on the Overview page listing KPIs that have not been updated recently, ranked by staleness. Used to identify data entry gaps.

---

## O

**Organization**
The top-level tenant in the system. All users, entities, and settings are scoped to an organization. A user belongs to exactly one organization.

**OrgEntityType**
An organization-specific entity type definition. Each org configures its own types (e.g., "Strategic Pillar", "Initiative", "KPI") with a code, display name, and sort order.

**Owner**
The user assigned as responsible for an entity (`ownerUserId`). Owners receive attribution in dashboards and reporting.

---

## P

**Period Type** → see *KPI Period Type*

**Pending**
A value or change request that has been submitted but not yet approved or rejected.

---

## R

**RAG**
Red / Amber / Green — a color-coded health status system. See **Health**.

**Role**
A system attribute assigned to each user that controls their access level. Available roles: `SUPER_ADMIN`, `ADMIN`, `EXECUTIVE`, `MANAGER`.

---

## S

**SCORE** (Source Type)
A composite entity whose value is an aggregated score derived from multiple child entities, typically using weights.

**Soft Delete**
When an entity or user is "deleted" in the UI, it is marked with a `deletedAt` timestamp but not physically removed from the database. This preserves audit history.

**Status**
The current lifecycle state of an entity: `PLANNED`, `ACTIVE`, `AT_RISK`, or `COMPLETED`.

**SUBMITTED**
A value entry status indicating the data has been sent for approval review and is awaiting a decision.

**SUPER_ADMIN**
A platform-level administrative role with access to all organizations and system-level settings.

---

## T

**Target Value**
The goal numeric value for a KPI. Used to calculate achievement percentage and health scores.

---

## U

**Unit**
The measurement unit of a KPI's value (e.g., `%`, `SAR`, `Count`, `Days`). Displayed alongside values in the UI.

**User–Entity Assignment** (`UserEntityAssignment`)
A link between a user and an entity granting the user visibility and data-entry access to that specific entity. Used to scope MANAGER-role users to their relevant KPIs.

---

## V

**Variable** → see *EntityVariable*

**Value Entry** → see *Entity Value*

---

## W

**Weight**
An optional numeric attribute on an entity used when calculating a parent SCORE entity. Determines how much this entity contributes to the aggregate.
