# Mosa Group - Raw Data Overview

This folder contains the raw data for the Mosa Group strategic framework, including objectives, departments, and their associated KPIs.

## Data Structure Summary

### Strategic Framework Components

- **Objectives**: 7 strategic objectives
- **Initiatives**: 11 strategic initiatives
- **Departments**: 8 organizational departments
- **Total KPIs**: 109
  - Department KPIs: 66
  - Objective KPIs: 20
  - Initiative KPIs: 23

## Database Schema

The data should be structured in the database as follows:

### 1. Objectives (7 Total)
Strategic objectives that guide the organization's direction and goals.

**Location**: `objectives.json`

### 2. Departments (8 Total)

Organizational departments that implement the strategic objectives:

1. **Strategy Department** (قطاع الاستراتيجية)
   - KPIs: 6
   - File: `deprtments/strategy-department.json`

2. **Investment Department** (قطاع الاستثمار)
   - KPIs: 10
   - File: `deprtments/investment-department.json`

3. **Finance Department** (قطاع المالية)
   - KPIs: 9
   - File: `deprtments/finance-department.json`

4. **Support Services Department** (قطاع الخدمات المساندة)
   - KPIs: 8
   - File: `deprtments/support-services-department.json`

5. **Internal Audit Department** (إدارة المراجعة الداخلية)
   - KPIs: 8
   - File: `deprtments/internal-audit-department.json`

6. **Governance, Compliance & Risk Management Department** (إدارة الحوكمة والالتزام والمخاطر)
   - KPIs: 8
   - File: `deprtments/governance-department.json`

7. **Communication Department** (إدارة التواصل)
   - KPIs: 9
   - File: `deprtments/communication-department.json`

8. **Legal Department** (قسم القانونية)
   - KPIs: 8
   - File: `deprtments/legal-department.json`

### 3. Initiatives (11 Total)

Strategic initiatives linked to strategic goals and optionally linked to objective KPIs.

**Location**: `initiatives.json`

- Total initiatives: 11
- Total initiative KPIs (operational only): 23

### 4. KPIs (109 Total)

#### Department KPIs: 66
Performance indicators assigned to departments to measure operational and strategic performance.

**Distribution by Department**:
- Strategy: 6 KPIs
- Investment: 10 KPIs
- Finance: 9 KPIs
- Support Services: 8 KPIs
- Internal Audit: 8 KPIs
- Governance: 8 KPIs
- Communication: 9 KPIs
- Legal: 8 KPIs

#### Objective KPIs: 20
High-level performance indicators linked directly to strategic objectives.

## Data Relationships

```
Objectives (7)
    ↓
    └─→ Objective KPIs (20)

Departments (8)
    ↓
    └─→ Department KPIs (66)
            ↓
            └─→ Link to Strategic Goals
            └─→ Link to Performance Indicators
```

## Files in this Directory

- `objectives.json` - Contains the 7 strategic objectives and their 20 associated KPIs
- `initiatives.json` - Contains the 11 strategic initiatives and their linked/operational KPI references
- `deprtments/` - Folder containing JSON files for each of the 8 departments
  - Each department file contains sector information and its respective KPIs

## Notes

- Department KPIs are classified as either "استراتيجي" (Strategic) or "تشغيلي" (Operational)
- Each KPI includes: scope, weight, measurement indicator, classification, frequency, and unit
- **استراتيجي (Strategic) KPIs** are linked to strategic goals and performance indicators (Objective KPIs)
- **تشغيلي (Operational) KPIs** are NOT linked to objective KPIs - they measure internal operational efficiency
- All data is bilingual (Arabic and English)
