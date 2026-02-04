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
 * import { UnifiedRuleEditor, ruleFields, registerCustomOperators } from 'jsonlogic-rules-engine';
 *
 * // Register custom operators once at app startup
 * registerCustomOperators();
 *
 * function App() {
 *   const [rule, setRule] = useState(null);
 *   return <UnifiedRuleEditor fields={ruleFields} onChange={setRule} />;
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

export {
    ruleFields,
} from './config/ruleFields';

export {
    ruleTemplates,
    type RuleTemplate,
} from './config/ruleTemplates';

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

// ─────────────────────────────────────────────────────────────────────────────
// API Client (for .NET backend integration)
// ─────────────────────────────────────────────────────────────────────────────
export {
    rulesApi,
    useRulesList,
    useRule,
    useEvaluate,
    useApiHealth,
    type BusinessRule,
    type EvaluationResult,
    type EvaluateRuleRequest,
    type CreateRuleRequest,
    type UpdateRuleRequest,
} from './api';
