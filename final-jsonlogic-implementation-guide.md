# JSONLogic Business Rules Builder — Complete Implementation Guide

> **Purpose**: Single source of truth for vibe-coding the entire rules engine UI.
> Every file, every function, every test, every gotcha — in order of implementation.

---

## TABLE OF CONTENTS

1. [Architecture & Principles](#1-architecture--principles)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Setup](#3-project-setup)
4. [File Structure](#4-file-structure)
5. [STEP 1 — Type Definitions & Config](#5-step-1--type-definitions--config)
6. [STEP 2 — Custom Operator Registration](#6-step-2--custom-operator-registration)
7. [STEP 3 — Query Builder (Tier 1)](#7-step-3--query-builder-tier-1)
8. [STEP 4 — Expression Parser (Tier 1.5)](#8-step-4--expression-parser-tier-15)
9. [STEP 5 — Expression Decompiler](#9-step-5--expression-decompiler)
10. [STEP 6 — Expression Input Component](#10-step-6--expression-input-component)
11. [STEP 7 — Decision Table Types & Cell Compiler (Tier 2)](#11-step-7--decision-table-types--cell-compiler-tier-2)
12. [STEP 8 — Table-to-JSONLogic Compiler](#12-step-8--table-to-jsonlogic-compiler)
13. [STEP 9 — Decision Table Editor UI](#13-step-9--decision-table-editor-ui)
14. [STEP 10 — Simulator Panel](#14-step-10--simulator-panel)
15. [STEP 11 — Unified Rule Editor](#15-step-11--unified-rule-editor)
16. [STEP 12 — Pipeline Executor (Tier 3)](#16-step-12--pipeline-executor-tier-3)
17. [STEP 13 — Pipeline Editor UI](#17-step-13--pipeline-editor-ui)
18. [STEP 14 — Backend Integration](#18-step-14--backend-integration)
19. [STEP 15 — Polish & UX](#19-step-15--polish--ux)
20. [Complete Test Suite](#20-complete-test-suite)
21. [Bug & Gotcha Registry](#21-bug--gotcha-registry)
22. [Evaluation in Other Languages](#22-evaluation-in-other-languages)
23. [Implementation Schedule](#23-implementation-schedule)
24. [Future Extensions (Only When Needed)](#24-future-extensions-only-when-needed)

---

## 1. Architecture & Principles

### What We're Building

A lightweight, business-user-friendly UI for composing rules that outputs **portable JSONLogic**. Not a platform. Not a BRMS. A focused tool that lets non-technical users create, test, and manage conditional logic without writing JSON.

### Design Principles

1. **JSONLogic in, JSONLogic out** — every UI interaction produces standard JSONLogic that runs anywhere
2. **No new runtime** — execution engine is `json-logic-js` (~3KB). No custom engine.
3. **Leverage existing libraries** — `react-querybuilder`, `@tanstack/react-table`, hand-written expression parser
4. **Progressive complexity** — Tier 1 (query builder) → Tier 1.5 (expressions) → Tier 2 (tables) → Tier 3 (pipelines)
5. **Ship in ~10 days** — for a competent React/TypeScript developer

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        RULE EDITOR UI (React)                     │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Single Rule  │  │ Decision     │  │ Pipeline Editor         │ │
│  │ (Query       │  │ Table        │  │ (ordered step list,     │ │
│  │  Builder OR  │  │ Editor       │  │  each step = single     │ │
│  │  Expression) │  │              │  │  rule or table)         │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────────┘ │
│         │                 │                      │                │
│         └────────┬────────┘                      │                │
│                  ▼                                ▼                │
│         ┌──────────────┐               ┌───────────────────┐     │
│         │  JSONLogic    │               │  Pipeline JSON    │     │
│         │  (one rule)   │               │  (array of steps, │     │
│         │               │               │   each = JSONLogic)│     │
│         └──────────────┘               └───────────────────┘     │
└──────────────────────────┬──────────────────────┬────────────────┘
                           │                      │
                    Store as JSONB          Store as JSONB
                           │                      │
                           ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                       YOUR BACKEND                                │
│                                                                   │
│  Single rule:                Pipeline:                            │
│  jsonLogic.apply(rule, d)    executePipeline(steps, d)            │
│        ↓                            ↓                             │
│    json-logic-js (~3KB)       for-loop + json-logic-js (~3KB)     │
│                                                                   │
│  Total runtime: 3KB + ~60 lines.                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Tier Overview

| Tier | What | When to Use | Covers |
|------|------|-------------|--------|
| **Tier 1** | Query Builder (AND/OR visual) | Simple conditions: "if X and Y then..." | ~60% of rules |
| **Tier 1.5** | Expression Parser (typed text) | Power users who prefer typing: `age > 18 and tier == "gold"` | ~20% of rules |
| **Tier 2** | Decision Table | Matrix logic: tier × region × product → price | ~15% of rules |
| **Tier 3** | Pipeline | Chained steps: subtotal → tax → discount → final | ~5% of rules |

---

## 2. Tech Stack & Dependencies

### Required Dependencies

```bash
npm install react-querybuilder json-logic-js @tanstack/react-table
npm install -D @types/json-logic-js vitest @testing-library/react
```

### Optional Dependencies

```bash
# Themed query builder (pick ONE)
npm install @react-querybuilder/antd    # Ant Design theme
npm install @react-querybuilder/mui     # Material UI theme
npm install @react-querybuilder/bootstrap # Bootstrap theme

# Drag-and-drop for query builder rule reordering
npm install @react-querybuilder/dnd

# Drag-and-drop for pipeline step reordering
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Bundle Impact

| Package | Minified + Gzipped |
|---------|-------------------|
| `react-querybuilder` | ~22KB |
| `json-logic-js` | ~3KB |
| `@tanstack/react-table` | ~14KB |
| `@dnd-kit/core` + `@dnd-kit/sortable` | ~12KB |
| Custom code (parser + compilers + UI) | ~14KB |
| **Total UI** | **~65KB** |
| **Runtime evaluation only** | **~3KB** (`json-logic-js`) |

### ⚠️ CRITICAL: react-querybuilder v7 Import Changes

In v7, parser functions moved to sub-path exports. **This WILL break if you use the wrong import path.**

```typescript
// ❌ WRONG — v6 imports, WILL NOT WORK in v7
import { parseJsonLogic, formatQuery } from 'react-querybuilder';

// ✅ CORRECT — v7 imports
import { formatQuery, QueryBuilder } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
```

---

## 3. Project Setup

### 3.1 Initialize Project

```bash
# If starting fresh
npm create vite@latest rule-editor -- --template react-ts
cd rule-editor
npm install react-querybuilder json-logic-js @tanstack/react-table
npm install -D vitest @testing-library/react jsdom
```

### 3.2 TypeScript Config — Add json-logic-js Types

Create a type declaration since `json-logic-js` doesn't ship types:

```typescript
// src/types/json-logic-js.d.ts

declare module 'json-logic-js' {
  interface JsonLogicStatic {
    apply(logic: any, data?: any): any;
    add_operation(name: string, fn: (...args: any[]) => any): void;
    rm_operation(name: string): void;
    is_logic(logic: any): boolean;
    truthy(value: any): boolean;
    get_operator(logic: any): string;
    get_values(logic: any): any[];
    uses_data(logic: any): string[];
  }
  const jsonLogic: JsonLogicStatic;
  export default jsonLogic;
  export = jsonLogic;
}
```

### 3.3 Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

### 3.4 Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 4. File Structure

```
src/
├── types/
│   ├── json-logic-js.d.ts          # Type declarations for json-logic-js
│   ├── decisionTable.ts             # DecisionTable, Column, Row interfaces
│   └── rulePipeline.ts              # Pipeline, PipelineStep interfaces
│
├── config/
│   ├── ruleFields.ts                # Field definitions for your domain
│   ├── customOperators.ts           # Custom JSONLogic operator registration
│   ├── ruleTemplates.ts             # Starter rule templates
│   └── index.ts                     # Re-export all config
│
├── engine/
│   ├── expressionParser.ts          # Infix expression → JSONLogic (~250 lines)
│   ├── expressionDecompiler.ts      # JSONLogic → infix expression (~130 lines)
│   ├── cellCompiler.ts              # Decision table cell → JSONLogic
│   ├── tableCompiler.ts             # Full table → JSONLogic
│   ├── pipelineExecutor.ts          # Pipeline step runner (~60 lines)
│   ├── pipelineValidator.ts         # Forward-ref & duplicate key checks
│   ├── csvIO.ts                     # Decision table CSV import/export
│   └── __tests__/
│       ├── expressionParser.test.ts
│       ├── expressionDecompiler.test.ts
│       ├── cellCompiler.test.ts
│       ├── tableCompiler.test.ts
│       ├── pipelineExecutor.test.ts
│       └── customOperators.test.ts
│
├── components/
│   ├── RuleBuilder.tsx              # Tier 1: react-querybuilder wrapper
│   ├── ExpressionInput.tsx          # Tier 1.5: text input with autocomplete
│   ├── DecisionTableEditor.tsx      # Tier 2: spreadsheet-style table
│   ├── SimulatorPanel.tsx           # Test/simulate rules with sample data
│   ├── TemplateSelector.tsx         # Browse and apply starter templates
│   ├── UnifiedRuleEditor.tsx        # Top-level: combines Tier 1/1.5/2 + Simulator
│   ├── PipelineEditor.tsx           # Tier 3: ordered step list editor
│   └── SyntaxHelp.tsx               # Collapsible expression syntax reference
│
├── api/
│   └── rules.ts                     # Backend CRUD + evaluation endpoints
│
├── styles/
│   └── ruleEditor.css               # All custom styles
│
└── index.ts                         # Main exports
```

---

## 5. STEP 1 — Type Definitions & Config

### Acceptance Criteria
- [ ] All TypeScript interfaces compile without errors
- [ ] Field definitions cover your domain model
- [ ] Templates produce valid JSONLogic when selected

### 5.1 Decision Table Types

```typescript
// src/types/decisionTable.ts

export interface DecisionTableColumn {
  id: string;
  /** "input" = condition column, "output" = result column */
  type: 'input' | 'output';
  /** Dot-path to the data field: "customer.tier", "order.total" */
  field: string;
  /** Human-readable label: "Customer Tier", "Order Total" */
  label: string;
  /** Data type hint for parsing cell values */
  dataType: 'string' | 'number' | 'boolean';
}

export interface DecisionTableRow {
  id: string;
  /** Map of column ID → cell expression string */
  cells: Record<string, string>;
}

export interface DecisionTable {
  id: string;
  name: string;
  /** "first" = first matching row wins, "collect" = gather all matches */
  hitPolicy: 'first' | 'collect';
  columns: DecisionTableColumn[];
  rows: DecisionTableRow[];
}
```

### 5.2 Pipeline Types

```typescript
// src/types/rulePipeline.ts

import { DecisionTable } from './decisionTable';

export interface PipelineStep {
  id: string;
  name: string;
  /** Key where this step's output is stored. Later steps read it as $.outputKey */
  outputKey: string;
  /** How this step was authored (tells the UI which editor to show) */
  ruleType: 'expression' | 'condition' | 'table';
  /** The compiled JSONLogic rule */
  jsonLogic: any;
  /** For table-authored steps: the DecisionTable definition (UI persistence only) */
  tableDef?: DecisionTable;
  /** Optional description for business users */
  description?: string;
  /** Temporarily disable without deleting */
  enabled: boolean;
}

export interface RulePipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
}
```

### 5.3 Field Definitions

**This is the most important config file.** Fields define what business users see in dropdown menus. Replace with YOUR domain model.

```typescript
// src/config/ruleFields.ts
import type { Field } from 'react-querybuilder';

export const ruleFields: Field[] = [
  // ── Customer ──
  {
    name: 'customer.age',
    label: 'Customer Age',
    inputType: 'number',
    validator: (r) => !!r.value,
    defaultValue: 0,
  },
  {
    name: 'customer.tier',
    label: 'Customer Tier',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'bronze', label: 'Bronze' },
      { name: 'silver', label: 'Silver' },
      { name: 'gold', label: 'Gold' },
      { name: 'platinum', label: 'Platinum' },
    ],
    defaultValue: 'bronze',
  },
  {
    name: 'customer.country',
    label: 'Customer Country',
    inputType: 'text',
    defaultValue: '',
  },
  {
    name: 'customer.is_blocked',
    label: 'Is Blocked',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'true', label: 'Yes' },
      { name: 'false', label: 'No' },
    ],
    defaultValue: 'false',
  },
  {
    name: 'customer.email',
    label: 'Customer Email',
    inputType: 'text',
    defaultValue: '',
  },
  {
    name: 'customer.created_at',
    label: 'Customer Since',
    inputType: 'date',
  },

  // ── Order ──
  {
    name: 'order.total',
    label: 'Order Total',
    inputType: 'number',
    validator: (r) => !!r.value,
    defaultValue: 0,
  },
  {
    name: 'order.quantity',
    label: 'Order Quantity',
    inputType: 'number',
    defaultValue: 1,
  },
  {
    name: 'order.unit_price',
    label: 'Unit Price',
    inputType: 'number',
    defaultValue: 0,
  },
  {
    name: 'order.currency',
    label: 'Currency',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'USD', label: 'USD' },
      { name: 'EUR', label: 'EUR' },
      { name: 'GBP', label: 'GBP' },
    ],
    defaultValue: 'USD',
  },

  // ── Risk / Scoring ──
  {
    name: 'risk_score',
    label: 'Risk Score',
    inputType: 'number',
    defaultValue: 0,
  },
  {
    name: 'manual_review',
    label: 'Manual Review Required',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'true', label: 'Yes' },
      { name: 'false', label: 'No' },
    ],
    defaultValue: 'false',
  },
];
```

### 5.4 Rule Templates

```typescript
// src/config/ruleTemplates.ts

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  jsonLogic: any;
}

export const ruleTemplates: RuleTemplate[] = [
  // ── Eligibility ──
  {
    id: 'eligible-adult',
    name: 'Adult Customer',
    description: 'Customer is 18+ and not blocked',
    category: 'Eligibility',
    jsonLogic: {
      "and": [
        { ">=": [{ "var": "customer.age" }, 18] },
        { "!": { "var": "customer.is_blocked" } }
      ]
    },
  },
  {
    id: 'eligible-gold',
    name: 'Gold Tier Eligible',
    description: 'Gold or Platinum tier, not blocked',
    category: 'Eligibility',
    jsonLogic: {
      "and": [
        { "in": [{ "var": "customer.tier" }, ["gold", "platinum"]] },
        { "!": { "var": "customer.is_blocked" } }
      ]
    },
  },

  // ── Orders ──
  {
    id: 'high-value-order',
    name: 'High Value Order',
    description: 'Order total exceeds $500',
    category: 'Orders',
    jsonLogic: { ">": [{ "var": "order.total" }, 500] },
  },
  {
    id: 'domestic-order',
    name: 'Domestic Order',
    description: 'Customer is in US, CA, or UK',
    category: 'Orders',
    jsonLogic: { "in": [{ "var": "customer.country" }, ["US", "CA", "UK"]] },
  },

  // ── Risk ──
  {
    id: 'low-risk',
    name: 'Low Risk Auto-Approve',
    description: 'Risk score under 30 and no manual review needed',
    category: 'Risk',
    jsonLogic: {
      "and": [
        { "<": [{ "var": "risk_score" }, 30] },
        { "!": { "var": "manual_review" } }
      ]
    },
  },
  {
    id: 'high-risk-flag',
    name: 'High Risk Flag',
    description: 'Risk score above 80 or manual review required',
    category: 'Risk',
    jsonLogic: {
      "or": [
        { ">": [{ "var": "risk_score" }, 80] },
        { "==": [{ "var": "manual_review" }, true] }
      ]
    },
  },

  // ── Discounts ──
  {
    id: 'gold-discount',
    name: 'Gold Tier Discount',
    description: 'Gold tier AND order > $100 gets 20% off',
    category: 'Discounts',
    jsonLogic: {
      "and": [
        { "==": [{ "var": "customer.tier" }, "gold"] },
        { ">": [{ "var": "order.total" }, 100] }
      ]
    },
  },
];
```

### ✅ STEP 1 Validation

```
□ Run: npx tsc --noEmit
  Expected: No type errors

□ Import ruleFields and verify:
  - At least 5 fields with different inputTypes
  - Fields with valueEditorType: 'select' have values arrays

□ Import ruleTemplates and verify:
  - Each template's jsonLogic is valid (paste into jsonlogic.com playground)
  - Templates cover at least 3 categories
```

---

## 6. STEP 2 — Custom Operator Registration

### ⚠️ CRITICAL BUG FIX FROM ORIGINAL PLAN

The original plan registered some custom operators but missed many that the expression parser and react-querybuilder actually produce. **Every non-standard JSONLogic operator must be registered with `add_operation` or evaluation will silently fail.**

Standard JSONLogic operators (DON'T register these): `var`, `if`, `==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`, `!`, `!!`, `and`, `or`, `+`, `-`, `*`, `/`, `%`, `min`, `max`, `in`, `cat`, `log`, `map`, `filter`, `reduce`, `all`, `some`, `none`, `merge`, `substr`, `missing`, `missing_some`

**Non-standard operators we use (MUST register):** `startsWith`, `endsWith`, `contains`, `between`, `daysSince`, `isEmpty`, `round`, `floor`, `ceil`, `abs`, `len`, `upper`, `lower`, `trim`, `count`, `sum`, `avg`, `now`, `daysBetween`, `coalesce`

### Acceptance Criteria
- [ ] All custom operators registered before any rule evaluation
- [ ] react-querybuilder's `jsonLogicAdditionalOperators` registered
- [ ] Every operator has a unit test

```typescript
// src/config/customOperators.ts
import jsonLogic from 'json-logic-js';
import { jsonLogicAdditionalOperators } from 'react-querybuilder';

/**
 * Register ALL custom operators with json-logic-js.
 * Call this ONCE at app startup, before any jsonLogic.apply() call.
 *
 * ⚠️ If you add operators to the expression parser's buildFunctionCall(),
 * you MUST also register them here or evaluation will silently return wrong results.
 */
export function registerCustomOperators(): void {
  // ── 1. Register react-querybuilder's additional operators ──
  // This covers: startsWith, endsWith (and any future RQB additions)
  for (const [op, fn] of Object.entries(jsonLogicAdditionalOperators)) {
    jsonLogic.add_operation(op, fn);
  }

  // ── 2. String operators ──
  jsonLogic.add_operation('contains', (haystack: string, needle: string): boolean => {
    if (typeof haystack !== 'string' || typeof needle !== 'string') return false;
    return haystack.toLowerCase().includes(needle.toLowerCase());
  });

  // len — works on strings and arrays
  jsonLogic.add_operation('len', (val: any): number => {
    if (val == null) return 0;
    if (typeof val === 'string' || Array.isArray(val)) return val.length;
    return 0;
  });

  jsonLogic.add_operation('upper', (val: string): string => {
    return typeof val === 'string' ? val.toUpperCase() : String(val);
  });

  jsonLogic.add_operation('lower', (val: string): string => {
    return typeof val === 'string' ? val.toLowerCase() : String(val);
  });

  jsonLogic.add_operation('trim', (val: string): string => {
    return typeof val === 'string' ? val.trim() : String(val);
  });

  // ── 3. Math operators ──
  jsonLogic.add_operation('abs', (val: number): number => Math.abs(val));
  jsonLogic.add_operation('floor', (val: number): number => Math.floor(val));
  jsonLogic.add_operation('ceil', (val: number): number => Math.ceil(val));
  jsonLogic.add_operation('round', (val: number, decimals?: number): number => {
    if (decimals === undefined) return Math.round(val);
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  });

  // ── 4. Collection operators ──
  jsonLogic.add_operation('count', (arr: any[]): number => {
    return Array.isArray(arr) ? arr.length : 0;
  });

  jsonLogic.add_operation('sum', (arr: any[]): number => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
  });

  jsonLogic.add_operation('avg', (arr: any[]): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const total = arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return total / arr.length;
  });

  // ── 5. Date operators ──
  jsonLogic.add_operation('now', (): string => new Date().toISOString());

  jsonLogic.add_operation('daysSince', (dateStr: string): number => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return -1;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  });

  jsonLogic.add_operation('daysBetween', (d1: string, d2: string): number => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return -1;
    const diffMs = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  });

  // ── 6. Null/empty operators ──
  jsonLogic.add_operation('isEmpty', (val: any): boolean => {
    if (val == null) return true;
    if (typeof val === 'string') return val.trim() === '';
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  });

  jsonLogic.add_operation('coalesce', (...args: any[]): any => {
    for (const arg of args) {
      if (arg != null) return arg;
    }
    return null;
  });

  // ── 7. Between (convenience — used by react-querybuilder) ──
  jsonLogic.add_operation('between', (val: number, lo: number, hi: number): boolean => {
    return val >= lo && val <= hi;
  });
}

/**
 * Operator metadata for the react-querybuilder UI.
 * Maps RQB operator names → JSONLogic operator names.
 */
export const customRQBOperators = [
  { name: 'startsWith', label: 'starts with' },
  { name: 'endsWith', label: 'ends with' },
  { name: 'contains', label: 'contains' },
  { name: 'doesNotContain', label: 'does not contain' },
  { name: 'between', label: 'between' },
  { name: 'notBetween', label: 'not between' },
];

// Default operators + our custom ones for the query builder
export const allOperators = [
  { name: '=', label: '=' },
  { name: '!=', label: '!=' },
  { name: '<', label: '<' },
  { name: '<=', label: '<=' },
  { name: '>', label: '>' },
  { name: '>=', label: '>=' },
  { name: 'in', label: 'in' },
  { name: 'notIn', label: 'not in' },
  ...customRQBOperators,
  { name: 'null', label: 'is null' },
  { name: 'notNull', label: 'is not null' },
];
```

### ✅ STEP 2 Validation

```typescript
// src/engine/__tests__/customOperators.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import jsonLogic from 'json-logic-js';
import { registerCustomOperators } from '../../config/customOperators';

beforeAll(() => {
  registerCustomOperators();
});

describe('custom operators', () => {
  // String ops
  it('startsWith', () => {
    expect(jsonLogic.apply({ startsWith: [{ var: 'email' }, 'admin'] }, { email: 'admin@test.com' })).toBe(true);
    expect(jsonLogic.apply({ startsWith: [{ var: 'email' }, 'user'] }, { email: 'admin@test.com' })).toBe(false);
  });

  it('endsWith', () => {
    expect(jsonLogic.apply({ endsWith: [{ var: 'email' }, '.com'] }, { email: 'test@example.com' })).toBe(true);
  });

  it('contains', () => {
    expect(jsonLogic.apply({ contains: [{ var: 'name' }, 'john'] }, { name: 'John Smith' })).toBe(true);
    expect(jsonLogic.apply({ contains: [{ var: 'name' }, 'jane'] }, { name: 'John Smith' })).toBe(false);
  });

  it('len', () => {
    expect(jsonLogic.apply({ len: ['hello'] }, {})).toBe(5);
    expect(jsonLogic.apply({ len: [[1, 2, 3]] }, {})).toBe(3);
    expect(jsonLogic.apply({ len: [null] }, {})).toBe(0);
  });

  it('upper / lower / trim', () => {
    expect(jsonLogic.apply({ upper: ['hello'] }, {})).toBe('HELLO');
    expect(jsonLogic.apply({ lower: ['HELLO'] }, {})).toBe('hello');
    expect(jsonLogic.apply({ trim: ['  hi  '] }, {})).toBe('hi');
  });

  // Math ops
  it('abs', () => {
    expect(jsonLogic.apply({ abs: [-5] }, {})).toBe(5);
  });

  it('floor / ceil', () => {
    expect(jsonLogic.apply({ floor: [3.7] }, {})).toBe(3);
    expect(jsonLogic.apply({ ceil: [3.2] }, {})).toBe(4);
  });

  it('round', () => {
    expect(jsonLogic.apply({ round: [3.456] }, {})).toBe(3);
    expect(jsonLogic.apply({ round: [3.456, 2] }, {})).toBe(3.46);
    expect(jsonLogic.apply({ round: [3.455, 2] }, {})).toBe(3.46);
  });

  // Collection ops
  it('sum / count / avg', () => {
    expect(jsonLogic.apply({ sum: [[10, 20, 30]] }, {})).toBe(60);
    expect(jsonLogic.apply({ count: [[1, 2, 3, 4]] }, {})).toBe(4);
    expect(jsonLogic.apply({ avg: [[10, 20, 30]] }, {})).toBe(20);
  });

  // Date ops
  it('daysSince returns a positive number for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(jsonLogic.apply({ daysSince: [past.toISOString()] }, {})).toBeGreaterThanOrEqual(9);
  });

  // Null ops
  it('isEmpty', () => {
    expect(jsonLogic.apply({ isEmpty: [null] }, {})).toBe(true);
    expect(jsonLogic.apply({ isEmpty: [''] }, {})).toBe(true);
    expect(jsonLogic.apply({ isEmpty: ['hello'] }, {})).toBe(false);
    expect(jsonLogic.apply({ isEmpty: [[]] }, {})).toBe(true);
  });

  it('coalesce', () => {
    expect(jsonLogic.apply({ coalesce: [null, undefined, 'fallback'] }, {})).toBe('fallback');
    expect(jsonLogic.apply({ coalesce: ['first', 'second'] }, {})).toBe('first');
  });

  it('between', () => {
    expect(jsonLogic.apply({ between: [5, 1, 10] }, {})).toBe(true);
    expect(jsonLogic.apply({ between: [15, 1, 10] }, {})).toBe(false);
  });
});
```

```
□ Run: npx vitest run src/engine/__tests__/customOperators.test.ts
  Expected: All tests pass

□ Verify registerCustomOperators() is called in your app's entry point (main.tsx or App.tsx):
  import { registerCustomOperators } from './config/customOperators';
  registerCustomOperators(); // MUST be called before any jsonLogic.apply()
```

---

## 7. STEP 3 — Query Builder (Tier 1)

### Acceptance Criteria
- [ ] Visual drag-and-drop rule builder renders
- [ ] Adding rules produces valid JSONLogic
- [ ] Loading JSONLogic back into the builder reconstructs the visual tree
- [ ] Custom operators (startsWith, contains, etc.) work
- [ ] `parseNumbers: true` is set (otherwise numbers are strings in output)

### ⚠️ CRITICAL: parseNumbers

Without `parseNumbers: true`, a rule like "age > 18" outputs `{ ">": [{"var":"age"}, "18"] }` — note `"18"` is a STRING. This causes subtle comparison bugs at runtime.

```typescript
// src/components/RuleBuilder.tsx
import { useState, useCallback, useEffect } from 'react';
import {
  QueryBuilder,
  formatQuery,
  type RuleGroupType,
  type Field,
} from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { allOperators } from '../config/customOperators';
import 'react-querybuilder/dist/query-builder.css';

interface RuleBuilderProps {
  /** Initial JSONLogic to load into the builder. Pass undefined for a blank builder. */
  initialJsonLogic?: any;
  /** Field definitions — what users see in dropdowns */
  fields: Field[];
  /** Called whenever the rule changes with the compiled JSONLogic */
  onJsonLogicChange: (jsonLogic: any) => void;
  /** Called with the react-querybuilder internal query object */
  onQueryChange?: (query: RuleGroupType) => void;
  /** Read-only mode */
  disabled?: boolean;
}

const defaultQuery: RuleGroupType = {
  combinator: 'and',
  rules: [],
};

export function RuleBuilder({
  initialJsonLogic,
  fields,
  onJsonLogicChange,
  onQueryChange,
  disabled = false,
}: RuleBuilderProps) {
  const [query, setQuery] = useState<RuleGroupType>(() => {
    if (initialJsonLogic) {
      try {
        return parseJsonLogic(initialJsonLogic) as RuleGroupType;
      } catch {
        console.warn('Failed to parse initial JSONLogic, starting with blank query');
        return defaultQuery;
      }
    }
    return defaultQuery;
  });

  const handleQueryChange = useCallback(
    (newQuery: RuleGroupType) => {
      setQuery(newQuery);
      onQueryChange?.(newQuery);

      // ⚠️ CRITICAL: parseNumbers: true — without this, numbers are strings
      const jsonLogic = formatQuery(newQuery, {
        format: 'jsonlogic',
        parseNumbers: true,
      });
      onJsonLogicChange(jsonLogic);
    },
    [onJsonLogicChange, onQueryChange]
  );

  // If initialJsonLogic changes externally, re-parse
  useEffect(() => {
    if (initialJsonLogic) {
      try {
        const parsed = parseJsonLogic(initialJsonLogic) as RuleGroupType;
        setQuery(parsed);
      } catch {
        // ignore parse errors on external changes
      }
    }
  }, [initialJsonLogic]);

  return (
    <QueryBuilder
      fields={fields}
      query={query}
      onQueryChange={handleQueryChange}
      operators={allOperators}
      controlClassnames={{ queryBuilder: 'rule-builder' }}
      disabled={disabled}
      // Show combinator (AND/OR) between rules
      showCombinatorsBetweenRules
      // Add group/rule buttons
      addRuleToNewGroups
      // Reset value when field or operator changes
      resetOnFieldChange
      resetOnOperatorChange
    />
  );
}
```

### ✅ STEP 3 Validation

```
□ Render <RuleBuilder fields={ruleFields} onJsonLogicChange={console.log} />
  Expected: Query builder UI appears with field dropdowns

□ Add rule: customer.age > 18
  Expected console output: { ">": [{ "var": "customer.age" }, 18] }
  ⚠️ Verify 18 is a NUMBER not "18" string

□ Add rule: customer.tier = "gold"
  Expected: { "==": [{ "var": "customer.tier" }, "gold"] }

□ Add AND group with two rules, verify output wraps in { "and": [...] }

□ Load existing JSONLogic:
  initialJsonLogic={{ "and": [{ ">": [{"var":"customer.age"}, 18] }, { "==": [{"var":"customer.tier"}, "gold"] }] }}
  Expected: Builder shows two rules with AND combinator

□ Verify roundtrip: create rule → get JSONLogic → pass back as initialJsonLogic → same visual result
```

---

## 8. STEP 4 — Expression Parser (Tier 1.5)

### Acceptance Criteria
- [ ] Parses all syntax from the supported expressions list
- [ ] Zero dependencies — pure TypeScript
- [ ] ~250 lines
- [ ] Error messages include character position
- [ ] Handles `$.stepKey` references for pipeline steps
- [ ] Empty input returns `true` (useful for table wildcards)
- [ ] All 47+ unit tests pass

### Supported Syntax

```
# Comparisons
age > 18                            customer.tier == "gold"

# Boolean logic
age > 18 and tier == "gold"         country == "US" or country == "CA"
not(is_blocked)                     (age > 18 and country == "US") or tier == "gold"

# Arithmetic
order.quantity * unit_price          subtotal * 0.08
base_price + shipping - discount

# Special operators
country in ["US", "CA", "UK"]       age between 18 and 65
name contains "john"                 email startsWith "admin@"
email endsWith ".gov"

# Functions
round(total * 1.08, 2)              min(score_a, score_b)
len(name)                           upper(email)

# Null / boolean
email == null                        is_active == true

# Pipeline step references
$.subtotal * 0.08                    $.discount > 0.1
```

### Full Implementation

```typescript
// src/engine/expressionParser.ts

/**
 * Parses business-friendly infix expressions into JSONLogic.
 * Zero dependencies. ~250 lines. Recursive descent with precedence climbing.
 *
 * @example
 *   parseExpression('age > 18 and tier == "gold"')
 *   → { "and": [{ ">": [{"var":"age"}, 18] }, { "==": [{"var":"tier"}, "gold"] }] }
 */

// ─── Token types ───

type TokenType =
  | 'NUMBER' | 'STRING' | 'BOOLEAN' | 'NULL' | 'IDENTIFIER'
  | 'AND' | 'OR' | 'NOT'
  | 'IN' | 'BETWEEN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH'
  | 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE'
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: any;
  pos: number;
}

// ─── Error class ───

export class ExpressionError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.name = 'ExpressionError';
    this.pos = pos;
  }
}

// ─── Lexer ───

const KEYWORDS: Record<string, TokenType> = {
  'and': 'AND', 'or': 'OR', 'not': 'NOT',
  'in': 'IN', 'between': 'BETWEEN',
  'contains': 'CONTAINS', 'startswith': 'STARTS_WITH', 'endswith': 'ENDS_WITH',
  'true': 'BOOLEAN', 'false': 'BOOLEAN', 'null': 'NULL',
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }

    const pos = i;

    // Two-character operators
    const two = input.slice(i, i + 2);
    if (two === '==') { tokens.push({ type: 'EQ', value: '==', pos }); i += 2; continue; }
    if (two === '!=') { tokens.push({ type: 'NEQ', value: '!=', pos }); i += 2; continue; }
    if (two === '>=') { tokens.push({ type: 'GTE', value: '>=', pos }); i += 2; continue; }
    if (two === '<=') { tokens.push({ type: 'LTE', value: '<=', pos }); i += 2; continue; }

    // Single-character operators
    const ch = input[i];
    if (ch === '>') { tokens.push({ type: 'GT', value: '>', pos }); i++; continue; }
    if (ch === '<') { tokens.push({ type: 'LT', value: '<', pos }); i++; continue; }
    if (ch === '+') { tokens.push({ type: 'PLUS', value: '+', pos }); i++; continue; }
    if (ch === '-') { tokens.push({ type: 'MINUS', value: '-', pos }); i++; continue; }
    if (ch === '*') { tokens.push({ type: 'STAR', value: '*', pos }); i++; continue; }
    if (ch === '/') { tokens.push({ type: 'SLASH', value: '/', pos }); i++; continue; }
    if (ch === '%') { tokens.push({ type: 'PERCENT', value: '%', pos }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(', pos }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')', pos }); i++; continue; }
    if (ch === '[') { tokens.push({ type: 'LBRACKET', value: '[', pos }); i++; continue; }
    if (ch === ']') { tokens.push({ type: 'RBRACKET', value: ']', pos }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',', pos }); i++; continue; }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i])) { num += input[i]; i++; }
      if (i < input.length && (input[i] === 'e' || input[i] === 'E')) {
        num += input[i]; i++;
        if (i < input.length && (input[i] === '+' || input[i] === '-')) { num += input[i]; i++; }
        while (i < input.length && /[0-9]/.test(input[i])) { num += input[i]; i++; }
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num), pos });
      continue;
    }

    // Strings (double or single quoted)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          if (input[i] === 'n') str += '\n';
          else if (input[i] === 't') str += '\t';
          else str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      if (i >= input.length) throw new ExpressionError(`Unterminated string starting at position ${pos}`, pos);
      i++;
      tokens.push({ type: 'STRING', value: str, pos });
      continue;
    }

    // Identifiers and keywords (allows $ and . in identifiers for paths like $.subtotal or customer.age)
    if (/[a-zA-Z_$]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_.$]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      const kwType = KEYWORDS[ident.toLowerCase()];
      if (kwType === 'BOOLEAN') {
        tokens.push({ type: 'BOOLEAN', value: ident.toLowerCase() === 'true', pos });
      } else if (kwType === 'NULL') {
        tokens.push({ type: 'NULL', value: null, pos });
      } else if (kwType) {
        tokens.push({ type: kwType, value: ident, pos });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: ident, pos });
      }
      continue;
    }

    throw new ExpressionError(`Unexpected character '${ch}' at position ${pos}`, pos);
  }

  tokens.push({ type: 'EOF', value: null, pos: input.length });
  return tokens;
}

