# Mosa Group - Raw Data Overview

This folder contains the raw data for the Mosa Group strategic framework, including pillars, strategic goals (objectives), initiatives, departments, and their KPI definitions/references.

## Data Structure Summary

### Files

- **`pillars.json`**
  - Maps strategic pillars to strategic goals (`goal_id`)
- **`objectives.json`**
  - Defines the 7 strategic goals and their objective KPIs
- **`initiatives.json`**
  - Defines initiatives, links them to goals, and lists their KPI references
- **`deprtments/`**
  - Contains one JSON file per department and its KPI definitions

### Current counts (computed from JSON)

- **Strategic goals**: 7
- **Objective KPIs**: 29
- **Initiatives**: 11
- **Initiative KPI references**: 37
  - Operational initiative KPIs: 23 (unique)
  - Linked KPI references: 14 (references to existing objective/department KPIs)
- **Departments**: 8
- **Department KPIs**: 66

## Naming Conventions (formula-safe codes)

### Objective KPI codes

- **Objective KPI code field**: `kpi_code`
- **Format**: `objective_kpi_<goal>_<indicator>`
- **Example**: objective KPI `7.3` => `objective_kpi_7_3`

### Initiative codes

- **Initiative code field**: `initiative_code`
- **Format**: `initiative_<initiative_id>_<slug>`
- **Example**: `initiative_11_develop_and_activate_digital_transformation_strategy`

### Initiative KPI codes

- **Initiative KPI code field**: `kpi_code`
- **Operational initiative KPIs**: `initiative_<initiative_id>_kpi_<n>`
- **Linked initiative KPIs**: reuse existing variable names (`objective_kpi_*` or `<dept>_dept_kpi_*`)

### Department KPI codes

- **Department KPI code field**: `kpi_code`
- **Format**: `<dept>_dept_kpi_<n>`
- **Department prefixes**:
  - `strategy`
  - `investment`
  - `finance`
  - `support_services`
  - `internal_audit`
  - `governance`
  - `communication`
  - `legal`

## Formulas

### Strategic goal formulas (`objectives.json`)

- Each goal has `formula` and `formula_description`.
- The formula is the weighted average of its objective KPIs.
- Linked initiatives are intentionally included as `initiative_* * 0` so they are referenced but do not affect calculations.

### Initiative formulas (`initiatives.json`)

- Each initiative has `formula` and `formula_description`.
- The formula currently uses an average of the initiative's KPI codes (operational + linked references).

### Department formulas (`deprtments/*.json`)

- Each department file includes top-level `formula` and `formula_description`.
- The formula is a weighted average using each KPI's `weight`.
- Note: `support-services-department.json` divides by `0.90` (weights sum to 90% in the source).

## Data Relationships

```
Pillars (4)
    ↓
    └─→ Strategic Goals (7)
            ↓
            ├─→ Objective KPIs (29)
            ├─→ Initiatives (11)
            │       └─→ Initiative KPI references (37)
            │             - Operational initiative KPIs (23)
            │             - Linked KPI references (14)
            └─→ Departments (8)
                    └─→ Department KPIs (66)
```

## Files in this Directory

- `pillars.json` - Maps pillars to strategic goals
- `objectives.json` - Contains the 7 strategic goals and their objective KPIs
- `initiatives.json` - Contains the 11 strategic initiatives and their KPI references (operational + linked)
- `deprtments/` - Folder containing JSON files for each of the 8 departments
  - Each department file contains sector information and its respective KPIs

## Org Admins

- `o.alharbi@almosa.com.sa`
- `m.alamri@almosa.com.sa`

## Notes

- Department KPIs are classified as either "استراتيجي" (Strategic) or "تشغيلي" (Operational)
- Each KPI includes: scope, weight, measurement indicator, classification, frequency, and unit
- **استراتيجي (Strategic) KPIs** are linked to strategic goals and performance indicators (Objective KPIs)
- **تشغيلي (Operational) KPIs** are NOT linked to objective KPIs - they measure internal operational efficiency
- All data is bilingual (Arabic and English)
