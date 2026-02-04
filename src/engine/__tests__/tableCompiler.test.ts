/**
 * Table Compiler Tests
 * Tests for decision table compilation to JSONLogic
 */

import { describe, it, expect } from 'vitest';
import { compileCell, compileOutputCell } from '../cellCompiler';
import { compileTable, validateTable, createEmptyTable, addTableRow } from '../tableCompiler';
import type { DecisionTable, DecisionTableColumn } from '../../types/decisionTable';

// Helper to create a column for testing
function createInputColumn(
    id: string,
    field: string,
    dataType: 'string' | 'number' | 'boolean' | 'date' = 'string'
): DecisionTableColumn {
    return { id, type: 'input', field, label: field, dataType };
}

function createOutputColumn(
    id: string,
    field: string,
    dataType: 'string' | 'number' | 'boolean' | 'date' = 'string'
): DecisionTableColumn {
    return { id, type: 'output', field, label: field, dataType };
}

describe('Cell Compiler', () => {
    describe('compileCell', () => {
        it('compiles wildcards', () => {
            const col = createInputColumn('c1', 'status');
            expect(compileCell('', col)).toEqual({ logic: true, isWildcard: true });
            expect(compileCell('*', col)).toEqual({ logic: true, isWildcard: true });
        });

        it('compiles exact string matches', () => {
            const col = createInputColumn('c1', 'country', 'string');
            const result = compileCell('US', col);
            expect(result.isWildcard).toBe(false);
            expect(result.logic).toEqual({ '==': [{ var: 'country' }, 'US'] });
        });

        it('compiles exact number matches', () => {
            const col = createInputColumn('c1', 'age', 'number');
            const result = compileCell('18', col);
            expect(result.isWildcard).toBe(false);
            expect(result.logic).toEqual({ '==': [{ var: 'age' }, 18] });
        });

        it('compiles comparison operators', () => {
            const col = createInputColumn('c1', 'age', 'number');

            expect(compileCell('> 18', col).logic).toEqual({ '>': [{ var: 'age' }, 18] });
            expect(compileCell('>= 18', col).logic).toEqual({ '>=': [{ var: 'age' }, 18] });
            expect(compileCell('< 18', col).logic).toEqual({ '<': [{ var: 'age' }, 18] });
            expect(compileCell('<= 18', col).logic).toEqual({ '<=': [{ var: 'age' }, 18] });
            expect(compileCell('!= 18', col).logic).toEqual({ '!=': [{ var: 'age' }, 18] });
            expect(compileCell('== 18', col).logic).toEqual({ '==': [{ var: 'age' }, 18] });
        });

        it('compiles range expressions', () => {
            const col = createInputColumn('c1', 'score', 'number');
            const result = compileCell('10..100', col);
            expect(result.isWildcard).toBe(false);
            expect(result.logic).toEqual({ between: [{ var: 'score' }, 10, 100] });
        });

        it('compiles decimal ranges', () => {
            const col = createInputColumn('c1', 'price', 'number');
            const result = compileCell('9.99..99.99', col);
            expect(result.logic).toEqual({ between: [{ var: 'price' }, 9.99, 99.99] });
        });

        it('compiles list expressions', () => {
            const col = createInputColumn('c1', 'country', 'string');
            const result = compileCell('US, CA, UK', col);
            expect(result.isWildcard).toBe(false);
            expect(result.logic).toEqual({ in: [{ var: 'country' }, ['US', 'CA', 'UK']] });
        });

        it('compiles number lists', () => {
            const col = createInputColumn('c1', 'code', 'number');
            const result = compileCell('1, 2, 3', col);
            expect(result.logic).toEqual({ in: [{ var: 'code' }, [1, 2, 3]] });
        });

        it('compiles boolean literals', () => {
            const col = createInputColumn('c1', 'active', 'boolean');
            expect(compileCell('true', col).logic).toEqual({ '==': [{ var: 'active' }, true] });
            expect(compileCell('false', col).logic).toEqual({ '==': [{ var: 'active' }, false] });
        });
    });

    describe('compileOutputCell', () => {
        it('returns null for empty output', () => {
            const col = createOutputColumn('o1', 'result');
            expect(compileOutputCell('', col)).toBeNull();
        });

        it('parses static string values', () => {
            const col = createOutputColumn('o1', 'result', 'string');
            expect(compileOutputCell('approved', col)).toBe('approved');
        });

        it('parses static number values', () => {
            const col = createOutputColumn('o1', 'discount', 'number');
            expect(compileOutputCell('15', col)).toBe(15);
        });

        it('parses variable references with $ prefix', () => {
            const col = createOutputColumn('o1', 'result', 'string');
            expect(compileOutputCell('$patient.name', col)).toEqual({ var: 'patient.name' });
        });

        it('parses JSONLogic expressions', () => {
            const col = createOutputColumn('o1', 'result', 'number');
            const result = compileOutputCell('{"+":[{"var":"base"},10]}', col);
            expect(result).toEqual({ '+': [{ var: 'base' }, 10] });
        });
    });
});

