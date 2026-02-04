/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CSV I/O
 * Import and export decision tables as CSV files
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CSV Format:
 * - First row: Headers with column labels (prefixed with "IN:" or "OUT:")
 * - Subsequent rows: Cell values
 *
 * Example:
 * IN:Customer Tier,IN:Order Amount,OUT:Discount
 * gold,> 100,0.15
 * silver,> 50,0.10
 * *,*,0.05
 */

import type { DecisionTable, DecisionTableColumn, DecisionTableRow } from '../types/decisionTable';

export interface CsvExportOptions {
    /** Use custom delimiter (default: comma) */
    delimiter?: string;
    /** Include header row (default: true) */
    includeHeader?: boolean;
    /** Include table metadata as comments (default: false) */
    includeMetadata?: boolean;
}

export interface CsvImportOptions {
    /** Use custom delimiter (default: auto-detect or comma) */
    delimiter?: string;
    /** Skip first N rows (useful for metadata comments) */
    skipRows?: number;
}

export interface CsvImportResult {
    /** The imported decision table */
    table: DecisionTable;
    /** Any warnings during import */
    warnings: string[];
}

/**
 * Export a decision table to CSV string
 */
export function exportTableToCsv(
    table: DecisionTable,
    options: CsvExportOptions = {}
): string {
    const delimiter = options.delimiter || ',';
    const includeHeader = options.includeHeader !== false;
    const includeMetadata = options.includeMetadata || false;

    const lines: string[] = [];

    // Metadata comments
    if (includeMetadata) {
        lines.push(`# Table: ${table.name}`);
        lines.push(`# ID: ${table.id}`);
        lines.push(`# Hit Policy: ${table.hitPolicy}`);
        if (table.description) {
            lines.push(`# Description: ${table.description}`);
        }
        lines.push('');
    }

    // Header row
    if (includeHeader) {
        const headers = table.columns.map(col => {
            const prefix = col.type === 'input' ? 'IN:' : 'OUT:';
            return escapeCsvValue(`${prefix}${col.label}`, delimiter);
        });
        lines.push(headers.join(delimiter));
    }

    // Data rows
    for (const row of table.rows) {
        const values = table.columns.map(col => {
            const cellValue = row.cells[col.id] || '';
            return escapeCsvValue(cellValue, delimiter);
        });
        lines.push(values.join(delimiter));
    }

    return lines.join('\n');
}

/**
 * Import a decision table from CSV string
 */
export function importTableFromCsv(
    csv: string,
    tableId: string,
    tableName: string,
    options: CsvImportOptions = {}
): CsvImportResult {
    const warnings: string[] = [];

    // Detect delimiter if not specified
    const delimiter = options.delimiter || detectDelimiter(csv);

    // Parse CSV lines
    const lines = csv.split(/\r?\n/).filter(line => !line.startsWith('#') && line.trim());

    // Skip rows if specified
    const skipRows = options.skipRows || 0;
    const dataLines = lines.slice(skipRows);

    if (dataLines.length === 0) {
        throw new Error('CSV is empty or contains only comments');
    }

    // Parse header row
    const headerRow = parseCsvLine(dataLines[0], delimiter);
    const columns = parseHeaderRow(headerRow, warnings);

    if (columns.length === 0) {
        throw new Error('No valid columns found in header row');
    }

    // Parse data rows
    const rows: DecisionTableRow[] = [];
    for (let i = 1; i < dataLines.length; i++) {
        const values = parseCsvLine(dataLines[i], delimiter);
        const cells: Record<string, string> = {};

        for (let j = 0; j < columns.length; j++) {
            const col = columns[j];
            const value = values[j] || '';
            cells[col.id] = value;
        }

        rows.push({
            id: `row_${i}`,
            cells,
        });
    }

    const table: DecisionTable = {
        id: tableId,
        name: tableName,
        hitPolicy: 'first',
        columns,
        rows,
    };

    return { table, warnings };
}