// ─── Default known functions ───

const DEFAULT_FUNCTIONS = new Set([
  'min', 'max', 'abs', 'floor', 'ceil', 'round',
  'len', 'upper', 'lower', 'trim', 'substr',
  'count', 'sum', 'avg',
  'now', 'daysSince', 'daysBetween',
  'isEmpty', 'coalesce',
  'if',
]);

// ─── Parser ───

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private knownFields: Set<string> | null;
  private knownFunctions: Set<string>;

  constructor(tokens: Token[], options?: ParseOptions) {
    this.tokens = tokens;
    this.knownFields = options?.knownFields ? new Set(options.knownFields) : null;
    const extra = options?.knownFunctions ?? [];
    this.knownFunctions = new Set([...DEFAULT_FUNCTIONS, ...extra]);
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new ExpressionError(
        `Expected ${type} but got ${token.type} ("${token.value}") at position ${token.pos}`,
        token.pos
      );
    }
    return this.advance();
  }

  private match(...types: TokenType[]): Token | null {
    if (types.includes(this.peek().type)) return this.advance();
    return null;
  }

  // ── Entry point ──
  parse(): any {
    const result = this.parseOr();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      throw new ExpressionError(`Unexpected token "${t.value}" at position ${t.pos}`, t.pos);
    }
    return result;
  }

  // Level 1: OR
  private parseOr(): any {
    let left = this.parseAnd();
    while (this.match('OR')) {
      const right = this.parseAnd();
      const leftArgs = left?.or ? left.or : [left];
      const rightArgs = right?.or ? right.or : [right];
      left = { or: [...leftArgs, ...rightArgs] };
    }
    return left;
  }

  // Level 2: AND
  private parseAnd(): any {
    let left = this.parseNot();
    while (this.match('AND')) {
      const right = this.parseNot();
      const leftArgs = left?.and ? left.and : [left];
      const rightArgs = right?.and ? right.and : [right];
      left = { and: [...leftArgs, ...rightArgs] };
    }
    return left;
  }

  // Level 3: NOT (unary prefix)
  private parseNot(): any {
    if (this.match('NOT')) {
      if (this.peek().type === 'LPAREN') {
        this.advance();
        const expr = this.parseOr();
        this.expect('RPAREN');
        return { '!': [expr] };
      }
      const expr = this.parseNot();
      return { '!': [expr] };
    }
    return this.parseComparison();
  }

  // Level 4: Comparisons + special operators
  private parseComparison(): any {
    const left = this.parseAdditive();

    const compOp = this.match('EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE');
    if (compOp) {
      const right = this.parseAdditive();
      const opMap: Record<string, string> = {
        EQ: '==', NEQ: '!=', GT: '>', GTE: '>=', LT: '<', LTE: '<=',
      };
      return { [opMap[compOp.type]]: [left, right] };
    }

    if (this.match('IN')) {
      const list = this.parseArrayLiteral();
      return { in: [left, list] };
    }

    if (this.match('BETWEEN')) {
      const low = this.parseAdditive();
      this.expect('AND'); // syntactic "and", not boolean
      const high = this.parseAdditive();
      return { and: [{ '>=': [left, low] }, { '<=': [left, high] }] };
    }

    if (this.match('CONTAINS')) {
      const right = this.parseAdditive();
      return { contains: [left, right] };
    }

    if (this.match('STARTS_WITH')) {
      const right = this.parseAdditive();
      return { startsWith: [left, right] };
    }

    if (this.match('ENDS_WITH')) {
      const right = this.parseAdditive();
      return { endsWith: [left, right] };
    }

    return left;
  }

  // Level 5: Addition / Subtraction
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    while (true) {
      const op = this.match('PLUS', 'MINUS');
      if (!op) break;
      const right = this.parseMultiplicative();
      left = { [op.type === 'PLUS' ? '+' : '-']: [left, right] };
    }
    return left;
  }

  // Level 6: Multiplication / Division / Modulo
  private parseMultiplicative(): any {
    let left = this.parseUnary();
    while (true) {
      const op = this.match('STAR', 'SLASH', 'PERCENT');
      if (!op) break;
      const opMap: Record<string, string> = { STAR: '*', SLASH: '/', PERCENT: '%' };
      const right = this.parseUnary();
      left = { [opMap[op.type]]: [left, right] };
    }
    return left;
  }

  // Level 7: Unary minus
  private parseUnary(): any {
    if (this.match('MINUS')) {
      const expr = this.parseUnary();
      if (typeof expr === 'number') return -expr;
      return { '-': [0, expr] };
    }
    return this.parsePrimary();
  }

  // Level 8: Literals, variables, function calls, parentheses
  private parsePrimary(): any {
    const token = this.peek();

    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseOr();
      this.expect('RPAREN');
      return expr;
    }
    if (token.type === 'NUMBER')  { this.advance(); return token.value; }
    if (token.type === 'STRING')  { this.advance(); return token.value; }
    if (token.type === 'BOOLEAN') { this.advance(); return token.value; }
    if (token.type === 'NULL')    { this.advance(); return null; }
    if (token.type === 'LBRACKET') return this.parseArrayLiteral();

    if (token.type === 'IDENTIFIER') {
      this.advance();
      const name = token.value;

      // Function call: name(arg1, arg2, ...)
      if (this.peek().type === 'LPAREN' && this.knownFunctions.has(name)) {
        this.advance(); // skip (
        const args: any[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseOr());
          while (this.match('COMMA')) args.push(this.parseOr());
        }
        this.expect('RPAREN');
        return this.buildFunctionCall(name, args);
      }

      // Variable reference (including $.stepKey for pipeline steps)
      return { var: name };
    }

    throw new ExpressionError(
      `Unexpected token "${token.value}" (${token.type}) at position ${token.pos}`,
      token.pos
    );
  }

  // ── Helpers ──

  private parseArrayLiteral(): any[] {
    this.expect('LBRACKET');
    const items: any[] = [];
    if (this.peek().type !== 'RBRACKET') {
      items.push(this.parseOr());
      while (this.match('COMMA')) items.push(this.parseOr());
    }
    this.expect('RBRACKET');
    return items;
  }

  private buildFunctionCall(name: string, args: any[]): object {
    // Map function names to JSONLogic operators
    switch (name) {
      case 'min': return { min: args };
      case 'max': return { max: args };
      case 'abs': return { abs: [args[0]] };
      case 'floor': return { floor: [args[0]] };
      case 'ceil': return { ceil: [args[0]] };
      case 'round': return args.length > 1 ? { round: [args[0], args[1]] } : { round: [args[0]] };
      case 'len': return { len: [args[0]] };
      case 'upper': return { upper: [args[0]] };
      case 'lower': return { lower: [args[0]] };
      case 'trim': return { trim: [args[0]] };
      case 'substr': return { substr: args };
      case 'count': return { count: [args[0]] };
      case 'sum': return { sum: [args[0]] };
      case 'avg': return { avg: [args[0]] };
      case 'now': return { now: [] };
      case 'daysSince': return { daysSince: [args[0]] };
      case 'daysBetween': return { daysBetween: [args[0], args[1]] };
      case 'isEmpty': return { isEmpty: [args[0]] };
      case 'coalesce': return { coalesce: args };
      case 'if': return { if: args };
      default: return { [name]: args }; // pass-through for custom operators
    }
  }
}

