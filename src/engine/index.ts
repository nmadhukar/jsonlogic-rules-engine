/**
 * Engine Layer Exports
 * Core logic for compiling and executing JSONLogic rules
 */

// Cell Compiler - compile decision table cell expressions
export {
    compileCell,
    compileOutputCell,
    validateCellExpression,
    type CellCompileResult,
} from './cellCompiler';

// Table Compiler - compile full decision tables
export {
    compileTable,
    validateTable,
    createEmptyTable,
    addTableRow,
    type TableCompileResult,
} from './tableCompiler';

// Expression Parser - parse human-readable expressions to JSONLogic
export {
    parseExpression,
    tokenize,
    type Token,
    type TokenType,
    type ParseOptions,
} from './expressionParser';

// Expression Decompiler - convert JSONLogic back to human-readable
export {
    decompileExpression,
} from './expressionDecompiler';

// Pipeline Executor - execute multi-step rule pipelines
export {
    executePipeline,
    executeRule,
    validateStepReferences,
    getReferencedSteps,
    type PipelineExecutionResult,
    type ExecutionContext,
} from './pipelineExecutor';

// Pipeline Validator - validate pipeline structure and references
export {
    validatePipeline,
    type ValidationResult,
} from './pipelineValidator';

// CSV Import/Export - bulk rule management
export {
    exportTableToCsv,
    importTableFromCsv,
    createCsvTemplate,
    validateCsv,
    type CsvExportOptions,
    type CsvImportOptions,
    type CsvImportResult,
} from './csvIO';
