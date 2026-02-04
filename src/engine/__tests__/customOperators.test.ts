import { describe, it, expect, beforeAll } from 'vitest';
import jsonLogic from 'json-logic-js';
import { registerCustomOperators } from '../../config/customOperators';

beforeAll(() => {
    registerCustomOperators();
});

describe('custom operators', () => {
    // String ops
    it('startsWith', () => {
        expect(jsonLogic.apply({ startsWith: [{ var: 'email' }, 'admin'] }, { email: 'admin@test.com' })).toBe(true);
        expect(jsonLogic.apply({ startsWith: [{ var: 'email' }, 'user'] }, { email: 'admin@test.com' })).toBe(false);
    });

    it('endsWith', () => {
        expect(jsonLogic.apply({ endsWith: [{ var: 'email' }, '.com'] }, { email: 'test@example.com' })).toBe(true);
    });

    it('contains', () => {
        expect(jsonLogic.apply({ contains: [{ var: 'name' }, 'john'] }, { name: 'John Smith' })).toBe(true);
        expect(jsonLogic.apply({ contains: [{ var: 'name' }, 'jane'] }, { name: 'John Smith' })).toBe(false);
    });

    it('len', () => {
        expect(jsonLogic.apply({ len: ['hello'] }, {})).toBe(5);
        expect(jsonLogic.apply({ len: [[1, 2, 3]] }, {})).toBe(3);
        expect(jsonLogic.apply({ len: [null] }, {})).toBe(0);
    });

    it('upper / lower / trim', () => {
        expect(jsonLogic.apply({ upper: ['hello'] }, {})).toBe('HELLO');
        expect(jsonLogic.apply({ lower: ['HELLO'] }, {})).toBe('hello');
        expect(jsonLogic.apply({ trim: ['  hi  '] }, {})).toBe('hi');
    });

    // Math ops
    it('abs', () => {
        expect(jsonLogic.apply({ abs: [-5] }, {})).toBe(5);
    });

    it('floor / ceil', () => {
        expect(jsonLogic.apply({ floor: [3.7] }, {})).toBe(3);
        expect(jsonLogic.apply({ ceil: [3.2] }, {})).toBe(4);
    });

    it('round', () => {
        expect(jsonLogic.apply({ round: [3.456] }, {})).toBe(3);
        expect(jsonLogic.apply({ round: [3.456, 2] }, {})).toBe(3.46);
        expect(jsonLogic.apply({ round: [3.455, 2] }, {})).toBe(3.46);
    });

    // Collection ops
    it('sum / count / avg', () => {
        expect(jsonLogic.apply({ sum: [[10, 20, 30]] }, {})).toBe(60);
        expect(jsonLogic.apply({ count: [[1, 2, 3, 4]] }, {})).toBe(4);
        expect(jsonLogic.apply({ avg: [[10, 20, 30]] }, {})).toBe(20);
    });

    // Date ops
    it('daysSince returns a positive number for past dates', () => {
        const past = new Date();
        past.setDate(past.getDate() - 10);
        expect(jsonLogic.apply({ daysSince: [past.toISOString()] }, {})).toBeGreaterThanOrEqual(9);
    });

    // Null ops
    it('isEmpty', () => {
        expect(jsonLogic.apply({ isEmpty: [null] }, {})).toBe(true);
        expect(jsonLogic.apply({ isEmpty: [''] }, {})).toBe(true);
        expect(jsonLogic.apply({ isEmpty: ['hello'] }, {})).toBe(false);
        expect(jsonLogic.apply({ isEmpty: [[]] }, {})).toBe(true);
    });

    it('coalesce', () => {
        expect(jsonLogic.apply({ coalesce: [null, undefined, 'fallback'] }, {})).toBe('fallback');
        expect(jsonLogic.apply({ coalesce: ['first', 'second'] }, {})).toBe('first');
    });

    it('between', () => {
        expect(jsonLogic.apply({ between: [5, 1, 10] }, {})).toBe(true);
        expect(jsonLogic.apply({ between: [15, 1, 10] }, {})).toBe(false);
    });

    it('collect_table', () => {
        // pairs wrapped in extra array to prevent json-logic-js spreading
        const pairs = [
            [true, 'match1'],
            [false, 'match2'],
            [true, 'match3']
        ];
        // Format: { collect_table: [pairs] } - wrapped in extra array
        const result = jsonLogic.apply({ collect_table: [pairs] }, {});
        expect(result).toEqual(['match1', 'match3']);
    });
});