// ─── Public API ───

export interface ParseOptions {
  /** Valid field paths (for editor warnings on unknown fields) */
  knownFields?: string[];
  /** Additional function names beyond the defaults */
  knownFunctions?: string[];
}

/**
 * Parse an infix expression into JSONLogic.
 * Returns `true` for empty input (always-true, useful for table wildcards).
 */
export function parseExpression(input: string, options?: ParseOptions): any {
  const trimmed = input.trim();
  if (!trimmed) return true;
  const tokens = tokenize(trimmed);
  return new Parser(tokens, options).parse();
}

/**
 * Validate an expression. Returns null if valid, ExpressionError if invalid.
 */
export function validateExpression(input: string, options?: ParseOptions): ExpressionError | null {
  try {
    parseExpression(input, options);
    return null;
  } catch (e) {
    if (e instanceof ExpressionError) return e;
    return new ExpressionError(String(e), 0);
  }
}
```

### ✅ STEP 4 Validation — Expression Parser Tests

```typescript
// src/engine/__tests__/expressionParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseExpression, ExpressionError } from '../expressionParser';

describe('expressionParser', () => {
  // ── Comparisons ──
  it('simple comparison: age > 18', () => {
    expect(parseExpression('age > 18')).toEqual({ '>': [{ var: 'age' }, 18] });
  });

  it('equality: tier == "gold"', () => {
    expect(parseExpression('tier == "gold"')).toEqual({ '==': [{ var: 'tier' }, 'gold'] });
  });

  it('not equal: status != "blocked"', () => {
    expect(parseExpression('status != "blocked"')).toEqual({ '!=': [{ var: 'status' }, 'blocked'] });
  });

  it('less than or equal: score <= 100', () => {
    expect(parseExpression('score <= 100')).toEqual({ '<=': [{ var: 'score' }, 100] });
  });

  // ── Boolean logic ──
  it('and: age > 18 and active == true', () => {
    expect(parseExpression('age > 18 and active == true')).toEqual({
      and: [{ '>': [{ var: 'age' }, 18] }, { '==': [{ var: 'active' }, true] }],
    });
  });

  it('or: x > 1 or y > 1', () => {
    expect(parseExpression('x > 1 or y > 1')).toEqual({
      or: [{ '>': [{ var: 'x' }, 1] }, { '>': [{ var: 'y' }, 1] }],
    });
  });

  it('not: not(is_blocked)', () => {
    expect(parseExpression('not(is_blocked)')).toEqual({ '!': [{ var: 'is_blocked' }] });
  });

  it('flattens chained ANDs: a > 1 and b > 2 and c > 3', () => {
    const result = parseExpression('a > 1 and b > 2 and c > 3');
    expect(result.and).toHaveLength(3);
  });

  it('flattens chained ORs: a > 1 or b > 2 or c > 3', () => {
    const result = parseExpression('a > 1 or b > 2 or c > 3');
    expect(result.or).toHaveLength(3);
  });

  it('mixed and/or with parentheses: (a > 1 or b > 2) and c > 3', () => {
    const result = parseExpression('(a > 1 or b > 2) and c > 3');
    expect(result).toEqual({
      and: [
        { or: [{ '>': [{ var: 'a' }, 1] }, { '>': [{ var: 'b' }, 2] }] },
        { '>': [{ var: 'c' }, 3] },
      ],
    });
  });

  // ── Special operators ──
  it('in: country in ["US", "CA"]', () => {
    expect(parseExpression('country in ["US", "CA"]')).toEqual({
      in: [{ var: 'country' }, ['US', 'CA']],
    });
  });

  it('between: age between 18 and 65', () => {
    expect(parseExpression('age between 18 and 65')).toEqual({
      and: [{ '>=': [{ var: 'age' }, 18] }, { '<=': [{ var: 'age' }, 65] }],
    });
  });

  it('contains: name contains "john"', () => {
    expect(parseExpression('name contains "john"')).toEqual({
      contains: [{ var: 'name' }, 'john'],
    });
  });

  it('startsWith: email startsWith "admin"', () => {
    expect(parseExpression('email startsWith "admin"')).toEqual({
      startsWith: [{ var: 'email' }, 'admin'],
    });
  });

  it('endsWith: email endsWith ".gov"', () => {
    expect(parseExpression('email endsWith ".gov"')).toEqual({
      endsWith: [{ var: 'email' }, '.gov'],
    });
  });

  // ── Arithmetic ──
  it('multiply: quantity * price', () => {
    expect(parseExpression('quantity * price')).toEqual({
      '*': [{ var: 'quantity' }, { var: 'price' }],
    });
  });

  it('precedence: a + b * c = a + (b*c)', () => {
    expect(parseExpression('a + b * c')).toEqual({
      '+': [{ var: 'a' }, { '*': [{ var: 'b' }, { var: 'c' }] }],
    });
  });

  it('unary minus: -5', () => {
    expect(parseExpression('-5')).toEqual(-5);
  });

  it('unary minus on var: -balance', () => {
    expect(parseExpression('-balance')).toEqual({ '-': [0, { var: 'balance' }] });
  });

  // ── Functions ──
  it('round(total * 1.08, 2)', () => {
    expect(parseExpression('round(total * 1.08, 2)')).toEqual({
      round: [{ '*': [{ var: 'total' }, 1.08] }, 2],
    });
  });

  it('min(a, b)', () => {
    expect(parseExpression('min(a, b)')).toEqual({ min: [{ var: 'a' }, { var: 'b' }] });
  });

  it('len(name)', () => {
    expect(parseExpression('len(name)')).toEqual({ len: [{ var: 'name' }] });
  });

  it('nested functions: round(avg(scores), 1)', () => {
    expect(parseExpression('round(avg(scores), 1)')).toEqual({
      round: [{ avg: [{ var: 'scores' }] }, 1],
    });
  });

  // ── Literals ──
  it('null comparison: email == null', () => {
    expect(parseExpression('email == null')).toEqual({ '==': [{ var: 'email' }, null] });
  });

  it('boolean literal: active == true', () => {
    expect(parseExpression('active == true')).toEqual({ '==': [{ var: 'active' }, true] });
  });

  it('string with escapes: name == "O\'Brien"', () => {
    expect(parseExpression("name == \"O'Brien\"")).toEqual({ '==': [{ var: 'name' }, "O'Brien"] });
  });

  // ── Pipeline step references ──
  it('$.subtotal * 0.08', () => {
    expect(parseExpression('$.subtotal * 0.08')).toEqual({
      '*': [{ var: '$.subtotal' }, 0.08],
    });
  });

  it('$.final_price < 500 and customer.tier == "gold"', () => {
    expect(parseExpression('$.final_price < 500 and customer.tier == "gold"')).toEqual({
      and: [
        { '<': [{ var: '$.final_price' }, 500] },
        { '==': [{ var: 'customer.tier' }, 'gold'] },
      ],
    });
  });

  // ── Nested property access ──
  it('customer.address.country == "US"', () => {
    expect(parseExpression('customer.address.country == "US"')).toEqual({
      '==': [{ var: 'customer.address.country' }, 'US'],
    });
  });

  // ── Empty input ──
  it('empty input returns true', () => {
    expect(parseExpression('')).toBe(true);
    expect(parseExpression('  ')).toBe(true);
  });

  // ── Error cases ──
  it('unterminated string throws with position', () => {
    expect(() => parseExpression('name == "hello')).toThrow(ExpressionError);
  });

  it('unexpected character throws with position', () => {
    expect(() => parseExpression('age @ 18')).toThrow(ExpressionError);
  });

  it('unexpected token at end throws', () => {
    expect(() => parseExpression('age > 18 +')).toThrow(ExpressionError);
  });
});
```

```
□ Run: npx vitest run src/engine/__tests__/expressionParser.test.ts
  Expected: All tests pass
