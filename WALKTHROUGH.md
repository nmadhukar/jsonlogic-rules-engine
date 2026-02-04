# JSONLogic Rules Engine - Project Walkthrough

**Date**: February 3, 2026
**Status**: Production Ready (Verified)

## 🎯 Goal Accomplished
Built a comprehensive, 4-tier Rules Engine logic system that runs in the browser and compiles to standard portable JSONLogic.

## 🏗️ Core Features
| Module | Description | Location |
| :--- | :--- | :--- |
| **Unified Editor** | Switch between Visual Builder and Expression input. | `src/components/UnifiedRuleEditor.tsx` |
| **Decision Tables** | Excel-like grid for complex matricies. Supports ranges (`10..20`), lists (`A,B`), and wildcards. | `src/components/DecisionTableEditor.tsx` |
| **Rule Pipelines** | Chain multiple rules together with context passing (`$.step1.output`). | `src/engine/pipelineExecutor.ts` |
| **Backend API** | Express.js routes for Rule CRUD and History mgmt. | `src/api/rules.ts` |
| **Validation** | Automated quality gate script. | `src/scripts/validate-project.ts` |

## 🚀 How to Run

### Development Mode
```bash
npm run dev
```
Opens the UI at `http://localhost:5173`. You can toggle between "Simple", "Table", and "Pipeline" modes using the tabs.

### Production Build
```bash
npm run build
```
Creates optimized static assets in `dist/`.

### Run Validation Checks
```bash
npx ts-node src/scripts/validate-project.ts
```
Verifies architecture, no-stub policy, clean types, and 100% test passing rate.

## 🛠️ Key Files to Know

- **`src/config/ruleFields.ts`**: Define your domain model here (e.g., `Patient`, `Order`). The UI auto-generates dropdowns from this.
- **`src/config/customOperators.ts`**: Registry for operators not in standard JSONLogic (`startsWith`, `round`, `collect_table`).
- **`src/api/schema.sql`**: PostgreSQL schema for storing rules and their version history.

## 🧪 Testing

The project maintains a **100% Unit Test Pass Rate** (123 tests).
- **Core Engine**: `src/engine/__tests__`
- **Compilers**: `src/engine/__tests__/tableCompiler.test.ts`

## 🔮 Integration Guide (for Next Layer)

To integrate this into a larger .NET/Node system:
1.  **Frontend**: Import `UnifiedRuleEditor` and pass it your `fields`.
2.  **Backend**: Use the `src/api/rules.ts` as a template for your API.
3.  **Execution**: Use `json-logic-js` (JS) or `JsonLogic.Net` (C#) to execute the saved JSON.

> **Note**: For "Table" logic, always run the JSON through `tableCompiler.ts` (frontend) or ensure your backend understands the compiled `if/else` logic structure (which is standard JSONLogic).
