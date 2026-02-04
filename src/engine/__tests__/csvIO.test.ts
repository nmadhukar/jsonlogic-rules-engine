import { describe, it, expect } from 'vitest';
import {
    exportTableToCsv,
    importTableFromCsv,
    validateCsv,
    createCsvTemplate,
} from '../csvIO';
import type { DecisionTable } from '../../types/decisionTable';

const sampleTable: DecisionTable = {
    id: 'discount-table',
    name: 'Discount Rules',
    description: 'Customer discount calculation',
    hitPolicy: 'first',
    columns: [
        { id: 'tier', type: 'input', field: 'customer.tier', label: 'Customer Tier', dataType: 'string' },
        { id: 'amount', type: 'input', field: 'order.amount', label: 'Order Amount', dataType: 'number' },
        { id: 'discount', type: 'output', field: 'discount', label: 'Discount', dataType: 'number' },
    ],
    rows: [
        { id: 'r1', cells: { tier: 'gold', amount: '> 100', discount: '0.20' } },
        { id: 'r2', cells: { tier: 'silver', amount: '*', discount: '0.10' } },
    ],
};

describe('CSV I/O', () => {
    describe('exportTableToCsv', () => {
        it('exports basic table to CSV', () => {
            const csv = exportTableToCsv(sampleTable);
            const lines = csv.split('\n');

            expect(lines[0]).toBe('IN:Customer Tier,IN:Order Amount,OUT:Discount');
            expect(lines[1]).toBe('gold,> 100,0.20');
            expect(lines[2]).toBe('silver,*,0.10');
        });

        it('exports with metadata comments', () => {
            const csv = exportTableToCsv(sampleTable, { includeMetadata: true });

            expect(csv).toContain('# Table: Discount Rules');
            expect(csv).toContain('# ID: discount-table');
            expect(csv).toContain('# Hit Policy: first');
            expect(csv).toContain('# Description: Customer discount calculation');
        });

        it('uses custom delimiter', () => {
            const csv = exportTableToCsv(sampleTable, { delimiter: ';' });
            const lines = csv.split('\n');

            expect(lines[0]).toBe('IN:Customer Tier;IN:Order Amount;OUT:Discount');
        });

        it('escapes values containing delimiter', () => {
            const tableWithComma: DecisionTable = {
                ...sampleTable,
                rows: [
                    { id: 'r1', cells: { tier: 'gold, premium', amount: '100', discount: '0.20' } },
                ],
            };

            const csv = exportTableToCsv(tableWithComma);
            expect(csv).toContain('"gold, premium"');
        });

        it('escapes values containing quotes', () => {
            const tableWithQuotes: DecisionTable = {
                ...sampleTable,
                rows: [
                    { id: 'r1', cells: { tier: 'tier "A"', amount: '100', discount: '0.20' } },
                ],
            };

            const csv = exportTableToCsv(tableWithQuotes);
            expect(csv).toContain('"tier ""A"""');
        });

        it('exports without header', () => {
            const csv = exportTableToCsv(sampleTable, { includeHeader: false });
            const lines = csv.split('\n');

            expect(lines[0]).toBe('gold,> 100,0.20');
        });
    });

    describe('importTableFromCsv', () => {
        it('imports basic CSV', () => {
            const csv = `IN:Tier,IN:Amount,OUT:Discount
gold,> 100,0.20
silver,*,0.10`;

            const result = importTableFromCsv(csv, 'imported-table', 'Imported Table');

            expect(result.table.id).toBe('imported-table');
            expect(result.table.name).toBe('Imported Table');
            expect(result.table.columns).toHaveLength(3);
            expect(result.table.rows).toHaveLength(2);

            expect(result.table.columns[0].type).toBe('input');
            expect(result.table.columns[0].label).toBe('Tier');
            expect(result.table.columns[2].type).toBe('output');

            expect(result.table.rows[0].cells.col_0).toBe('gold');
            expect(result.table.rows[0].cells.col_1).toBe('> 100');
            expect(result.table.rows[0].cells.col_2).toBe('0.20');
        });

        it('detects delimiter automatically', () => {
            const csvSemicolon = `IN:Tier;IN:Amount;OUT:Discount
gold;> 100;0.20`;

            const result = importTableFromCsv(csvSemicolon, 'test', 'Test');
            expect(result.table.columns).toHaveLength(3);
        });

        it('handles quoted values', () => {
            const csv = `IN:Name,OUT:Result
"John, Jr.",pass`;

            const result = importTableFromCsv(csv, 'test', 'Test');
            expect(result.table.rows[0].cells.col_0).toBe('John, Jr.');
        });

        it('handles escaped quotes', () => {
            const csv = `IN:Name,OUT:Result
"Name ""Quoted""",pass`;

            const result = importTableFromCsv(csv, 'test', 'Test');
            expect(result.table.rows[0].cells.col_0).toBe('Name "Quoted"');
        });

        it('skips comment lines', () => {
            const csv = `# This is a comment
# Another comment
IN:Tier,OUT:Discount
gold,0.20`;

            const result = importTableFromCsv(csv, 'test', 'Test');
            expect(result.table.rows).toHaveLength(1);
        });

        it('warns about missing prefixes', () => {
            const csv = `Tier,OUT:Discount
gold,0.20`;

            const result = importTableFromCsv(csv, 'test', 'Test');
            expect(result.warnings.some(w => w.includes('no IN:/OUT: prefix'))).toBe(true);
            expect(result.table.columns[0].type).toBe('input'); // Defaults to input
        });

        it('generates field names from labels', () => {
            const csv = `IN:Customer Tier,OUT:Final Discount
gold,0.20`;

            const result = importTableFromCsv(csv, 'test', 'Test');
            expect(result.table.columns[0].field).toBe('customer_tier');
            expect(result.table.columns[1].field).toBe('final_discount');
        });
    });

    describe('validateCsv', () => {
        it('accepts valid CSV', () => {
            const csv = `IN:Tier,OUT:Discount
gold,0.20`;

            expect(validateCsv(csv)).toEqual([]);
        });

        it('rejects empty CSV', () => {
            expect(validateCsv('')).toContain('CSV is empty');
        });

        it('rejects header-only CSV', () => {
            expect(validateCsv('IN:Tier,OUT:Discount')).toContain('CSV has no data rows (only header)');
        });

        it('detects inconsistent column count', () => {
            const csv = `IN:A,IN:B,OUT:C
1,2,3
1,2`;

            const errors = validateCsv(csv);
            expect(errors.some(e => e.includes('columns'))).toBe(true);
        });

        it('requires input and output columns', () => {
            const noInput = `OUT:A,OUT:B
1,2`;
            expect(validateCsv(noInput)).toContain('CSV must have at least one input column (prefix with "IN:")');

            const noOutput = `IN:A,IN:B
1,2`;
            expect(validateCsv(noOutput)).toContain('CSV must have at least one output column (prefix with "OUT:")');
        });
    });

    describe('createCsvTemplate', () => {
        it('creates template with correct headers', () => {
            const template = createCsvTemplate(
                [{ label: 'Age' }, { label: 'Tier' }],
                [{ label: 'Discount' }]
            );

            const lines = template.split('\n');
            expect(lines[0]).toBe('IN:Age,IN:Tier,OUT:Discount');
            expect(lines[1]).toBe('*,*,'); // Wildcards for inputs, empty for output
        });
    });

    describe('roundtrip', () => {
        it('exports and imports back to equivalent table', () => {
            const csv = exportTableToCsv(sampleTable);
            const imported = importTableFromCsv(csv, sampleTable.id, sampleTable.name);

            // Check structural equivalence
            expect(imported.table.columns.length).toBe(sampleTable.columns.length);
            expect(imported.table.rows.length).toBe(sampleTable.rows.length);

            // Check cell values
            const originalFirstRow = sampleTable.rows[0];
            const importedFirstRow = imported.table.rows[0];

            expect(importedFirstRow.cells.col_0).toBe(originalFirstRow.cells.tier);
            expect(importedFirstRow.cells.col_1).toBe(originalFirstRow.cells.amount);
            expect(importedFirstRow.cells.col_2).toBe(originalFirstRow.cells.discount);
        });
    });
});