```

---

## 9. STEP 5 — Expression Decompiler

### Acceptance Criteria
- [ ] Converts JSONLogic back to human-readable infix expression
- [ ] Roundtrip: parse("age > 18") → JSONLogic → decompile → "age > 18"
- [ ] Detects `between` pattern from AND with >= and <=
- [ ] Correct operator precedence in output (adds parens when needed)

### ⚠️ BUG FIX: Between-Pattern Detection Order

The original plan had a bug where the `between` pattern detector was placed AFTER the general `and` handler, making it dead code. The fix below checks for `between` FIRST.

```typescript
// src/engine/expressionDecompiler.ts

/**
 * Converts JSONLogic back to a human-readable infix expression.
 *
 * @example
 *   decompileExpression({ and: [{ ">": [{"var":"age"}, 18] }, { "==": [{"var":"tier"}, "gold"] }] })
 *   → 'age > 18 and tier == "gold"'
 */
export function decompileExpression(logic: any): string {
  if (logic === null) return 'null';
  if (logic === true) return 'true';
  if (logic === false) return 'false';
  if (typeof logic === 'number') return String(logic);
  if (typeof logic === 'string') return `"${escapeString(logic)}"`;
  if (Array.isArray(logic)) return '[' + logic.map(decompileExpression).join(', ') + ']';
  if (typeof logic !== 'object') return String(logic);

  const keys = Object.keys(logic);
  if (keys.length !== 1) return JSON.stringify(logic);

  const op = keys[0];
  const args: any[] = Array.isArray(logic[op]) ? logic[op] : [logic[op]];

  // Variable reference
  if (op === 'var') return String(args[0]);

  // ⚠️ BUG FIX: Check between pattern BEFORE general and/or handlers
  if (op === 'and' && args.length === 2 && isBetweenPattern(args)) {
    const field = decompileExpression(args[0]['>='][0]);
    const low = decompileExpression(args[0]['>='][1]);
    const high = decompileExpression(args[1]['<='][1]);
    return `${field} between ${low} and ${high}`;
  }

  // Boolean connectives
  if (op === 'and') return args.map((a) => wrapIfLowerPrecedence(a, 'and')).join(' and ');
  if (op === 'or') return args.map((a) => wrapIfLowerPrecedence(a, 'or')).join(' or ');
  if (op === '!') return `not(${decompileExpression(args[0])})`;

  // Comparisons
  if (['==', '!=', '>', '>=', '<', '<='].includes(op)) {
    return `${decompileExpression(args[0])} ${op} ${decompileExpression(args[1])}`;
  }

  // "in" operator
  if (op === 'in') return `${decompileExpression(args[0])} in ${decompileExpression(args[1])}`;

  // Arithmetic
  if (['+', '-', '*', '/', '%'].includes(op)) {
    // Special case: unary minus → { "-": [0, expr] }
    if (op === '-' && args.length === 2 && args[0] === 0) {
      return `-${wrapIfLowerPrecedence(args[1], op)}`;
    }
    return `${wrapIfLowerPrecedence(args[0], op)} ${op} ${wrapIfLowerPrecedence(args[1], op)}`;
  }

  // String operators
  if (op === 'contains') return `${decompileExpression(args[0])} contains ${decompileExpression(args[1])}`;
  if (op === 'startsWith') return `${decompileExpression(args[0])} startsWith ${decompileExpression(args[1])}`;
  if (op === 'endsWith') return `${decompileExpression(args[0])} endsWith ${decompileExpression(args[1])}`;

  // if/then/else
  if (op === 'if') return `if(${args.map(decompileExpression).join(', ')})`;

  // Everything else → function call syntax
  return `${op}(${args.map(decompileExpression).join(', ')})`;
}


// ── Helpers ──

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

const PRECEDENCE: Record<string, number> = {
  or: 1, and: 2,
  '==': 4, '!=': 4, '>': 4, '>=': 4, '<': 4, '<=': 4, in: 4,
  contains: 4, startsWith: 4, endsWith: 4,
  '+': 5, '-': 5, '*': 6, '/': 6, '%': 6,
};

function getPrecedence(logic: any): number {
  if (typeof logic !== 'object' || logic === null || Array.isArray(logic)) return 99;
  const op = Object.keys(logic)[0];
  return PRECEDENCE[op] ?? 99;
}

function wrapIfLowerPrecedence(logic: any, parentOp: string): string {
  const inner = decompileExpression(logic);
  const parentPrec = PRECEDENCE[parentOp] ?? 99;
  const childPrec = getPrecedence(logic);
  if (childPrec < parentPrec) return `(${inner})`;
  return inner;
}

function isBetweenPattern(args: any[]): boolean {
  if (args.length !== 2) return false;
  const a = args[0], b = args[1];
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== 1 || bKeys.length !== 1) return false;
  if (aKeys[0] !== '>=' || bKeys[0] !== '<=') return false;
  return JSON.stringify(a['>='][0]) === JSON.stringify(b['<='][0]);
}
```

### ✅ STEP 5 Validation — Roundtrip Tests

```typescript
// src/engine/__tests__/expressionDecompiler.test.ts
import { describe, it, expect } from 'vitest';
import { parseExpression } from '../expressionParser';
import { decompileExpression } from '../expressionDecompiler';

describe('expressionDecompiler', () => {
  // ── Roundtrip tests: parse → decompile → parse again ──
  const roundtripCases = [
    'age > 18',
    'tier == "gold"',
    'status != "blocked"',
    'age > 18 and tier == "gold"',
    'x > 1 or y > 1',
    'not(is_blocked)',
    'country in ["US", "CA"]',
    'age between 18 and 65',
    'name contains "john"',
    'email startsWith "admin"',
    'quantity * price',
    'a + b * c',
    'round(total, 2)',
    'email == null',
    '$.subtotal * 0.08',
    '(a > 1 or b > 2) and c > 3',
  ];

  roundtripCases.forEach((expr) => {
    it(`roundtrip: ${expr}`, () => {
      const jsonLogic = parseExpression(expr);
      const decompiled = decompileExpression(jsonLogic);
      const reparsed = parseExpression(decompiled);
      expect(reparsed).toEqual(jsonLogic);
    });
  });

  // ── Specific decompilation tests ──
  it('between pattern detected from JSONLogic', () => {
    const logic = { and: [{ '>=': [{ var: 'age' }, 18] }, { '<=': [{ var: 'age' }, 65] }] };
    expect(decompileExpression(logic)).toBe('age between 18 and 65');
  });

  it('three-way AND is not mistaken for between', () => {
    const logic = { and: [
      { '>=': [{ var: 'age' }, 18] },
      { '<=': [{ var: 'age' }, 65] },
      { '==': [{ var: 'active' }, true] },
    ]};
    const result = decompileExpression(logic);
    expect(result).not.toContain('between');
  });

  it('negative number: -5', () => {
    expect(decompileExpression(-5)).toBe('-5');
  });
});
```

```
□ Run: npx vitest run src/engine/__tests__/expressionDecompiler.test.ts
  Expected: All tests pass, including roundtrip for all expressions
```

---

## 10. STEP 6 — Expression Input Component

### Acceptance Criteria
- [ ] Textarea with debounced validation
- [ ] Inline error messages with character position
- [ ] Field autocomplete suggestions
- [ ] Collapsed JSONLogic preview
- [ ] Emits JSONLogic onChange when expression is valid
- [ ] Initializes from JSONLogic via decompiler

```typescript
// src/components/ExpressionInput.tsx
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { parseExpression, validateExpression, ExpressionError } from '../engine/expressionParser';
import { decompileExpression } from '../engine/expressionDecompiler';

interface ExpressionInputProps {
  /** Initial expression text or JSONLogic to decompile */
  initialValue?: string | object;
  /** Field paths for autocomplete */
  fields: { name: string; label: string }[];
  /** Called with compiled JSONLogic when expression is valid */
  onJsonLogicChange: (logic: any | null) => void;
  /** Placeholder text */
  placeholder?: string;
  disabled?: boolean;
}