/**
 * Parse header row to extract column definitions
 */
function parseHeaderRow(
    headers: string[],
    warnings: string[]
): DecisionTableColumn[] {
    const columns: DecisionTableColumn[] = [];

    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].trim();
        if (!header) continue;

        let type: 'input' | 'output' = 'input';
        let label = header;

        // Check for IN:/OUT: prefix
        if (header.toUpperCase().startsWith('IN:')) {
            type = 'input';
            label = header.slice(3).trim();
        } else if (header.toUpperCase().startsWith('OUT:')) {
            type = 'output';
            label = header.slice(4).trim();
        } else {
            warnings.push(`Column "${header}" has no IN:/OUT: prefix, assuming input`);
        }

        // Generate field from label
        const field = labelToField(label);

        columns.push({
            id: `col_${i}`,
            type,
            field,
            label,
            dataType: 'string', // Default to string, can be changed later
        });
    }

    return columns;
}

/**
 * Convert a label to a field name
 * "Customer Tier" -> "customer_tier"
 */
function labelToField(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Detect the delimiter used in a CSV string
 */
function detectDelimiter(csv: string): string {
    const firstLine = csv.split(/\r?\n/)[0] || '';

    // Count occurrences of common delimiters
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    const pipes = (firstLine.match(/\|/g) || []).length;

    const max = Math.max(commas, semicolons, tabs, pipes);

    if (max === 0) return ','; // Default to comma

    if (tabs === max) return '\t';
    if (semicolons === max) return ';';
    if (pipes === max) return '|';
    return ',';
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCsvLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote
                if (line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                    continue;
                } else {
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                current += char;
                i++;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
            } else if (char === delimiter) {
                values.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
    }

    // Add last value
    values.push(current.trim());

    return values;
}

/**
 * Escape a value for CSV output
 */
function escapeCsvValue(value: string, delimiter: string): string {
    // Check if value needs quoting
    const needsQuotes =
        value.includes(delimiter) ||
        value.includes('"') ||
        value.includes('\n') ||
        value.includes('\r');

    if (!needsQuotes) {
        return value;
    }

    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
}

/**
 * Create a sample CSV template for a decision table
 */
export function createCsvTemplate(
    inputColumns: { label: string }[],
    outputColumns: { label: string }[]
): string {
    const headers = [
        ...inputColumns.map(c => `IN:${c.label}`),
        ...outputColumns.map(c => `OUT:${c.label}`),
    ];

    const sampleRow = [
        ...inputColumns.map(() => '*'),
        ...outputColumns.map(() => ''),
    ];

    return [headers.join(','), sampleRow.join(',')].join('\n');
}

/**
 * Validate CSV before import
 * Returns array of errors, empty if valid
 */
export function validateCsv(csv: string): string[] {
    const errors: string[] = [];

    const lines = csv.split(/\r?\n/).filter(line => !line.startsWith('#') && line.trim());

    if (lines.length === 0) {
        errors.push('CSV is empty');
        return errors;
    }

    if (lines.length === 1) {
        errors.push('CSV has no data rows (only header)');
        return errors;
    }

    const delimiter = detectDelimiter(csv);
    const headerValues = parseCsvLine(lines[0], delimiter);

    // Check that all rows have same number of columns
    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        if (values.length !== headerValues.length) {
            errors.push(`Row ${i + 1} has ${values.length} columns, expected ${headerValues.length}`);
        }
    }

    // Check for at least one input and one output column
    let hasInput = false;
    let hasOutput = false;
    for (const header of headerValues) {
        if (header.toUpperCase().startsWith('IN:')) hasInput = true;
        if (header.toUpperCase().startsWith('OUT:')) hasOutput = true;
    }

    if (!hasInput) {
        errors.push('CSV must have at least one input column (prefix with "IN:")');
    }
    if (!hasOutput) {
        errors.push('CSV must have at least one output column (prefix with "OUT:")');
    }

    return errors;
}
