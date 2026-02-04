import { describe, it, expect } from 'vitest';
import { compileCell, compileOutputCell, validateCellExpression } from '../cellCompiler';
import type { DecisionTableColumn } from '../../types/decisionTable';

const numberColumn: DecisionTableColumn = {
    id: 'col1',
    type: 'input',
    field: 'patient.age',
    label: 'Patient Age',
    dataType: 'number',
};

const stringColumn: DecisionTableColumn = {
    id: 'col2',
    type: 'input',
    field: 'patient.tier',
    label: 'Customer Tier',
    dataType: 'string',
};

const booleanColumn: DecisionTableColumn = {
    id: 'col3',
    type: 'input',
    field: 'patient.active',
    label: 'Is Active',
    dataType: 'boolean',
};

describe('Cell Compiler', () => {
    describe('compileCell', () => {
        it('compiles wildcard cells', () => {
            expect(compileCell('', numberColumn)).toEqual({ logic: true, isWildcard: true });
            expect(compileCell('*', numberColumn)).toEqual({ logic: true, isWildcard: true });
            expect(compileCell('  *  ', numberColumn)).toEqual({ logic: true, isWildcard: true });
        });

        it('compiles exact match for strings', () => {
            const result = compileCell('gold', stringColumn);
            expect(result.logic).toEqual({ '==': [{ var: 'patient.tier' }, 'gold'] });
            expect(result.isWildcard).toBe(false);
        });

        it('compiles exact match for numbers', () => {
            const result = compileCell('65', numberColumn);
            expect(result.logic).toEqual({ '==': [{ var: 'patient.age' }, 65] });
        });

        it('compiles greater than operator', () => {
            const result = compileCell('> 100', numberColumn);
            expect(result.logic).toEqual({ '>': [{ var: 'patient.age' }, 100] });
        });

        it('compiles greater than or equal operator', () => {
            const result = compileCell('>= 18', numberColumn);
            expect(result.logic).toEqual({ '>=': [{ var: 'patient.age' }, 18] });
        });

        it('compiles less than operator', () => {
            const result = compileCell('< 50', numberColumn);
            expect(result.logic).toEqual({ '<': [{ var: 'patient.age' }, 50] });
        });

        it('compiles less than or equal operator', () => {
            const result = compileCell('<= 120', numberColumn);
            expect(result.logic).toEqual({ '<=': [{ var: 'patient.age' }, 120] });
        });

        it('compiles not equal operator', () => {
            const result = compileCell('!= blocked', stringColumn);
            expect(result.logic).toEqual({ '!=': [{ var: 'patient.tier' }, 'blocked'] });
        });

        it('compiles range (between) syntax', () => {
            const result = compileCell('18..65', numberColumn);
            expect(result.logic).toEqual({ between: [{ var: 'patient.age' }, 18, 65] });
        });

        it('compiles list (in) syntax', () => {
            const result = compileCell('gold, silver, bronze', stringColumn);
            expect(result.logic).toEqual({ in: [{ var: 'patient.tier' }, ['gold', 'silver', 'bronze']] });
        });

        it('compiles boolean true', () => {
            const result = compileCell('true', booleanColumn);
            expect(result.logic).toEqual({ '==': [{ var: 'patient.active' }, true] });
        });

        it('compiles boolean false', () => {
            const result = compileCell('false', booleanColumn);
            expect(result.logic).toEqual({ '==': [{ var: 'patient.active' }, false] });
        });

        it('handles decimal numbers in ranges', () => {
            const result = compileCell('0.5..1.5', numberColumn);
            expect(result.logic).toEqual({ between: [{ var: 'patient.age' }, 0.5, 1.5] });
        });

        it('handles negative numbers', () => {
            const result = compileCell('-10..10', numberColumn);
            expect(result.logic).toEqual({ between: [{ var: 'patient.age' }, -10, 10] });
        });
    });

    describe('compileOutputCell', () => {
        const outputColumn: DecisionTableColumn = {
            id: 'out1',
            type: 'output',
            field: 'discount',
            label: 'Discount',
            dataType: 'number',
        };

        it('compiles empty output as null', () => {
            expect(compileOutputCell('', outputColumn)).toBe(null);
        });

        it('compiles number output', () => {
            expect(compileOutputCell('0.15', outputColumn)).toBe(0.15);
        });

        it('compiles string output', () => {
            const stringOutput: DecisionTableColumn = { ...outputColumn, dataType: 'string' };
            expect(compileOutputCell('approved', stringOutput)).toBe('approved');
        });

        it('compiles variable reference', () => {
            expect(compileOutputCell('$patient.name', outputColumn)).toEqual({ var: 'patient.name' });
        });

        it('compiles JSONLogic expression', () => {
            const jsonOutput = '{"*": [{"var": "price"}, 0.9]}';
            expect(compileOutputCell(jsonOutput, outputColumn)).toEqual({ '*': [{ var: 'price' }, 0.9] });
        });
    });

    describe('validateCellExpression', () => {
        it('accepts wildcards', () => {
            expect(validateCellExpression('', numberColumn)).toBe(null);
            expect(validateCellExpression('*', numberColumn)).toBe(null);
        });

        it('validates range syntax', () => {
            expect(validateCellExpression('10..100', numberColumn)).toBe(null);
            expect(validateCellExpression('10..abc', numberColumn)).not.toBe(null);
        });

        it('validates range bounds', () => {
            expect(validateCellExpression('100..10', numberColumn)).toContain('minimum');
        });

        it('validates comparison operators', () => {
            expect(validateCellExpression('> 100', numberColumn)).toBe(null);
            expect(validateCellExpression('> abc', numberColumn)).not.toBe(null);
        });

        it('validates number values for number columns', () => {
            expect(validateCellExpression('abc', numberColumn)).not.toBe(null);
            expect(validateCellExpression('123', numberColumn)).toBe(null);
        });
    });
});