export function ExpressionInput({
  initialValue,
  fields,
  onJsonLogicChange,
  placeholder = 'age > 18 and tier == "gold"',
  disabled = false,
}: ExpressionInputProps) {
  const [text, setText] = useState<string>(() => {
    if (!initialValue) return '';
    if (typeof initialValue === 'string') return initialValue;
    try { return decompileExpression(initialValue); } catch { return ''; }
  });
  const [error, setError] = useState<ExpressionError | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [jsonLogic, setJsonLogic] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fieldNames = useMemo(() => fields.map((f) => f.name), [fields]);

  // Debounced validation
  const validate = useCallback(
    (expr: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const err = validateExpression(expr, { knownFields: fieldNames });
        setError(err);
        if (!err) {
          const logic = parseExpression(expr, { knownFields: fieldNames });
          setJsonLogic(logic);
          onJsonLogicChange(logic);
        } else {
          setJsonLogic(null);
          onJsonLogicChange(null);
        }
      }, 300);
    },
    [fieldNames, onJsonLogicChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      validate(newText);

      // Simple autocomplete: find the last word being typed
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = newText.slice(0, cursorPos);
      const lastWord = textBeforeCursor.match(/[a-zA-Z_$.]+$/)?.[0] || '';
      if (lastWord.length >= 2) {
        const matches = fieldNames.filter((f) =>
          f.toLowerCase().startsWith(lastWord.toLowerCase())
        );
        setSuggestions(matches.slice(0, 5));
        setShowSuggestions(matches.length > 0);
      } else {
        setShowSuggestions(false);
      }
    },
    [validate, fieldNames]
  );

  const applySuggestion = useCallback(
    (suggestion: string) => {
      if (!textareaRef.current) return;
      const cursorPos = textareaRef.current.selectionStart;
      const textBeforeCursor = text.slice(0, cursorPos);
      const lastWord = textBeforeCursor.match(/[a-zA-Z_$.]+$/)?.[0] || '';
      const newText = text.slice(0, cursorPos - lastWord.length) + suggestion + text.slice(cursorPos);
      setText(newText);
      validate(newText);
      setShowSuggestions(false);
      textareaRef.current.focus();
    },
    [text, validate]
  );

  // Update when initialValue changes externally
  useEffect(() => {
    if (initialValue && typeof initialValue === 'object') {
      try {
        const decompiled = decompileExpression(initialValue);
        setText(decompiled);
        validate(decompiled);
      } catch { /* ignore */ }
    }
  }, [initialValue, validate]);

  return (
    <div className="expression-input">
      <div className="expression-textarea-wrapper">
        <textarea
          ref={textareaRef}
          className={`expression-textarea ${error ? 'expression-error' : text.trim() ? 'expression-valid' : ''}`}
          value={text}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          spellCheck={false}
        />
        {/* Error display with position */}
        {error && (
          <div className="expression-error-msg">
            ❌ {error.message}
            {error.pos > 0 && (
              <div className="expression-error-pointer">
                <code>{text.slice(0, error.pos)}<span className="error-caret">▲</span>{text.slice(error.pos)}</code>
              </div>
            )}
          </div>
        )}
        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <div className="expression-suggestions">
            {suggestions.map((s) => (
              <div key={s} className="suggestion-item" onMouseDown={() => applySuggestion(s)}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JSONLogic preview */}
      {jsonLogic && (
        <div className="expression-preview">
          <button
            className="preview-toggle"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '▼' : '▶'} JSONLogic Preview
          </button>
          {showPreview && (
            <pre className="preview-json">{JSON.stringify(jsonLogic, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
```

### ✅ STEP 6 Validation

```
□ Render <ExpressionInput fields={ruleFields} onJsonLogicChange={console.log} />

□ Type: age > 18
  Expected: No error, console shows { ">": [{"var":"age"}, 18] }

□ Type: age >>
  Expected: Red error message with position indicator

□ Type: cust  (wait 300ms)
  Expected: Autocomplete shows "customer.age", "customer.tier", etc.

□ Press Tab or click a suggestion
  Expected: Field name completed, expression re-validated

□ Pass initialValue={{ ">": [{"var":"age"}, 18] }}
  Expected: Textarea shows "age > 18"
```

---

## 11. STEP 7 — Decision Table Types & Cell Compiler (Tier 2)

### Acceptance Criteria
- [ ] Cell expressions parse correctly: `*`, `> 100`, `100..500`, `US, CA`, `!= blocked`, `"gold"`
- [ ] Wildcard cells (`*` or empty) return `true`
- [ ] Range cells (`100..500`) compile to AND of >= and <=
- [ ] Typed parsing respects column dataType

```typescript
// src/engine/cellCompiler.ts

/**
 * Compiles a single cell expression from a decision table into JSONLogic.
 *
 * Business users type shorthand in cells:
 *   ""  or  "*"       → true (wildcard, always match)
 *   "gold"            → { "==": [fieldRef, "gold"] }
 *   "> 100"           → { ">":  [fieldRef, 100] }
 *   ">= 50"           → { ">=": [fieldRef, 50] }
 *   "100..500"         → { "and": [{ ">=": [fieldRef, 100] }, { "<=": [fieldRef, 500] }] }
 *   "US, CA, UK"       → { "in": [fieldRef, ["US", "CA", "UK"]] }
 *   "!= blocked"       → { "!=": [fieldRef, "blocked"] }
 */
export function compileCellToJsonLogic(
  fieldPath: string,
  cellValue: string,
  dataType: string = 'string'
): any {
  const trimmed = cellValue.trim();
  const fieldRef = { var: fieldPath };

  // Wildcard — always matches
  if (!trimmed || trimmed === '*') return true;

  // Comparison operators: >=, <=, !=, >, <
  const compMatch = trimmed.match(/^(>=|<=|!=|>|<)\s*(.+)$/);
  if (compMatch) {
    const [, op, val] = compMatch;
    return { [op]: [fieldRef, parseTyped(val.trim(), dataType)] };
  }

  // Range: 100..500
  if (trimmed.includes('..')) {
    const [loStr, hiStr] = trimmed.split('..').map((s) => s.trim());
    const lo = parseTyped(loStr, dataType);
    const hi = parseTyped(hiStr, dataType);
    return {
      and: [
        { '>=': [fieldRef, lo] },
        { '<=': [fieldRef, hi] },
      ],
    };
  }

  // List: value1, value2, value3
  if (trimmed.includes(',')) {
    const values = trimmed.split(',').map((v) => parseTyped(v.trim(), dataType));
    return { in: [fieldRef, values] };
  }

  // Boolean
  if (dataType === 'boolean' || trimmed === 'true' || trimmed === 'false') {
    return { '==': [fieldRef, trimmed === 'true'] };
  }

  // Exact match
  return { '==': [fieldRef, parseTyped(trimmed, dataType)] };
}

function parseTyped(value: string, dataType: string): string | number | boolean {
  // Strip quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (dataType === 'number') {
    const n = Number(value);
    if (isNaN(n)) throw new Error(`Invalid number: "${value}"`);
    return n;
  }
  if (dataType === 'boolean') return value === 'true';
  // Auto-detect numbers
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  return value;
}
```

### ✅ STEP 7 Validation

```typescript
// src/engine/__tests__/cellCompiler.test.ts
import { describe, it, expect } from 'vitest';
import { compileCellToJsonLogic } from '../cellCompiler';

describe('cellCompiler', () => {
  it('empty cell → wildcard (true)', () => {
    expect(compileCellToJsonLogic('tier', '', 'string')).toBe(true);
  });

  it('star → wildcard', () => {
    expect(compileCellToJsonLogic('tier', '*', 'string')).toBe(true);
  });

  it('exact match string', () => {
    expect(compileCellToJsonLogic('tier', 'gold', 'string')).toEqual({
      '==': [{ var: 'tier' }, 'gold'],
    });
  });

  it('exact match number', () => {
    expect(compileCellToJsonLogic('total', '100', 'number')).toEqual({
      '==': [{ var: 'total' }, 100],
    });
  });

  it('greater than', () => {
    expect(compileCellToJsonLogic('total', '> 100', 'number')).toEqual({
      '>': [{ var: 'total' }, 100],
    });
  });

  it('greater than or equal', () => {
    expect(compileCellToJsonLogic('total', '>= 50', 'number')).toEqual({
      '>=': [{ var: 'total' }, 50],
    });
  });

  it('not equal', () => {
    expect(compileCellToJsonLogic('status', '!= blocked', 'string')).toEqual({
      '!=': [{ var: 'status' }, 'blocked'],
    });
  });

  it('range: 100..500', () => {
    expect(compileCellToJsonLogic('total', '100..500', 'number')).toEqual({
      and: [
        { '>=': [{ var: 'total' }, 100] },
        { '<=': [{ var: 'total' }, 500] },
      ],
    });
  });

  it('list: US, CA, UK', () => {
    expect(compileCellToJsonLogic('country', 'US, CA, UK', 'string')).toEqual({
      in: [{ var: 'country' }, ['US', 'CA', 'UK']],
    });
  });

  it('boolean true', () => {
    expect(compileCellToJsonLogic('active', 'true', 'boolean')).toEqual({
      '==': [{ var: 'active' }, true],
    });
  });

  it('quoted string preserves value', () => {
    expect(compileCellToJsonLogic('name', '"John"', 'string')).toEqual({
      '==': [{ var: 'name' }, 'John'],
    });
  });
});
```

```
□ Run: npx vitest run src/engine/__tests__/cellCompiler.test.ts
  Expected: All 11 tests pass
```

---

## 12. STEP 8 — Table-to-JSONLogic Compiler

### Acceptance Criteria
- [ ] "first" hit policy compiles to nested if/elseif/else
- [ ] "collect" hit policy compiles to filtered results
- [ ] Wildcard rows become the default/else
- [ ] Single output column returns values directly
- [ ] Multiple output columns return objects

### ⚠️ BUG FIX: Collect Hit Policy

The original plan used `filter` on a static array, which doesn't work in standard JSONLogic (`filter` expects a data reference + condition, not a literal array). The fix uses a custom `collect` operator.

```typescript
// src/engine/tableCompiler.ts
import { DecisionTable, DecisionTableColumn, DecisionTableRow } from '../types/decisionTable';
import { compileCellToJsonLogic } from './cellCompiler';

/**
 * Compiles a DecisionTable into a single JSONLogic rule.
 *
 * Hit policy "first": nested if/elseif/else chain — first matching row wins.
 * Hit policy "collect": returns all matching row outputs as an array.
 */
export function compileTableToJsonLogic(table: DecisionTable): any {
  if (table.rows.length === 0) return null;

  const inputCols = table.columns.filter((c) => c.type === 'input');
  const outputCols = table.columns.filter((c) => c.type === 'output');

  if (table.hitPolicy === 'first') {
    return compileFirstMatch(table.rows, inputCols, outputCols);
  } else {
    return compileCollect(table.rows, inputCols, outputCols);
  }
}

function compileFirstMatch(
  rows: DecisionTableRow[],
  inputCols: DecisionTableColumn[],
  outputCols: DecisionTableColumn[]
): any {
  // Build: { "if": [cond1, out1, cond2, out2, ..., fallbackOrNull] }
  const ifArray: any[] = [];

  for (const row of rows) {
    const condition = compileRowCondition(row, inputCols);
    const output = compileRowOutput(row, outputCols);

    if (condition === true) {
      // Catch-all row — use as final else value
      ifArray.push(output);
      return { if: ifArray };
    }
    ifArray.push(condition, output);
  }

  ifArray.push(null); // no catch-all → default null
  return { if: ifArray };
}

function compileCollect(
  rows: DecisionTableRow[],
  inputCols: DecisionTableColumn[],
  outputCols: DecisionTableColumn[]
): any {
  // Collect all matching results. Standard JSONLogic's "filter" operates on data arrays,
  // not static arrays, so we use a pattern where each row contributes conditionally:
  //   { "collect_table": [ [cond1, out1], [cond2, out2], ... ] }
  //
  // At runtime, register a "collect_table" custom operator that evaluates conditions
  // against the current data and returns matching outputs.
  //
  // Alternatively, for pure-JSONLogic compatibility (no custom operator), compile to
  // a "reduce" over a static array that accumulates matches. But reduce on static
  // arrays is awkward in JSONLogic, so we use the custom operator.
  //
  // Register this in customOperators.ts (shown below).

  const pairs = rows.map((row) => {
    const condition = compileRowCondition(row, inputCols);
    const output = compileRowOutput(row, outputCols);
    return [condition, output];
  });

  return { collect_table: pairs };
}


function compileRowCondition(
  row: DecisionTableRow,
  inputCols: DecisionTableColumn[]
): any | true {
  const conditions: any[] = [];

  for (const col of inputCols) {
    const cellValue = row.cells[col.id] || '';
    const compiled = compileCellToJsonLogic(col.field, cellValue, col.dataType);
    if (compiled !== true) conditions.push(compiled);
  }

  if (conditions.length === 0) return true;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}


function compileRowOutput(
  row: DecisionTableRow,
  outputCols: DecisionTableColumn[]
): any {
  if (outputCols.length === 1) {
    const col = outputCols[0];
    const raw = row.cells[col.id] || '';
    return parseOutputValue(raw, col.dataType);
  }
  const output: Record<string, any> = {};
  for (const col of outputCols) {
    output[col.field] = parseOutputValue(row.cells[col.id] || '', col.dataType);
  }
  return output;
}


function parseOutputValue(value: string, dataType?: string): any {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (dataType === 'number') return Number(trimmed);
  if (dataType === 'boolean') return trimmed === 'true';
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return trimmed;
}
```

**Add the `collect_table` operator to customOperators.ts:**

```typescript
// Add to registerCustomOperators() in src/config/customOperators.ts

  // ── 8. Decision table "collect" operator ──
  // Evaluates an array of [condition, output] pairs against current data.
  // Returns array of outputs where conditions are true.
  jsonLogic.add_operation('collect_table', function(this: any, ...pairsRaw: any[]) {
    // json-logic-js calls the operator with the resolved arguments.
    // But since conditions are JSONLogic themselves, we need to evaluate them manually.
    // We receive the pairs already evaluated (depth-first), so conditions resolve to booleans.
    const results: any[] = [];
    for (let i = 0; i < pairsRaw.length; i++) {
      const pair = pairsRaw[i];
      if (Array.isArray(pair) && pair.length === 2) {
        const [condition, output] = pair;
        if (condition === true || condition) {
          results.push(output);
        }
      }
    }
    return results;
  });
```

> **Note for other-language runtimes:** If you evaluate rules in Python/Go/Java, you'd register `collect_table` there too, or compile collect tables differently (e.g., multiple separate JSONLogic evaluations server-side). For "first" hit policy, the compiled `if` chain is standard JSONLogic and works everywhere with zero custom operators.

### ✅ STEP 8 Validation

```typescript
// src/engine/__tests__/tableCompiler.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import jsonLogic from 'json-logic-js';
import { compileTableToJsonLogic } from '../tableCompiler';
import { registerCustomOperators } from '../../config/customOperators';
import type { DecisionTable } from '../../types/decisionTable';

beforeAll(() => registerCustomOperators());

const discountTable: DecisionTable = {
  id: 'test-discount',
  name: 'Discount Table',
  hitPolicy: 'first',
  columns: [
    { id: 'c1', type: 'input', field: 'customer.tier', label: 'Tier', dataType: 'string' },
    { id: 'c2', type: 'input', field: 'order.total', label: 'Total', dataType: 'number' },
    { id: 'c3', type: 'output', field: 'discount', label: 'Discount %', dataType: 'number' },
  ],
  rows: [
    { id: 'r1', cells: { c1: 'gold', c2: '> 100', c3: '20' } },
    { id: 'r2', cells: { c1: 'gold', c2: '*', c3: '10' } },
    { id: 'r3', cells: { c1: 'silver', c2: '> 200', c3: '15' } },
    { id: 'r4', cells: { c1: '*', c2: '*', c3: '0' } },
  ],
};

describe('tableCompiler', () => {
  it('compiles first-match table to if chain', () => {
    const rule = compileTableToJsonLogic(discountTable);
    expect(rule).toBeTruthy();
    expect(rule).toHaveProperty('if');
  });

  it('evaluates gold + $150 → 20% discount', () => {
    const rule = compileTableToJsonLogic(discountTable)!;
    const result = jsonLogic.apply(rule, { customer: { tier: 'gold' }, order: { total: 150 } });
    expect(result).toBe(20);
  });

  it('evaluates gold + $50 → 10% discount (falls through to row 2)', () => {
    const rule = compileTableToJsonLogic(discountTable)!;
    const result = jsonLogic.apply(rule, { customer: { tier: 'gold' }, order: { total: 50 } });
    expect(result).toBe(10);
  });

  it('evaluates silver + $300 → 15%', () => {
    const rule = compileTableToJsonLogic(discountTable)!;
    const result = jsonLogic.apply(rule, { customer: { tier: 'silver' }, order: { total: 300 } });
    expect(result).toBe(15);
  });

  it('evaluates bronze + $50 → 0% (catch-all)', () => {
    const rule = compileTableToJsonLogic(discountTable)!;
    const result = jsonLogic.apply(rule, { customer: { tier: 'bronze' }, order: { total: 50 } });
    expect(result).toBe(0);
  });

  it('empty table returns null', () => {
    const empty: DecisionTable = { ...discountTable, rows: [] };
    expect(compileTableToJsonLogic(empty)).toBeNull();
  });
});
```

```
□ Run: npx vitest run src/engine/__tests__/tableCompiler.test.ts
  Expected: All 6 tests pass
```

---

## 13. STEP 9 — Decision Table Editor UI

### Acceptance Criteria
- [ ] Spreadsheet-style grid with inline cell editing
- [ ] Add/remove columns and rows
- [ ] Hit policy selector (first/collect)
- [ ] Cell validation (red border on invalid cell expressions)
- [ ] Compiles to JSONLogic on every change
- [ ] CSV import/export

```tsx
// src/components/DecisionTableEditor.tsx
import { useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { DecisionTable, DecisionTableColumn, DecisionTableRow } from '../types/decisionTable';
import { compileTableToJsonLogic } from '../engine/tableCompiler';
import { compileCellToJsonLogic } from '../engine/cellCompiler';

interface DecisionTableEditorProps {
  initialTable: DecisionTable;
  onJsonLogicChange: (jsonLogic: any) => void;
  onTableChange?: (table: DecisionTable) => void;
  disabled?: boolean;
}

export function DecisionTableEditor({
  initialTable,
  onJsonLogicChange,
  onTableChange,
  disabled = false,
}: DecisionTableEditorProps) {
  const [table, setTable] = useState<DecisionTable>(initialTable);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

  const validateCell = useCallback(
    (colId: string, value: string): string | null => {
      const col = table.columns.find((c) => c.id === colId);
      if (!col || col.type === 'output') return null;
      try {
        compileCellToJsonLogic(col.field, value, col.dataType);
        return null;
      } catch (e: any) {
        return e.message;
      }
    },
    [table.columns]
  );

  const updateTable = useCallback(
    (newTable: DecisionTable) => {
      setTable(newTable);
      onTableChange?.(newTable);
      try {
        const compiled = compileTableToJsonLogic(newTable);
        onJsonLogicChange(compiled);
      } catch (e) {
        console.warn('Table compilation failed:', e);
      }
    },
    [onJsonLogicChange, onTableChange]
  );

  const updateCell = useCallback(
    (rowId: string, colId: string, value: string) => {
      const cellKey = `${rowId}:${colId}`;
      const err = validateCell(colId, value);
      setCellErrors((prev) => {
        const next = { ...prev };
        if (err) next[cellKey] = err; else delete next[cellKey];
        return next;
      });

      const newTable = {
        ...table,
        rows: table.rows.map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
        ),
      };
      updateTable(newTable);
    },
    [table, updateTable, validateCell]
  );

  // ── Row management ──
  const addRow = useCallback(() => {
    const newRow: DecisionTableRow = {
      id: `row-${Date.now()}`,
      cells: Object.fromEntries(table.columns.map((c) => [c.id, ''])),
    };
    updateTable({ ...table, rows: [...table.rows, newRow] });
  }, [table, updateTable]);

  const removeRow = useCallback(
    (rowId: string) => {
      updateTable({ ...table, rows: table.rows.filter((r) => r.id !== rowId) });
    },
    [table, updateTable]
  );

  const moveRow = useCallback(
    (rowId: string, direction: 'up' | 'down') => {
      const idx = table.rows.findIndex((r) => r.id === rowId);
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= table.rows.length) return;
      const rows = [...table.rows];
      [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
      updateTable({ ...table, rows });
    },
    [table, updateTable]
  );

  // ── Column management ──
  const addColumn = useCallback(
    (type: 'input' | 'output') => {
      const newCol: DecisionTableColumn = {
        id: `col-${Date.now()}`,
        type,
        field: '',
        label: type === 'input' ? 'New Condition' : 'New Output',
        dataType: 'string',
      };
      const newTable = {
        ...table,
        columns: [...table.columns, newCol],
        rows: table.rows.map((r) => ({ ...r, cells: { ...r.cells, [newCol.id]: '' } })),
      };
      updateTable(newTable);
    },
    [table, updateTable]
  );

  const removeColumn = useCallback(
    (colId: string) => {
      const newTable = {
        ...table,
        columns: table.columns.filter((c) => c.id !== colId),
        rows: table.rows.map((r) => {
          const cells = { ...r.cells };
          delete cells[colId];
          return { ...r, cells };
        }),
      };
      updateTable(newTable);
    },
    [table, updateTable]
  );

  const updateColumnMeta = useCallback(
    (colId: string, updates: Partial<DecisionTableColumn>) => {
      updateTable({
        ...table,
        columns: table.columns.map((c) => (c.id === colId ? { ...c, ...updates } : c)),
      });
    },
    [table, updateTable]
  );

  // ── TanStack Table setup ──
  const columnHelper = createColumnHelper<DecisionTableRow>();

  const columns = useMemo(
    () => [
      // Row number + controls
      columnHelper.display({
        id: 'row-controls',
        header: () => '#',
        cell: ({ row }) => (
          <div className="row-controls">
            <span className="row-number">{row.index + 1}</span>
            {!disabled && (
              <>
                <button onClick={() => moveRow(row.original.id, 'up')} title="Move up">↑</button>
                <button onClick={() => moveRow(row.original.id, 'down')} title="Move down">↓</button>
                <button onClick={() => removeRow(row.original.id)} title="Remove row" className="danger">×</button>
              </>
            )}
          </div>
        ),
        size: 80,
      }),
      // Data columns
      ...table.columns.map((col) =>
        columnHelper.accessor((row) => row.cells[col.id] || '', {
          id: col.id,
          header: () => (
            <div className={`col-header col-header-${col.type}`}>
              <span className="col-type-badge">{col.type === 'input' ? 'IF' : 'THEN'}</span>
              {!disabled ? (
                <>
                  <input
                    className="col-label-input"
                    value={col.label}
                    onChange={(e) => updateColumnMeta(col.id, { label: e.target.value })}
                    placeholder="Label"
                  />
                  <input
                    className="col-field-input"
                    value={col.field}
                    onChange={(e) => updateColumnMeta(col.id, { field: e.target.value })}
                    placeholder="field.path"
                  />
                  <select
                    className="col-type-select"
                    value={col.dataType}
                    onChange={(e) => updateColumnMeta(col.id, { dataType: e.target.value as any })}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <button onClick={() => removeColumn(col.id)} className="col-remove" title="Remove column">×</button>
                </>
              ) : (
                <span>{col.label} <code>({col.field})</code></span>
              )}
            </div>
          ),
          cell: ({ row, column }) => {
            const cellKey = `${row.original.id}:${col.id}`;
            const value = row.original.cells[col.id] || '';
            const error = cellErrors[cellKey];
            const isEditing = editingCell?.rowId === row.original.id && editingCell?.colId === col.id;

            if (disabled) return <span className="cell-value">{value || '—'}</span>;

            return (
              <div className={`cell-wrapper ${error ? 'cell-error' : ''}`}>
                {isEditing ? (
                  <input
                    className="cell-input"
                    autoFocus
                    defaultValue={value}
                    onBlur={(e) => {
                      updateCell(row.original.id, col.id, e.target.value);
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                  />
                ) : (
                  <div
                    className="cell-display"
                    onClick={() => setEditingCell({ rowId: row.original.id, colId: col.id })}
                  >
                    {value || <span className="cell-placeholder">*</span>}
                  </div>
                )}
                {error && <div className="cell-error-tooltip">{error}</div>}
              </div>
            );
          },
        })
      ),
    ],
    [table.columns, cellErrors, editingCell, disabled, columnHelper, moveRow, removeRow, updateColumnMeta, removeColumn, updateCell]
  );

  const reactTable = useReactTable({
    data: table.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="decision-table-editor">
      {/* Hit policy selector */}
      <div className="table-controls">
        <label>
          Hit Policy:
          <select
            value={table.hitPolicy}
            onChange={(e) => updateTable({ ...table, hitPolicy: e.target.value as 'first' | 'collect' })}
            disabled={disabled}
          >
            <option value="first">First Match — stop at first matching row</option>
            <option value="collect">Collect All — return all matching row outputs</option>
          </select>
        </label>
        {!disabled && (
          <div className="col-add-buttons">
            <button onClick={() => addColumn('input')}>+ Condition Column</button>
            <button onClick={() => addColumn('output')}>+ Output Column</button>
          </div>
        )}
      </div>

      {/* Syntax help */}
      <details className="syntax-help">
        <summary>Cell Syntax Help</summary>
        <table className="syntax-table">
          <tbody>
            <tr><td><code>*</code> or empty</td><td>Match any value (wildcard)</td></tr>
            <tr><td><code>gold</code></td><td>Exact match</td></tr>
            <tr><td><code>&gt; 100</code></td><td>Greater than 100</td></tr>
            <tr><td><code>&gt;= 50</code></td><td>Greater than or equal 50</td></tr>
            <tr><td><code>100..500</code></td><td>Between 100 and 500 (inclusive)</td></tr>
            <tr><td><code>US, CA, UK</code></td><td>One of these values</td></tr>
            <tr><td><code>!= blocked</code></td><td>Not equal to "blocked"</td></tr>
          </tbody>
        </table>
      </details>

      {/* Table */}
      <div className="table-wrapper">
        <table className="decision-table">
          <thead>
            {reactTable.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} style={{ width: header.getSize() }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {reactTable.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <button className="add-row-button" onClick={addRow}>
          + Add Row
        </button>
      )}
    </div>
  );
}
```

### 13.2 CSV Import/Export

```typescript
// src/engine/csvIO.ts
import { DecisionTable, DecisionTableColumn, DecisionTableRow } from '../types/decisionTable';

/**
 * Export a DecisionTable to CSV string.
 * Row 1: Column labels
 * Row 2: Field paths
 * Row 3: type:dataType
 * Rows 4+: data
 */
export function exportTableToCSV(table: DecisionTable): string {
  const lines: string[] = [];
  lines.push(table.columns.map((c) => csvEscape(c.label)).join(','));
  lines.push(table.columns.map((c) => csvEscape(c.field)).join(','));
  lines.push(table.columns.map((c) => `${c.type}:${c.dataType}`).join(','));
  for (const row of table.rows) {
    lines.push(table.columns.map((c) => csvEscape(row.cells[c.id] || '')).join(','));
  }
  return lines.join('\n');
}

/**
 * Import a CSV string into a DecisionTable.
 */
export function importTableFromCSV(csv: string, tableId?: string): DecisionTable {
  const lines = csv.trim().split('\n').map((l) => parseCSVLine(l));
  if (lines.length < 4) throw new Error('CSV must have at least 4 rows (labels, fields, types, 1+ data rows)');

  const labels = lines[0];
  const fields = lines[1];
  const typeDefs = lines[2];

  const columns: DecisionTableColumn[] = labels.map((label, i) => {
    const [type, dataType] = typeDefs[i].split(':');
    return {
      id: `col-${i}`,
      type: type as 'input' | 'output',
      field: fields[i],
      label,
      dataType: (dataType || 'string') as 'string' | 'number' | 'boolean',
    };
  });

  const rows: DecisionTableRow[] = lines.slice(3).map((cells, i) => ({
    id: `row-${i}`,
    cells: Object.fromEntries(columns.map((col, j) => [col.id, cells[j] || ''])),
  }));

  return {
    id: tableId || `table-${Date.now()}`,
    name: 'Imported Table',
    hitPolicy: 'first',
    columns,
    rows,
  };
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}
```

### ✅ STEP 9 Validation

```
□ Render <DecisionTableEditor initialTable={discountTable} onJsonLogicChange={console.log} />

□ Click a cell, type "gold", press Enter
  Expected: Cell value updates, JSONLogic recompiles in console

□ Click cell, type "invalid!!number", press Enter
  Expected: Cell shows red border with error tooltip

□ Click "+ Add Row"
  Expected: New row appears with empty cells

□ Click "↑" / "↓" on a row
  Expected: Row moves up/down, JSONLogic recompiles (order matters for first-match)

□ Change hit policy to "Collect All"
  Expected: JSONLogic output changes to collect_table format

□ CSV roundtrip:
  const csv = exportTableToCSV(discountTable);
  const reimported = importTableFromCSV(csv);
  Expected: reimported has same columns, fields, and cell values as original
```

---

## 14. STEP 10 — Simulator Panel

### Acceptance Criteria
- [ ] JSON textarea for test data input
- [ ] Run button evaluates the rule
- [ ] Displays result with type info
- [ ] Shows execution time
- [ ] Handles errors gracefully
- [ ] "Generate Sample Data" button populates fields from field definitions

```tsx
// src/components/SimulatorPanel.tsx
import { useState, useCallback } from 'react';
import jsonLogic from 'json-logic-js';
import type { Field } from 'react-querybuilder';

interface SimulatorPanelProps {
  /** Current JSONLogic rule to evaluate */
  jsonLogicRule: any;
  /** Fields — used to generate sample data */
  fields: Field[];
}

export function SimulatorPanel({ jsonLogicRule, fields }: SimulatorPanelProps) {
  const [testData, setTestData] = useState('{\n  \n}');
  const [result, setResult] = useState<{ value: any; type: string; duration: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJsonLogic, setShowJsonLogic] = useState(false);

  const runTest = useCallback(() => {
    setError(null);
    setResult(null);
    try {
      const data = JSON.parse(testData);
      const start = performance.now();
      const value = jsonLogic.apply(jsonLogicRule, data);
      const duration = performance.now() - start;
      setResult({
        value,
        type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
        duration,
      });
    } catch (e: any) {
      setError(e.message);
    }
  }, [jsonLogicRule, testData]);

  const generateSampleData = useCallback(() => {
    const sample: Record<string, any> = {};
    for (const field of fields) {
      const parts = field.name.split('.');
      let obj = sample;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = obj[parts[i]] || {};
        obj = obj[parts[i]];
      }
      const leaf = parts[parts.length - 1];
      if (field.inputType === 'number') obj[leaf] = field.defaultValue ?? 0;
      else if (field.values?.length) obj[leaf] = field.values[0].name;
      else if (field.inputType === 'date') obj[leaf] = new Date().toISOString().split('T')[0];
      else obj[leaf] = field.defaultValue ?? '';
    }
    setTestData(JSON.stringify(sample, null, 2));
  }, [fields]);

  return (
    <div className="simulator-panel">
      <h3>🧪 Test Rule</h3>

      <div className="sim-input">
        <div className="sim-input-header">
          <label>Test Data (JSON):</label>
          <button onClick={generateSampleData} className="sim-generate-btn">
            Generate Sample
          </button>
        </div>
        <textarea
          className="json-input"
          value={testData}
          onChange={(e) => setTestData(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder='{ "customer": { "age": 25, "tier": "gold" } }'
        />
      </div>

      <button
        className="sim-run-btn"
        onClick={runTest}
        disabled={!jsonLogicRule}
      >
        ▶ Run
      </button>

      {/* Result */}
      {result && (
        <div className={`sim-result sim-result-${result.type === 'boolean' ? (result.value ? 'true' : 'false') : 'value'}`}>
          <div className="sim-result-label">Result:</div>
          <div className="sim-result-value">
            <code>{JSON.stringify(result.value)}</code>
          </div>
          <div className="sim-result-meta">
            <span className="sim-type">Type: {result.type}</span>
            <span className="sim-duration">{result.duration.toFixed(2)}ms</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sim-error">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* JSONLogic preview */}
      <div className="sim-preview">
        <button onClick={() => setShowJsonLogic(!showJsonLogic)} className="sim-preview-toggle">
          {showJsonLogic ? '▼' : '▶'} JSONLogic Output
        </button>
        {showJsonLogic && (
          <pre className="sim-preview-json">
            {jsonLogicRule ? JSON.stringify(jsonLogicRule, null, 2) : '(no rule)'}
          </pre>
        )}
      </div>
    </div>
  );
}
```

### ✅ STEP 10 Validation

```
□ Render with a simple rule: jsonLogicRule={{ ">": [{"var":"customer.age"}, 18] }}

□ Click "Generate Sample" — expect textarea fills with field-based JSON

□ Edit data to { "customer": { "age": 25 } }, click Run
  Expected: Result = true, type = boolean, duration shown

□ Edit data to { "customer": { "age": 15 } }, click Run
  Expected: Result = false

□ Enter invalid JSON: { bad }, click Run
  Expected: Error message displayed, no crash

□ Click "JSONLogic Output" toggle
  Expected: Shows the raw JSONLogic being evaluated
```

---

## 15. STEP 11 — Unified Rule Editor

### Acceptance Criteria
- [ ] Tab switching between "Conditions" mode and "Decision Table" mode
- [ ] Within Conditions: toggle between Visual Builder ↔ Expression
- [ ] Simulator sidebar always visible
- [ ] Template selector (for Conditions mode)
- [ ] Save button (disabled until valid rule exists)
- [ ] Bidirectional sync: visual ↔ expression ↔ JSONLogic

```tsx
// src/components/UnifiedRuleEditor.tsx
import { useState, useCallback, useMemo } from 'react';
import { RuleBuilder } from './RuleBuilder';
import { ExpressionInput } from './ExpressionInput';
import { DecisionTableEditor } from './DecisionTableEditor';
import { SimulatorPanel } from './SimulatorPanel';
import { TemplateSelector } from './TemplateSelector';
import { ruleFields } from '../config/ruleFields';
import { ruleTemplates } from '../config/ruleTemplates';
import type { DecisionTable } from '../types/decisionTable';
import type { Field } from 'react-querybuilder';

type RuleMode = 'condition' | 'table';
type ConditionView = 'visual' | 'expression';

interface UnifiedRuleEditorProps {
  /** Initial JSONLogic rule */
  initialRule?: any;
  /** Initial mode */
  initialMode?: RuleMode;
  /** Initial table definition (for table mode) */
  initialTable?: DecisionTable;
  /** Field definitions — override ruleFields config */
  availableFields?: Field[];
  /** Called when user saves */
  onSave: (payload: {
    mode: RuleMode;
    jsonLogic: any;
    table?: DecisionTable;
  }) => void;
  disabled?: boolean;
}

const emptyTable: DecisionTable = {
  id: 'new-table',
  name: 'New Decision Table',
  hitPolicy: 'first',
  columns: [
    { id: 'c1', type: 'input', field: '', label: 'Condition 1', dataType: 'string' },
    { id: 'c2', type: 'output', field: '', label: 'Output', dataType: 'string' },
  ],
  rows: [{ id: 'r1', cells: { c1: '', c2: '' } }],
};

export function UnifiedRuleEditor({
  initialRule,
  initialMode = 'condition',
  initialTable,
  availableFields,
  onSave,
  disabled = false,
}: UnifiedRuleEditorProps) {
  const fields = availableFields ?? ruleFields;
  const [mode, setMode] = useState<RuleMode>(initialMode);
  const [conditionView, setConditionView] = useState<ConditionView>('visual');
  const [jsonLogic, setJsonLogic] = useState<any>(initialRule ?? null);
  const [tableDef, setTableDef] = useState<DecisionTable>(initialTable ?? emptyTable);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSave = useCallback(() => {
    onSave({
      mode,
      jsonLogic,
      table: mode === 'table' ? tableDef : undefined,
    });
  }, [mode, jsonLogic, tableDef, onSave]);

  const applyTemplate = useCallback((templateJsonLogic: any) => {
    setJsonLogic(templateJsonLogic);
    setShowTemplates(false);
    setConditionView('visual'); // switch to visual so user sees the populated builder
  }, []);

  return (
    <div className="unified-editor" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      {/* ── Main editor area ── */}
      <div className="editor-main">
        {/* Mode tabs */}
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'condition' ? 'active' : ''}`}
            onClick={() => setMode('condition')}
          >
            Conditions (AND/OR)
          </button>
          <button
            className={`mode-tab ${mode === 'table' ? 'active' : ''}`}
            onClick={() => setMode('table')}
          >
            Decision Table
          </button>
        </div>

        {/* Condition mode */}
        {mode === 'condition' && (
          <div className="condition-editor">
            {/* Sub-toggle: Visual ↔ Expression */}
            <div className="condition-view-toggle">
              <button
                className={conditionView === 'visual' ? 'active' : ''}
                onClick={() => setConditionView('visual')}
              >
                🔲 Visual Builder
              </button>
              <button
                className={conditionView === 'expression' ? 'active' : ''}
                onClick={() => setConditionView('expression')}
              >
                ⌨️ Expression
              </button>
              <button
                className={`template-btn ${showTemplates ? 'active' : ''}`}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                📋 Templates
              </button>
            </div>

            {/* Template selector */}
            {showTemplates && (
              <TemplateSelector
                templates={ruleTemplates}
                onSelect={applyTemplate}
                onClose={() => setShowTemplates(false)}
              />
            )}

            {/* Visual builder */}
            {conditionView === 'visual' && (
              <RuleBuilder
                initialJsonLogic={jsonLogic}
                fields={fields}
                onJsonLogicChange={setJsonLogic}
                disabled={disabled}
              />
            )}

            {/* Expression input */}
            {conditionView === 'expression' && (
              <ExpressionInput
                initialValue={jsonLogic}
                fields={fields}
                onJsonLogicChange={(logic) => { if (logic !== null) setJsonLogic(logic); }}
                disabled={disabled}
              />
            )}
          </div>
        )}

        {/* Table mode */}
        {mode === 'table' && (
          <DecisionTableEditor
            initialTable={tableDef}
            onJsonLogicChange={setJsonLogic}
            onTableChange={setTableDef}
            disabled={disabled}
          />
        )}

        {/* Save button */}
        <div className="editor-actions">
          <button
            className="save-button"
            onClick={handleSave}
            disabled={!jsonLogic || disabled}
          >
            💾 Save Rule
          </button>
        </div>
      </div>

      {/* ── Simulator sidebar ── */}
      <SimulatorPanel jsonLogicRule={jsonLogic} fields={fields} />
    </div>
  );
}
```

### 15.2 Template Selector Component

```tsx
// src/components/TemplateSelector.tsx
import { RuleTemplate } from '../config/ruleTemplates';

interface TemplateSelectorProps {
  templates: RuleTemplate[];
  onSelect: (jsonLogic: any) => void;
  onClose: () => void;
}

export function TemplateSelector({ templates, onSelect, onClose }: TemplateSelectorProps) {
  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <div className="template-selector">
      <div className="template-header">
        <h4>Rule Templates</h4>
        <button onClick={onClose}>×</button>
      </div>
      {categories.map((cat) => (
        <div key={cat} className="template-category">
          <h5>{cat}</h5>
          {templates.filter((t) => t.category === cat).map((t) => (
            <div key={t.id} className="template-card" onClick={() => onSelect(t.jsonLogic)}>
              <strong>{t.name}</strong>
              <p>{t.description}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### ✅ STEP 11 Validation

```
□ Render <UnifiedRuleEditor onSave={console.log} />

□ Switch between "Conditions" and "Decision Table" tabs
  Expected: Editor content changes, simulator stays visible

□ In Conditions mode, toggle "Visual Builder" ↔ "Expression"
  Expected: Rule state preserved between views

□ Create a rule in visual builder, switch to Expression
  Expected: Expression textarea shows the decompiled expression

□ Click Templates → select "Gold Tier Discount"
  Expected: Visual builder populates with the template's conditions

□ Click Save
  Expected: console.log shows { mode, jsonLogic, table? }
```

---

## 16. STEP 12 — Pipeline Executor (Tier 3)

### Acceptance Criteria
- [ ] Steps execute in order
- [ ] Each step's output stored at `$.outputKey` in context
- [ ] Disabled steps skipped
- [ ] First error stops execution
- [ ] Step trace with timing per step
- [ ] Validates forward references and duplicate keys

```typescript
// src/engine/pipelineExecutor.ts
import jsonLogic from 'json-logic-js';
import type { PipelineStep } from '../types/rulePipeline';

export interface StepTrace {
  stepId: string;
  stepName: string;
  outputKey: string;
  output: any;
  durationMs: number;
  skipped: boolean;
  error?: string;
}

export interface PipelineResult {
  context: Record<string, any>;
  trace: StepTrace[];
  totalDurationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Execute a rule pipeline. Each step's JSONLogic runs against
 * an accumulating context. Step outputs stored at `$.outputKey`.
 */
export function executePipeline(
  steps: PipelineStep[],
  inputData: Record<string, any>
): PipelineResult {
  const context: Record<string, any> = { ...inputData };
  const trace: StepTrace[] = [];
  const start = performance.now();

  for (const step of steps) {
    if (!step.enabled) {
      trace.push({
        stepId: step.id, stepName: step.name, outputKey: step.outputKey,
        output: undefined, durationMs: 0, skipped: true,
      });
      continue;
    }

    const stepStart = performance.now();
    try {
      const output = jsonLogic.apply(step.jsonLogic, context);
      context[`$.${step.outputKey}`] = output;
      trace.push({
        stepId: step.id, stepName: step.name, outputKey: step.outputKey,
        output, durationMs: performance.now() - stepStart, skipped: false,
      });
    } catch (e: any) {
      trace.push({
        stepId: step.id, stepName: step.name, outputKey: step.outputKey,
        output: undefined, durationMs: performance.now() - stepStart,
        skipped: false, error: e.message,
      });
      return {
        context, trace,
        totalDurationMs: performance.now() - start,
        success: false,
        error: `Step "${step.name}" failed: ${e.message}`,
      };
    }
  }

  return { context, trace, totalDurationMs: performance.now() - start, success: true };
}
```

```typescript
// src/engine/pipelineValidator.ts
import type { PipelineStep } from '../types/rulePipeline';

export function validatePipeline(steps: PipelineStep[]): string[] {
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (!step.outputKey.trim()) {
      errors.push(`Step ${i + 1} ("${step.name}"): output key is empty.`);
    }
    if (seenKeys.has(step.outputKey)) {
      errors.push(`Step ${i + 1} ("${step.name}"): output key "${step.outputKey}" already used by an earlier step.`);
    }
    seenKeys.add(step.outputKey);

    // Detect forward references
    const ruleStr = JSON.stringify(step.jsonLogic);
    const refPattern = /"\$\.([a-zA-Z0-9_]+)"/g;
    let match;
    while ((match = refPattern.exec(ruleStr)) !== null) {
      const ref = match[1];
      if (!seenKeys.has(ref) && ref !== step.outputKey) {
        errors.push(
          `Step ${i + 1} ("${step.name}"): references "$.${ref}" but no prior step outputs that key. Reorder steps.`
        );
      }
    }
  }
  return errors;
}
```

### ✅ STEP 12 Validation

```typescript
// src/engine/__tests__/pipelineExecutor.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { executePipeline } from '../pipelineExecutor';
import { validatePipeline } from '../pipelineValidator';
import { registerCustomOperators } from '../../config/customOperators';
import type { PipelineStep } from '../../types/rulePipeline';

beforeAll(() => registerCustomOperators());

const pricingSteps: PipelineStep[] = [
  {
    id: 's1', name: 'Subtotal', outputKey: 'subtotal',
    ruleType: 'expression', enabled: true,
    jsonLogic: { '*': [{ var: 'order.quantity' }, { var: 'order.unit_price' }] },
  },
  {
    id: 's2', name: 'Discount', outputKey: 'discount',
    ruleType: 'condition', enabled: true,
    jsonLogic: { if: [{ '==': [{ var: 'customer.tier' }, 'gold'] }, 0.2, 0] },
  },
  {
    id: 's3', name: 'Final Price', outputKey: 'final_price',
    ruleType: 'expression', enabled: true,
    jsonLogic: { '*': [{ var: '$.subtotal' }, { '-': [1, { var: '$.discount' }] }] },
  },
];

describe('pipelineExecutor', () => {
  it('chains step outputs correctly', () => {
    const result = executePipeline(pricingSteps, {
      order: { quantity: 3, unit_price: 50 },
      customer: { tier: 'gold' },
    });
    expect(result.success).toBe(true);
    expect(result.context['$.subtotal']).toBe(150);
    expect(result.context['$.discount']).toBe(0.2);
    expect(result.context['$.final_price']).toBe(120);
    expect(result.trace).toHaveLength(3);
  });

  it('skips disabled steps', () => {
    const steps = pricingSteps.map((s) =>
      s.id === 's2' ? { ...s, enabled: false } : s
    );
    const result = executePipeline(steps, {
      order: { quantity: 2, unit_price: 100 },
      customer: { tier: 'silver' },
    });
    expect(result.success).toBe(true);
    expect(result.trace[1].skipped).toBe(true);
    // $.discount is undefined, so final_price = 200 * (1 - undefined) = NaN
    // This demonstrates why disabled steps matter — test verifies the skip behavior
    expect(result.context['$.discount']).toBeUndefined();
  });

  it('stops on first error', () => {
    const badSteps: PipelineStep[] = [
      { id: 's1', name: 'Bad Step', outputKey: 'x', ruleType: 'expression', enabled: true,
        jsonLogic: { badop: [1] } }, // unknown operator
    ];
    const result = executePipeline(badSteps, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Bad Step');
  });
});

describe('pipelineValidator', () => {
  it('no errors for valid pipeline', () => {
    expect(validatePipeline(pricingSteps)).toEqual([]);
  });

  it('detects duplicate output keys', () => {
    const dups = [...pricingSteps, { ...pricingSteps[0], id: 'dup' }];
    const errors = validatePipeline(dups);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('subtotal');
  });

  it('detects forward references', () => {
    const reversed = [...pricingSteps].reverse();
    const errors = validatePipeline(reversed);
    expect(errors.some((e) => e.includes('Reorder'))).toBe(true);
  });
});
```

```
□ Run: npx vitest run src/engine/__tests__/pipelineExecutor.test.ts
  Expected: All tests pass
```

---

## 17. STEP 13 — Pipeline Editor UI

### Acceptance Criteria
- [ ] Ordered step list with drag-to-reorder (or up/down buttons)
- [ ] Each step editable via UnifiedRuleEditor
- [ ] Prior step outputs appear as field options for later steps
- [ ] Pipeline simulation with step-by-step trace
- [ ] Validation warnings for forward references and duplicates

*(Use the PipelineEditor component from the chaining addendum. It reuses UnifiedRuleEditor for each step. The key code is already in `src/components/PipelineEditor.tsx` in the chaining addendum — copy that implementation, which includes the step list, per-step editing via UnifiedRuleEditor, and the pipeline simulator.)*

### ✅ STEP 13 Validation

```
□ Render <PipelineEditor initial={pricingPipeline} onSave={console.log} />

□ Add 3 steps: subtotal, discount, final_price
  Configure each with expressions: quantity * unit_price, if(...), $.subtotal * (1 - $.discount)

□ Verify step 3's field dropdown includes $.subtotal and $.discount

□ Enter test data: { order: { quantity: 3, unit_price: 50 }, customer: { tier: "gold" } }
  Click Run Pipeline
  Expected: Step trace shows: $.subtotal=150, $.discount=0.2, $.final_price=120

□ Disable step 2, re-run
  Expected: Step 2 shows "skipped", step 3 uses undefined for $.discount

□ Reorder step 3 before step 1
  Expected: Validation warning about forward reference to $.subtotal
```

---

## 18. STEP 14 — Backend Integration

### 18.1 Database Schema (PostgreSQL)

```sql
-- Single rules and decision tables
CREATE TABLE business_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  mode        VARCHAR(20) NOT NULL CHECK (mode IN ('condition', 'table', 'pipeline')),
  json_logic  JSONB NOT NULL,         -- executable JSONLogic (or pipeline steps)
  table_def   JSONB,                  -- DecisionTable JSON (UI persistence, null for conditions)
  category    VARCHAR(100),           -- e.g., "pricing", "eligibility"
  entity_type VARCHAR(100),           -- e.g., "order", "customer"
  entity_id   UUID,                   -- link to specific entity if needed
  version     INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  VARCHAR(255),
  updated_by  VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Version history (copy-on-write on every save)
CREATE TABLE business_rules_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     UUID NOT NULL REFERENCES business_rules(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  json_logic  JSONB NOT NULL,
  table_def   JSONB,
  changed_by  VARCHAR(255),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX idx_rules_category ON business_rules(category) WHERE is_active = true;
CREATE INDEX idx_rules_entity ON business_rules(entity_type, entity_id) WHERE is_active = true;
CREATE INDEX idx_rules_history_rule ON business_rules_history(rule_id, version DESC);
```

### 18.2 API Endpoints

```typescript
// src/api/rules.ts — Express-style route handlers

// GET /api/rules — list rules with optional filters
router.get('/rules', async (req, res) => {
  const { category, entity_type, entity_id, active_only = 'true' } = req.query;
  let query = db('business_rules');
  if (active_only === 'true') query = query.where('is_active', true);
  if (category) query = query.where('category', category);
  if (entity_type) query = query.where('entity_type', entity_type);
  if (entity_id) query = query.where('entity_id', entity_id);
  const rules = await query.orderBy('updated_at', 'desc');
  res.json(rules);
});

// GET /api/rules/:id — get single rule
router.get('/rules/:id', async (req, res) => {
  const rule = await db('business_rules').where('id', req.params.id).first();
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
});

// POST /api/rules — create new rule
router.post('/rules', async (req, res) => {
  const { name, mode, json_logic, table_def, category, entity_type, entity_id } = req.body;
  const [rule] = await db('business_rules')
    .insert({ name, mode, json_logic, table_def, category, entity_type, entity_id, created_by: req.user?.id })
    .returning('*');
  res.status(201).json(rule);
});

// PUT /api/rules/:id — update (saves history)
router.put('/rules/:id', async (req, res) => {
  const existing = await db('business_rules').where('id', req.params.id).first();
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  // Save history
  await db('business_rules_history').insert({
    rule_id: existing.id,
    version: existing.version,
    json_logic: existing.json_logic,
    table_def: existing.table_def,
    changed_by: req.user?.id,
  });

  // Update
  const { name, mode, json_logic, table_def } = req.body;
  const [updated] = await db('business_rules')
    .where('id', req.params.id)
    .update({
      name, mode, json_logic, table_def,
      version: existing.version + 1,
      updated_by: req.user?.id,
      updated_at: db.fn.now(),
    })
    .returning('*');
  res.json(updated);
});

// POST /api/rules/:id/evaluate — evaluate a stored rule
router.post('/rules/:id/evaluate', async (req, res) => {
  const rule = await db('business_rules').where('id', req.params.id).first();
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  try {
    const start = performance.now();
    let result;

    if (rule.mode === 'pipeline') {
      // Pipeline: json_logic contains the steps array
      const { executePipeline } = require('../engine/pipelineExecutor');
      result = executePipeline(rule.json_logic, req.body);
    } else {
      // Single rule
      const jsonLogic = require('json-logic-js');
      result = jsonLogic.apply(rule.json_logic, req.body);
    }

    res.json({
      result,
      duration_ms: performance.now() - start,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/rules/evaluate — evaluate inline (no stored rule)
router.post('/rules/evaluate', async (req, res) => {
  const { rule, data } = req.body;
  try {
    const jsonLogic = require('json-logic-js');
    const start = performance.now();
    const result = jsonLogic.apply(rule, data);
    res.json({ result, duration_ms: performance.now() - start });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/rules/:id/history — version history
router.get('/rules/:id/history', async (req, res) => {
  const history = await db('business_rules_history')
    .where('rule_id', req.params.id)
    .orderBy('version', 'desc')
    .limit(50);
  res.json(history);
});
```

### ✅ STEP 14 Validation

```
□ Run migration: create both tables
  Expected: No SQL errors

□ POST /api/rules — create a rule
  Expected: 201 with rule object including generated UUID

□ PUT /api/rules/:id — update the rule
  Expected: version increments, history row created

□ POST /api/rules/:id/evaluate — with test data
  Expected: Result matches expected JSONLogic output

□ POST /api/rules/evaluate — inline evaluation
  Expected: Works without a stored rule

□ GET /api/rules/:id/history — verify history
  Expected: Returns previous versions in descending order
```

---

## 19. STEP 15 — Polish & UX

### 19.1 CSS Stylesheet

Create `src/styles/ruleEditor.css` with styles for all components. Key classes to style:

```
.unified-editor          — 2-column grid layout
.mode-tabs / .mode-tab   — tab buttons, .active state
.condition-view-toggle   — visual/expression/template toggle
.rule-builder            — react-querybuilder container
.expression-input        — textarea wrapper
.expression-textarea     — the textarea itself, .expression-error / .expression-valid states
.expression-error-msg    — error message with red text
.expression-suggestions  — autocomplete dropdown
.decision-table-editor   — table container
.decision-table          — the <table> element
.col-header-input        — IF column headers (blue-ish)
.col-header-output       — THEN column headers (green-ish)
.cell-wrapper            — cell container, .cell-error state
.cell-input / .cell-display — editing vs display states
.simulator-panel         — right sidebar
.sim-result              — result display, .sim-result-true / .sim-result-false
.sim-error               — error display
.pipeline-editor         — 3-column grid
.step-card               — step list items, .active / .step-card-disabled states
.trace-step              — simulation trace items
.template-selector       — template dropdown/modal
.template-card           — individual template
.syntax-help             — collapsible help panel
.save-button             — primary action button
```

### 19.2 App Entry Point

```typescript
// src/main.tsx (or wherever your app bootstraps)
import { registerCustomOperators } from './config/customOperators';
import { UnifiedRuleEditor } from './components/UnifiedRuleEditor';
import './styles/ruleEditor.css';

// ⚠️ MUST be called before any rule evaluation
registerCustomOperators();

function App() {
  return (
    <UnifiedRuleEditor
      onSave={(payload) => {
        console.log('Saved:', payload);
        // POST to /api/rules
      }}
    />
  );
}
```

### 19.3 Syntax Help Component

```tsx
// src/components/SyntaxHelp.tsx
export function SyntaxHelp() {
  return (
    <details className="syntax-help">
      <summary>📖 Expression Syntax Reference</summary>
      <div className="syntax-content">
        <h4>Comparisons</h4>
        <code>age &gt; 18 &nbsp; tier == "gold" &nbsp; score &lt;= 100 &nbsp; status != "blocked"</code>

        <h4>Boolean Logic</h4>
        <code>X and Y &nbsp; X or Y &nbsp; not(X) &nbsp; (X or Y) and Z</code>

        <h4>Special Operators</h4>
        <code>country in ["US", "CA"] &nbsp; age between 18 and 65 &nbsp; name contains "john"</code>
        <code>email startsWith "admin" &nbsp; email endsWith ".gov"</code>

        <h4>Arithmetic</h4>
        <code>quantity * price &nbsp; total + tax - discount &nbsp; amount / count &nbsp; value % 2</code>

        <h4>Functions</h4>
        <code>round(x, 2) &nbsp; min(a, b) &nbsp; max(a, b) &nbsp; abs(x) &nbsp; floor(x) &nbsp; ceil(x)</code>
        <code>len(s) &nbsp; upper(s) &nbsp; lower(s) &nbsp; trim(s) &nbsp; isEmpty(x)</code>
        <code>sum(arr) &nbsp; count(arr) &nbsp; avg(arr)</code>

        <h4>Pipeline References</h4>
        <code>$.subtotal * 0.08 &nbsp; $.discount &gt; 0.1</code>

        <h4>Null & Boolean</h4>
        <code>email == null &nbsp; active == true &nbsp; active == false</code>
      </div>
    </details>
  );
}
```

### ✅ STEP 15 Validation

```
□ Full workflow: create a condition rule → test it → switch to expression → verify roundtrip → save

□ Full workflow: create a decision table → add 4 rows → test with sample data → verify results → save

□ Full workflow: create a 3-step pipeline → test with data → verify step trace → save

□ Error handling: enter bad expressions, bad JSON, bad cell syntax
  Expected: Clear error messages, no crashes, no silent failures

□ Responsive: resize window to mobile width
  Expected: Simulator collapses below editor, table scrolls horizontally

□ Test with a business user (non-developer): can they create a rule without help?
```

---

## 20. Complete Test Suite

### Run All Tests

```bash
npx vitest run
```

### Test Coverage Summary

| File | Tests | What's Tested |
|------|-------|--------------|
| `customOperators.test.ts` | 14 | All registered custom operators |
| `expressionParser.test.ts` | 25+ | Comparisons, booleans, arithmetic, functions, nulls, pipeline refs, errors |
| `expressionDecompiler.test.ts` | 18+ | Roundtrip for all expression types, between detection, precedence |
| `cellCompiler.test.ts` | 11 | Wildcards, exact, ranges, lists, comparisons, booleans, quoted strings |
| `tableCompiler.test.ts` | 6 | First-match, collect, evaluation against sample data, empty table |
| `pipelineExecutor.test.ts` | 5 | Chaining, disabled steps, error propagation, validation |
| **Total** | **79+** | |

### Integration Test: End-to-End

```typescript
// src/engine/__tests__/integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import jsonLogic from 'json-logic-js';
import { registerCustomOperators } from '../../config/customOperators';
import { parseExpression } from '../expressionParser';
import { decompileExpression } from '../expressionDecompiler';
import { compileCellToJsonLogic } from '../cellCompiler';
import { compileTableToJsonLogic } from '../tableCompiler';
import { executePipeline } from '../pipelineExecutor';

beforeAll(() => registerCustomOperators());

describe('end-to-end integration', () => {
  it('expression → JSONLogic → evaluate', () => {
    const rule = parseExpression('customer.age >= 18 and customer.tier == "gold" and order.total > 100');
    const result = jsonLogic.apply(rule, {
      customer: { age: 30, tier: 'gold' },
      order: { total: 250 },
    });
    expect(result).toBe(true);
  });

  it('expression roundtrip preserves semantics', () => {
    const original = 'age between 18 and 65 and country in ["US", "CA"]';
    const logic = parseExpression(original);
    const decompiled = decompileExpression(logic);
    const reparsed = parseExpression(decompiled);
    // Evaluate both against same data — should give identical results
    const data = { age: 25, country: 'US' };
    expect(jsonLogic.apply(logic, data)).toBe(true);
    expect(jsonLogic.apply(reparsed, data)).toBe(true);
  });

  it('pipeline with decision table step', () => {
    const table = {
      id: 't1', name: 'Tax Rate', hitPolicy: 'first' as const,
      columns: [
        { id: 'c1', type: 'input' as const, field: 'customer.country', label: 'Country', dataType: 'string' as const },
        { id: 'c2', type: 'output' as const, field: 'tax_rate', label: 'Tax Rate', dataType: 'number' as const },
      ],
      rows: [
        { id: 'r1', cells: { c1: 'US', c2: '0.08' } },
        { id: 'r2', cells: { c1: 'CA', c2: '0.13' } },
        { id: 'r3', cells: { c1: '*', c2: '0.20' } },
      ],
    };
    const taxRule = compileTableToJsonLogic(table)!;

    const steps = [
      { id: 's1', name: 'Subtotal', outputKey: 'subtotal', ruleType: 'expression' as const,
        enabled: true, jsonLogic: { '*': [{ var: 'order.qty' }, { var: 'order.price' }] } },
      { id: 's2', name: 'Tax Rate', outputKey: 'tax_rate', ruleType: 'table' as const,
        enabled: true, jsonLogic: taxRule },
      { id: 's3', name: 'Total', outputKey: 'total', ruleType: 'expression' as const,
        enabled: true, jsonLogic: { '+': [{ var: '$.subtotal' }, { '*': [{ var: '$.subtotal' }, { var: '$.tax_rate' }] }] } },
    ];

    const result = executePipeline(steps, {
      order: { qty: 10, price: 50 },
      customer: { country: 'US' },
    });

    expect(result.success).toBe(true);
    expect(result.context['$.subtotal']).toBe(500);
    expect(result.context['$.tax_rate']).toBe(0.08);
    expect(result.context['$.total']).toBe(540);
  });
});
```

---

## 21. Bug & Gotcha Registry

| # | Issue | Symptom | Fix |
|---|-------|---------|-----|
| 1 | **react-querybuilder v7 imports** | `parseJsonLogic is not a function` | Import from `'react-querybuilder/parseJsonLogic'` not `'react-querybuilder'` |
| 2 | **Missing parseNumbers** | Numbers export as strings: `"18"` instead of `18` | Pass `parseNumbers: true` to `formatQuery()` |
| 3 | **Custom operators not registered** | `jsonLogic.apply()` returns `null` or wrong value for `startsWith`, `contains`, etc. | Call `registerCustomOperators()` ONCE at app startup before any evaluation |
| 4 | **jsonLogicAdditionalOperators** | RQB's `startsWith`/`endsWith` operators don't work at runtime | Register via `for (const [op, fn] of Object.entries(jsonLogicAdditionalOperators)) { jsonLogic.add_operation(op, fn); }` |
| 5 | **Decompiler between dead code** | `between` pattern never detected, always shows as `x >= 18 and x <= 65` | Check `isBetweenPattern()` BEFORE general `and` handler |
| 6 | **collect hit policy** | `filter` on static array doesn't work in standard JSONLogic | Use custom `collect_table` operator |
| 7 | **Expression parser case sensitivity** | `startsWith` vs `startswith` not matching keywords | Keyword lookup uses `ident.toLowerCase()` |
| 8 | **Pipeline $.var naming** | `$.subtotal` treated as literal key, not path | JSONLogic's `var` treats `$.subtotal` as a top-level key in the data object — which is exactly what the pipeline executor sets. No dots to resolve. |
| 9 | **Empty expression returns true** | Could be surprising | Documented: empty = wildcard (always true). Used intentionally in table cells. |
| 10 | **formatQuery single-rule collapse** | Single-rule group collapses to just the rule | Fixed in RQB v7+ (full group structure retained) |

---

## 22. Evaluation in Other Languages

Since every rule is **standard JSONLogic** (except `collect_table` which only applies to collect-mode decision tables), it runs natively in any language with a JSONLogic library:

| Language | Library | Install |
|----------|---------|---------|
| **JavaScript/Node** | `json-logic-js` | `npm install json-logic-js` |
| **Python** | `json-logic-qubit` | `pip install json-logic-qubit` |
| **C# / .NET** | `JsonLogic.Net` | NuGet: `JsonLogic.Net` |
| **Go** | `jsonlogic/v3` | `go get github.com/diegoholiveira/jsonlogic/v3` |
| **Java** | `json-logic-java` | Maven: `io.github.jamsesso:json-logic-java` |
| **PHP** | `json-logic-php` | Composer: `jwadhams/json-logic-php` |
| **Ruby** | `json_logic` | `gem install json_logic` |

Custom operators (`startsWith`, `contains`, `round`, etc.) must be registered in each language runtime too. The "first" hit policy decision table output is pure `if/elseif/else` — no custom operators needed.

For pipeline evaluation in other languages, port the 60-line `executePipeline` function — it's just a for-loop that merges step outputs into a context object.

---

## 23. Implementation Schedule

| Day | Focus | Deliverable | Tests |
|-----|-------|-------------|-------|
| **1** | Setup + Types + Custom Operators | Project scaffolded, all types compile, operators registered | 14 operator tests |
| **2** | Query Builder (Tier 1) | Visual rule builder works, exports JSONLogic, loads JSONLogic | Manual verification |
| **3** | Expression Parser + Decompiler | parseExpression() + decompileExpression() complete | 43+ parser/decompiler tests |
| **4** | Expression Input + Unified Editor shell | ExpressionInput component, tab switching, template selector | Manual verification |
| **5** | Cell Compiler + Table Compiler | compileCellToJsonLogic() + compileTableToJsonLogic() with tests | 17 cell/table tests |
| **6** | Decision Table Editor UI | Spreadsheet editor with inline editing, add/remove, CSV import | Manual verification |
| **7** | Simulator Panel + Integration | SimulatorPanel connected to both modes, sample data generation | Integration tests |
| **8** | Pipeline Executor + Validator | executePipeline() + validatePipeline() + tests | 5 pipeline tests |
| **9** | Pipeline Editor UI | Step list, per-step editing via UnifiedRuleEditor, pipeline simulation | Manual verification |
| **10** | Backend + Polish | API endpoints, DB schema, CSS, final UX pass with business user | E2E verification |

**Total: 10 days, 79+ automated tests, ~65KB bundle**

---

## 24. Future Extensions (Only When Needed)

| Feature | When | How |
|---------|------|-----|
| **Full decision graph / DAG** | 5+ chained rules with parallel branches | Drop in `@gorules/jdm-editor` (MIT, React component) |
| **Version diffing** | Multiple editors need change review | JSON diff library + side-by-side viewer |
| **Role-based permissions** | Distinct editor/viewer roles | Use your existing auth system |
| **Environment promotion** | Rules need approval before production | Add `environment` column + approval workflow |
| **Batch testing** | 50+ rules need regression testing | Saved test fixtures + test runner |
| **Dynamic field loading** | Fields change per entity type | Fetch JSON Schema from API, convert to RQB Field[] |
| **Real-time collaboration** | Multiple editors on same rule | WebSocket + OT/CRDT (significant effort) |

Each is a **separate, incremental addition**. Don't build any of these until you've proven the need.
