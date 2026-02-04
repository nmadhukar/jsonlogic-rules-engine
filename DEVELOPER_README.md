# JSONLogic Rules Engine - Developer Integration Guide

## Overview

A lightweight business rules engine for Healthcare/EMR applications featuring:
- **Visual Query Builder** - Drag-and-drop rule creation
- **Expression Parser** - Human-readable rule syntax
- **Decision Tables** - Excel-like rule matrices
- **Rule Pipelines** - Multi-step calculations with step references
- **JSONLogic Format** - Portable rules executable in both JavaScript and C#

## Package Contents

```
JsonRulesEngine-Distribution/
├── frontend/                    # React UI Components
│   ├── dist/                    # Built production files
│   ├── src/                     # Source code
│   ├── package.json             # NPM dependencies
│   └── ...
│
├── backend/                     # .NET 8 API
│   ├── JsonRulesEngine.Core/    # Core library
│   ├── JsonRulesEngine.Api/     # Web API
│   ├── JsonRulesEngine.Infrastructure/  # Data access
│   └── JsonRulesEngine.slnx     # Solution file
│
├── database/                    # PostgreSQL migrations
│   ├── 001_InitialCreate.sql
│   └── 001_InitialCreate_Rollback.sql
│
└── DEVELOPER_README.md          # This file
```

## Quick Start

### Frontend Integration

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Development server:**
```bash
npm run dev
```

3. **Import into your EMR:**
```tsx
import {
  UnifiedRuleEditor,
  ruleFields,
  registerCustomOperators,
  rulesApi
} from './path-to-frontend/src';

// Register custom operators once at app startup
registerCustomOperators();

function RulesPage() {
  const [rule, setRule] = useState(null);

  const handleSave = async () => {
    await rulesApi.createRule({
      name: 'My Rule',
      type: 'Simple',
      category: 'Clinical',
      jsonLogic: rule
    });
  };

  return (
    <UnifiedRuleEditor
      fields={ruleFields}
      onChange={setRule}
    />
  );
}
```

### Backend Integration

1. **Build the solution:**
```bash
cd backend
dotnet build
```

2. **Configure connection string** in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=your-server;Database=rules_engine;Username=user;Password=pass"
  }
}
```

3. **Run the API:**
```bash
cd JsonRulesEngine.Api
dotnet run
```

4. **API Endpoints:**
   - `GET /api/rules` - List all rules
   - `GET /api/rules/{id}` - Get single rule
   - `POST /api/rules` - Create rule
   - `PUT /api/rules/{id}` - Update rule
   - `DELETE /api/rules/{id}` - Soft delete
   - `POST /api/evaluate` - Evaluate rule
   - `POST /api/evaluate/pipeline` - Execute pipeline
   - `GET /health` - Health check

### Database Setup

1. **Create PostgreSQL database:**
```sql
CREATE DATABASE rules_engine;
```

2. **Run migration:**
```bash
psql -d rules_engine -f database/001_InitialCreate.sql
```

## Custom Operators

Both frontend and backend support these custom operators:

| Operator | Description | Example |
|----------|-------------|---------|
| `contains` | String contains | `{ "contains": [{"var": "name"}, "John"] }` |
| `startsWith` | String starts with | `{ "startsWith": [{"var": "mrn"}, "MRN"] }` |
| `endsWith` | String ends with | `{ "endsWith": [{"var": "email"}, ".com"] }` |
| `between` | Value in range | `{ "between": [{"var": "age"}, 18, 65] }` |
| `isEmpty` | Check empty/null | `{ "isEmpty": [{"var": "notes"}] }` |
| `ageInYears` | Calculate age from DOB | `{ "ageInYears": [{"var": "patient.dob"}] }` |
| `daysSince` | Days since date | `{ "daysSince": [{"var": "lastVisit"}] }` |
| `daysBetween` | Days between dates | `{ "daysBetween": [{"var": "start"}, {"var": "end"}] }` |

## Healthcare Field Definitions

Pre-configured fields for EMR integration:

```typescript
// Patient fields
patient.age, patient.gender, patient.mrn, patient.date_of_birth,
patient.insurance_type, patient.risk_score

// Encounter fields
encounter.type, encounter.admit_date, encounter.discharge_date,
encounter.provider_id, encounter.length_of_stay

// Diagnosis fields
diagnosis.icd10_code, diagnosis.is_primary, diagnosis.onset_date

// Medication fields
medication.drug_code, medication.dose, medication.frequency, medication.route

// Lab fields
lab.test_code, lab.value, lab.units, lab.is_abnormal

// Vitals
vitals.blood_pressure_systolic, vitals.heart_rate, vitals.temperature, vitals.bmi
```

## Rule Types

### 1. Simple Rules (JSONLogic)
```json
{
  "and": [
    { ">=": [{ "var": "patient.age" }, 65] },
    { "==": [{ "var": "patient.insurance_type" }, "medicare"] }
  ]
}
```

### 2. Decision Tables
```json
{
  "id": "dosage-table",
  "hitPolicy": "first",
  "columns": [
    { "id": "age", "type": "input", "field": "patient.age" },
    { "id": "dose", "type": "output", "field": "recommendedDose" }
  ],
  "rows": [
    { "cells": { "age": "<18", "dose": "250" } },
    { "cells": { "age": ">=18", "dose": "500" } }
  ]
}
```

### 3. Pipelines (Multi-step)
```json
{
  "id": "billing-calc",
  "steps": [
    {
      "key": "baseRate",
      "logic": { "var": "procedure.base_cost" }
    },
    {
      "key": "discount",
      "logic": {
        "if": [
          { "==": [{ "var": "patient.insurance_type" }, "medicare"] },
          0.2,
          0
        ]
      }
    },
    {
      "key": "finalAmount",
      "logic": {
        "*": [
          { "var": "$.baseRate" },
          { "-": [1, { "var": "$.discount" }] }
        ]
      }
    }
  ]
}
```

## Environment Variables

Frontend (`VITE_API_URL`):
```env
VITE_API_URL=http://localhost:5000
```

## Testing

```bash
# Frontend tests (123 tests)
cd frontend
npm test

# Backend tests
cd backend
dotnet test
```

## Support

For issues or questions, contact the development team.

## Version

- Frontend: 1.0.0
- Backend: .NET 8
- Database: PostgreSQL 14+
