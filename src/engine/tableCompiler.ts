/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TABLE COMPILER
 * Compiles a full decision table to a single JSONLogic expression
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Hit Policies:
 * - "first": Returns the output of the first matching row (if/elseif chain)
 * - "collect": Returns an array of all matching row outputs
 */

import type { DecisionTable, DecisionTableColumn, DecisionTableRow } from '../types/decisionTable';
import { compileCell, compileOutputCell } from './cellCompiler';

export interface TableCompileResult {
    /** The compiled JSONLogic expression */
    logic: any;
    /** Metadata about the compilation */
    meta: {
        rowCount: number;
        inputColumns: string[];
        outputColumns: string[];
        hitPolicy: 'first' | 'collect';
    };
}

/**
 * Compile a decision table to JSONLogic
 * @param table The decision table definition
 * @returns Compiled JSONLogic expression
 */
export function compileTable(table: DecisionTable): TableCompileResult {
    const inputColumns = table.columns.filter(c => c.type === 'input');
    const outputColumns = table.columns.filter(c => c.type === 'output');

    const meta = {
        rowCount: table.rows.length,
        inputColumns: inputColumns.map(c => c.field),
        outputColumns: outputColumns.map(c => c.field),
        hitPolicy: table.hitPolicy,
    };

    // No rows = always return null
    if (table.rows.length === 0) {
        return { logic: null, meta };
    }

    // Compile based on hit policy
    if (table.hitPolicy === 'collect') {
        return {
            logic: compileCollectTable(table, inputColumns, outputColumns),
            meta,
        };
    }

    // Default: "first" hit policy
    return {
        logic: compileFirstTable(table, inputColumns, outputColumns),
        meta,
    };
}

/**
 * Compile a "first" hit policy table
 * Returns an if/elseif chain that stops at first match
 */
function compileFirstTable(
    table: DecisionTable,
    inputColumns: DecisionTableColumn[],
    outputColumns: DecisionTableColumn[]
): any {
    // Build if/elseif/else chain from bottom up
    // { "if": [condition, then, else] }

    let result: any = null; // Default if no rows match

    // Process rows in reverse order to build nested if structure
    for (let i = table.rows.length - 1; i >= 0; i--) {
        const row = table.rows[i];
        const condition = compileRowCondition(row, inputColumns);
        const output = compileRowOutput(row, outputColumns);

        if (condition === true) {
            // Wildcard row - always matches, use as default
            result = output;
        } else {
            result = { if: [condition, output, result] };
        }
    }

    return result;
}

/**
 * Compile a "collect" hit policy table
 * Returns all matching outputs using collect_table operator
 */
function compileCollectTable(
    table: DecisionTable,
    inputColumns: DecisionTableColumn[],
    outputColumns: DecisionTableColumn[]
): any {
    // Use the custom collect_table operator
    // Wrap pairs in extra array to prevent json-logic-js from spreading args
    // { "collect_table": [[[condition1, output1], [condition2, output2], ...]] }

    const pairs: [any, any][] = [];

    for (const row of table.rows) {
        const condition = compileRowCondition(row, inputColumns);
        const output = compileRowOutput(row, outputColumns);

        // CRITICAL FIX: Wrap output in an "if" block to prevent eager evaluation.
        // Standard json-logic evaluates all arguments before passing to the operator.
        // This ensures 'output' is only evaluated if 'condition' is true.
        const protectedOutput = { if: [condition, output, null] };

        pairs.push([condition, protectedOutput]);
    }

    // Wrap in extra array so json-logic-js passes it as single argument
    return { collect_table: [pairs] };
}

/**
 * Compile a single row's condition (AND of all input cell conditions)
 */
function compileRowCondition(
    row: DecisionTableRow,
    inputColumns: DecisionTableColumn[]
): any {
    const conditions: any[] = [];

    for (const column of inputColumns) {
        const cellValue = row.cells[column.id] || '';
        const { logic, isWildcard } = compileCell(cellValue, column);

        if (!isWildcard) {
            conditions.push(logic);
        }
    }

    // No conditions = wildcard row (matches everything)
    if (conditions.length === 0) {
        return true;
    }

    // Single condition = no need for AND
    if (conditions.length === 1) {
        return conditions[0];
    }

    // Multiple conditions = AND them together
    return { and: conditions };
}

/**
 * Compile a single row's output
 * If multiple output columns, returns an object with all outputs
 * If single output column, returns just that value
 */
function compileRowOutput(
    row: DecisionTableRow,
    outputColumns: DecisionTableColumn[]
): any {
    if (outputColumns.length === 0) {
        return null;
    }

    if (outputColumns.length === 1) {
        const column = outputColumns[0];
        const cellValue = row.cells[column.id] || '';
        return compileOutputCell(cellValue, column);
    }

    // Multiple outputs = return object
    const output: Record<string, any> = {};
    for (const column of outputColumns) {
        const cellValue = row.cells[column.id] || '';
        output[column.field] = compileOutputCell(cellValue, column);
    }
    return output;
}

/**
 * Validate a decision table structure
 * Returns array of error messages, empty if valid
 */
export function validateTable(table: DecisionTable): string[] {
    const errors: string[] = [];

    if (!table.id) {
        errors.push('Table must have an id');
    }

    if (!table.name) {
        errors.push('Table must have a name');
    }

    if (!table.columns || table.columns.length === 0) {
        errors.push('Table must have at least one column');
    }

    const inputColumns = table.columns.filter(c => c.type === 'input');
    const outputColumns = table.columns.filter(c => c.type === 'output');

    if (inputColumns.length === 0) {
        errors.push('Table must have at least one input column');
    }

    if (outputColumns.length === 0) {
        errors.push('Table must have at least one output column');
    }

    // Check for duplicate column IDs
    const columnIds = new Set<string>();
    for (const col of table.columns) {
        if (columnIds.has(col.id)) {
            errors.push(`Duplicate column id: ${col.id}`);
        }
        columnIds.add(col.id);
    }

    // Validate rows reference valid columns
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        for (const cellId of Object.keys(row.cells)) {
            if (!columnIds.has(cellId)) {
                errors.push(`Row ${i + 1}: Unknown column id "${cellId}"`);
            }
        }
    }

    return errors;
}

/**
 * Create an empty decision table with default structure
 */
export function createEmptyTable(
    id: string,
    name: string,
    inputFields: { field: string; label: string; dataType: 'string' | 'number' | 'boolean' | 'date' }[],
    outputFields: { field: string; label: string; dataType: 'string' | 'number' | 'boolean' | 'date' }[]
): DecisionTable {
    const columns: DecisionTableColumn[] = [
        ...inputFields.map((f, i) => ({
            id: `input_${i}`,
            type: 'input' as const,
            field: f.field,
            label: f.label,
            dataType: f.dataType,
        })),
        ...outputFields.map((f, i) => ({
            id: `output_${i}`,
            type: 'output' as const,
            field: f.field,
            label: f.label,
            dataType: f.dataType,
        })),
    ];

    return {
        id,
        name,
        hitPolicy: 'first',
        columns,
        rows: [],
    };
}

/**
 * Add a row to a decision table
 */
export function addTableRow(
    table: DecisionTable,
    cells: Record<string, string> = {}
): DecisionTable {
    const newRow: DecisionTableRow = {
        id: crypto.randomUUID(), // Use standard UUID
        cells,
    };

    return {
        ...table,
        rows: [...table.rows, newRow],
    };
}