describe('Table Compiler', () => {
    describe('compileTable', () => {
        it('returns null for empty table', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Empty Table',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'age', 'number'),
                    createOutputColumn('o1', 'result', 'string'),
                ],
                rows: [],
            };

            const result = compileTable(table);
            expect(result.logic).toBeNull();
            expect(result.meta.rowCount).toBe(0);
        });

        it('compiles First hit policy as nested if/else', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Age Discount',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'age', 'number'),
                    createOutputColumn('o1', 'discount', 'number'),
                ],
                rows: [
                    { id: 'r1', cells: { c1: '< 18', o1: '20' } },
                    { id: 'r2', cells: { c1: '>= 65', o1: '15' } },
                    { id: 'r3', cells: { c1: '*', o1: '0' } },
                ],
            };

            const result = compileTable(table);
            expect(result.meta.hitPolicy).toBe('first');
            expect(result.logic).toHaveProperty('if');

            // Structure: if(age < 18, 20, if(age >= 65, 15, 0))
            const logic = result.logic;
            expect(logic.if[0]).toEqual({ '<': [{ var: 'age' }, 18] }); // condition 1
            expect(logic.if[1]).toBe(20); // output 1
            expect(logic.if[2]).toHaveProperty('if'); // nested else

            const nested = logic.if[2];
            expect(nested.if[0]).toEqual({ '>=': [{ var: 'age' }, 65] }); // condition 2
            expect(nested.if[1]).toBe(15); // output 2
            expect(nested.if[2]).toBe(0); // default output (wildcard row)
        });

        it('compiles multiple input conditions with AND', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Tier Lookup',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'customer.type', 'string'),
                    createInputColumn('c2', 'order.amount', 'number'),
                    createOutputColumn('o1', 'tier', 'string'),
                ],
                rows: [
                    { id: 'r1', cells: { c1: 'gold', c2: '> 1000', o1: 'premium' } },
                    { id: 'r2', cells: { c1: '*', c2: '*', o1: 'standard' } },
                ],
            };

            const result = compileTable(table);
            const logic = result.logic;

            // First row should have AND condition
            expect(logic.if[0]).toHaveProperty('and');
            expect(logic.if[0].and).toContainEqual({ '==': [{ var: 'customer.type' }, 'gold'] });
            expect(logic.if[0].and).toContainEqual({ '>': [{ var: 'order.amount' }, 1000] });
            expect(logic.if[1]).toBe('premium');
            expect(logic.if[2]).toBe('standard'); // wildcard row becomes default
        });

        it('compiles Collect hit policy', () => {
            const collectTable: DecisionTable = {
                id: 't1',
                name: 'Discount Rules',
                hitPolicy: 'collect',
                columns: [
                    createInputColumn('c1', 'customer.type', 'string'),
                    createOutputColumn('o1', 'discount_type', 'string'),
                ],
                rows: [
                    { id: 'r1', cells: { c1: 'gold', o1: 'loyalty_bonus' } },
                    { id: 'r2', cells: { c1: 'gold, platinum', o1: 'vip_discount' } },
                    { id: 'r3', cells: { c1: '*', o1: 'standard_rate' } },
                ],
            };

            const result = compileTable(collectTable);
            expect(result.meta.hitPolicy).toBe('collect');
            expect(result.logic).toHaveProperty('collect_table');

            // collect_table wraps pairs in an extra array
            const pairs = result.logic.collect_table[0];
            expect(pairs).toHaveLength(3);

            // Each pair is [condition, output]
            expect(pairs[0][1]).toBe('loyalty_bonus');
            expect(pairs[1][1]).toBe('vip_discount');
            expect(pairs[2][0]).toBe(true); // wildcard
            expect(pairs[2][1]).toBe('standard_rate');
        });

        it('handles multiple output columns', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Multi-Output',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'score', 'number'),
                    createOutputColumn('o1', 'grade', 'string'),
                    createOutputColumn('o2', 'passed', 'boolean'),
                ],
                rows: [
                    { id: 'r1', cells: { c1: '>= 90', o1: 'A', o2: 'true' } },
                    { id: 'r2', cells: { c1: '>= 60', o1: 'C', o2: 'true' } },
                    { id: 'r3', cells: { c1: '*', o1: 'F', o2: 'false' } },
                ],
            };

            const result = compileTable(table);
            const logic = result.logic;

            // Outputs should be objects with both fields
            expect(logic.if[1]).toEqual({ grade: 'A', passed: true });
            expect(logic.if[2].if[1]).toEqual({ grade: 'C', passed: true });
            expect(logic.if[2].if[2]).toEqual({ grade: 'F', passed: false });
        });
    });

    describe('validateTable', () => {
        it('validates table has required fields', () => {
            const invalidTable = {
                id: '',
                name: '',
                hitPolicy: 'first' as const,
                columns: [],
                rows: [],
            };

            const errors = validateTable(invalidTable);
            expect(errors).toContain('Table must have an id');
            expect(errors).toContain('Table must have a name');
            expect(errors).toContain('Table must have at least one column');
        });

        it('validates table has input and output columns', () => {
            const noInputTable: DecisionTable = {
                id: 't1',
                name: 'Test',
                hitPolicy: 'first',
                columns: [createOutputColumn('o1', 'result')],
                rows: [],
            };

            const noOutputTable: DecisionTable = {
                id: 't1',
                name: 'Test',
                hitPolicy: 'first',
                columns: [createInputColumn('c1', 'age', 'number')],
                rows: [],
            };

            expect(validateTable(noInputTable)).toContain('Table must have at least one input column');
            expect(validateTable(noOutputTable)).toContain('Table must have at least one output column');
        });

        it('detects duplicate column IDs', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Test',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'age', 'number'),
                    createInputColumn('c1', 'name', 'string'), // duplicate id
                    createOutputColumn('o1', 'result'),
                ],
                rows: [],
            };

            const errors = validateTable(table);
            expect(errors).toContain('Duplicate column id: c1');
        });

        it('detects invalid column references in rows', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Test',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'age', 'number'),
                    createOutputColumn('o1', 'result'),
                ],
                rows: [
                    { id: 'r1', cells: { c1: '> 18', o1: 'adult', invalid_col: 'test' } },
                ],
            };

            const errors = validateTable(table);
            expect(errors).toContain('Row 1: Unknown column id "invalid_col"');
        });

        it('returns empty array for valid table', () => {
            const table: DecisionTable = {
                id: 't1',
                name: 'Valid Table',
                hitPolicy: 'first',
                columns: [
                    createInputColumn('c1', 'age', 'number'),
                    createOutputColumn('o1', 'result', 'string'),
                ],
                rows: [
                    { id: 'r1', cells: { c1: '> 18', o1: 'adult' } },
                ],
            };

            const errors = validateTable(table);
            expect(errors).toHaveLength(0);
        });
    });

    describe('createEmptyTable', () => {
        it('creates a table with specified structure', () => {
            const table = createEmptyTable(
                'new-table',
                'New Decision Table',
                [{ field: 'age', label: 'Patient Age', dataType: 'number' }],
                [{ field: 'eligible', label: 'Is Eligible', dataType: 'boolean' }]
            );

            expect(table.id).toBe('new-table');
            expect(table.name).toBe('New Decision Table');
            expect(table.hitPolicy).toBe('first');
            expect(table.columns).toHaveLength(2);
            expect(table.rows).toHaveLength(0);

            expect(table.columns[0].type).toBe('input');
            expect(table.columns[0].field).toBe('age');
            expect(table.columns[1].type).toBe('output');
            expect(table.columns[1].field).toBe('eligible');
        });
    });

    describe('addTableRow', () => {
        it('adds a row to the table', () => {
            const table = createEmptyTable(
                't1',
                'Test',
                [{ field: 'age', label: 'Age', dataType: 'number' }],
                [{ field: 'result', label: 'Result', dataType: 'string' }]
            );

            const updated = addTableRow(table, {
                input_0: '> 18',
                output_0: 'adult',
            });

            expect(updated.rows).toHaveLength(1);
            expect(updated.rows[0].cells.input_0).toBe('> 18');
            expect(updated.rows[0].cells.output_0).toBe('adult');
            expect(updated.rows[0].id).toBeTruthy();
        });

        it('generates unique row IDs', () => {
            let table = createEmptyTable(
                't1',
                'Test',
                [{ field: 'age', label: 'Age', dataType: 'number' }],
                [{ field: 'result', label: 'Result', dataType: 'string' }]
            );

            table = addTableRow(table, {});
            table = addTableRow(table, {});

            expect(table.rows[0].id).not.toBe(table.rows[1].id);
        });
    });
});
