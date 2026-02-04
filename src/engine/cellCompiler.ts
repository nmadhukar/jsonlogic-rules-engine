/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CELL COMPILER
 * Compiles decision table cell expressions to JSONLogic conditions
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cell syntax examples:
 * - Empty or "*"     -> Match any (wildcard) -> true
 * - "gold"           -> Exact match -> { "==": [{"var":"field"}, "gold"] }
 * - "> 100"          -> Greater than -> { ">": [{"var":"field"}, 100] }
 * - ">= 50"          -> Greater than or equal
 * - "< 10"           -> Less than
 * - "<= 20"          -> Less than or equal
 * - "!= blocked"     -> Not equal
 * - "100..500"       -> Between (inclusive) -> { "between": [{"var":"field"}, 100, 500] }
 * - "US, CA, UK"     -> One of (list) -> { "in": [{"var":"field"}, ["US","CA","UK"]] }
 * - "true" / "false" -> Boolean match
 */

import type { DecisionTableColumn } from '../types/decisionTable';

export interface CellCompileResult {
    /** The compiled JSONLogic condition */
    logic: any;
    /** Whether this is a wildcard (always true) */
    isWildcard: boolean;
}

/**
 * Compile a single cell expression to JSONLogic
 * @param cellValue The cell expression string
 * @param column The column definition (provides field path and data type)
 * @returns Compiled JSONLogic condition
 */
export function compileCell(
    cellValue: string,
    column: DecisionTableColumn
): CellCompileResult {
    const value = (cellValue || '').trim();
    const field = column.field;
    const dataType = column.dataType;

    // Wildcard: empty or "*"
    if (!value || value === '*') {
        return { logic: true, isWildcard: true };
    }

    // Between range: "100..500"
    const rangeMatch = value.match(/^(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
        const low = parseNumber(rangeMatch[1]);
        const high = parseNumber(rangeMatch[2]);
        return {
            logic: { between: [{ var: field }, low, high] },
            isWildcard: false,
        };
    }

    // Comparison operators: >, >=, <, <=, ==, !=
    const comparisonMatch = value.match(/^(>=|<=|>|<|==|!=)\s*(.+)$/);
    if (comparisonMatch) {
        const op = comparisonMatch[1];
        const rawValue = comparisonMatch[2].trim();
        const parsedValue = parseValue(rawValue, dataType);
        return {
            logic: { [op]: [{ var: field }, parsedValue] },
            isWildcard: false,
        };
    }

    // List (comma-separated): "US, CA, UK"
    if (value.includes(',')) {
        const items = value.split(',').map(item => {
            const trimmed = item.trim();
            return parseValue(trimmed, dataType);
        });
        return {
            logic: { in: [{ var: field }, items] },
            isWildcard: false,
        };
    }

    // Boolean literals
    if (value.toLowerCase() === 'true') {
        return {
            logic: { '==': [{ var: field }, true] },
            isWildcard: false,
        };
    }
    if (value.toLowerCase() === 'false') {
        return {
            logic: { '==': [{ var: field }, false] },
            isWildcard: false,
        };
    }

    // Exact match (default)
    const parsedValue = parseValue(value, dataType);
    return {
        logic: { '==': [{ var: field }, parsedValue] },
        isWildcard: false,
    };
}

/**
 * Parse a string value to the appropriate type based on dataType
 */
function parseValue(
    value: string,
    dataType: 'string' | 'number' | 'boolean' | 'date'
): string | number | boolean {
    // Remove surrounding quotes if present
    const unquoted = value.replace(/^["'](.*)["']$/, '$1');

    switch (dataType) {
        case 'number':
            return parseNumber(unquoted);
        case 'boolean':
            return unquoted.toLowerCase() === 'true';
        case 'date':
            // Keep dates as strings for JSONLogic
            return unquoted;
        case 'string':
        default:
            return unquoted;
    }
}

/**
 * Parse a number string, handling decimals
 */
function parseNumber(value: string): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * Compile an output cell expression
 * Output cells can contain:
 * - Static values: "approve", 100, true
 * - Variable references: {var: "patient.name"}
 * - Computed expressions: {"+": [{"var":"base"}, 10]}
 */
export function compileOutputCell(
    cellValue: string,
    column: DecisionTableColumn
): any {
    const value = (cellValue || '').trim();
    const dataType = column.dataType;

    // Empty output
    if (!value) {
        return null;
    }

    // Check if it's a JSONLogic expression (starts with {)
    if (value.startsWith('{')) {
        try {
            return JSON.parse(value);
        } catch {
            // Not valid JSON, treat as string
            return value;
        }
    }

    // Check if it references a variable (starts with $)
    if (value.startsWith('$')) {
        // $field.path -> {"var": "field.path"}
        return { var: value.slice(1) };
    }

    // Parse as appropriate type
    return parseValue(value, dataType);
}

/**
 * Validate a cell expression without compiling
 * Returns error message or null if valid
 */
export function validateCellExpression(
    cellValue: string,
    column: DecisionTableColumn
): string | null {
    const value = (cellValue || '').trim();

    // Wildcards are always valid
    if (!value || value === '*') {
        return null;
    }

    // Check range syntax
    if (value.includes('..')) {
        const rangeMatch = value.match(/^(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
        if (!rangeMatch) {
            return 'Invalid range syntax. Use format: min..max (e.g., 10..100)';
        }
        const low = parseFloat(rangeMatch[1]);
        const high = parseFloat(rangeMatch[2]);
        if (low > high) {
            return 'Range minimum must be less than or equal to maximum';
        }
        return null;
    }

    // Check comparison operators
    const comparisonMatch = value.match(/^(>=|<=|>|<|==|!=)\s*(.+)$/);
    if (comparisonMatch) {
        const rawValue = comparisonMatch[2].trim();
        if (!rawValue) {
            return 'Comparison operator requires a value';
        }
        if (column.dataType === 'number') {
            const num = parseFloat(rawValue);
            if (isNaN(num)) {
                return `Invalid number: "${rawValue}"`;
            }
        }
        return null;
    }

    // Check number type
    if (column.dataType === 'number') {
        // Allow comma-separated numbers
        const values = value.split(',').map(v => v.trim());
        for (const v of values) {
            if (v && isNaN(parseFloat(v))) {
                return `Invalid number: "${v}"`;
            }
        }
    }

    return null;
}
