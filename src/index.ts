/**
 * JSONLogic Rules Engine
 * A lightweight business rules engine for Healthcare/EMR applications
 *
 * Features:
 * - Visual query builder (Tier 1)
 * - Expression parser for human-readable rules (Tier 1.5)
 * - Decision table editor (Tier 2)
 * - Pipeline editor for multi-step calculations (Tier 3)
 * - Rule simulation and testing
 * - Healthcare-focused field definitions
 *
 * @example
 * ```tsx
 * import { UnifiedRuleEditor, registerCustomOperators } from 'jsonlogic-rules-engine';
 *
 * // Register custom operators once at app startup
 * registerCustomOperators();
 *
 * function App() {
 *   const [rule, setRule] = useState(null);
 *   return <UnifiedRuleEditor fields={[]} onChange={setRule} />;
 * }
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────
export {
    RuleBuilder,
    ExpressionInput,
    DecisionTableEditor,
    PipelineEditor,
    UnifiedRuleEditor,
    SimulatorPanel,
    TemplateSelector,
    SyntaxHelp,
} from './components';

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────
export {
    // Cell & Table Compiler
    compileCell,
    compileOutputCell,
    validateCellExpression,
    compileTable,
    validateTable,
    createEmptyTable,
    addTableRow,
    // Expression Parser/Decompiler
    parseExpression,
    tokenize,
    decompileExpression,
    // Pipeline Execution
    executePipeline,
    executeRule,
    validateStepReferences,
    getReferencedSteps,
    validatePipeline,
    // CSV Import/Export
    exportTableToCsv,
    importTableFromCsv,
    createCsvTemplate,
    validateCsv,
    // Types
    type CellCompileResult,
    type TableCompileResult,
    type Token,
    type TokenType,
    type ParseOptions,
    type PipelineExecutionResult,
    type ExecutionContext,
    type ValidationResult,
    type CsvExportOptions,
    type CsvImportOptions,
    type CsvImportResult,
} from './engine';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
export {
    registerCustomOperators,
    allOperators,
} from './config/customOperators';


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type {
    DecisionTable,
    DecisionTableColumn,
    DecisionTableRow,
} from './types/decisionTable';

export type {
    RulePipeline,
    PipelineStep,
} from './types/rulePipeline';

export type {
    Domain,
    Rule
} from './types/domain';

// ─────────────────────────────────────────────────────────────────────────────
// API Client (for NestJS backend integration)
// ─────────────────────────────────────────────────────────────────────────────
export {
    rulesApi,
    useRulesList,
    useRule,
    RulesApiError
} from './api';
