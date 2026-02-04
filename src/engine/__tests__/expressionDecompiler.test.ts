import { describe, it, expect } from 'vitest';
import { decompileExpression } from '../expressionDecompiler';
import { parseExpression } from '../expressionParser';

describe('Expression Decompiler', () => {
    it('decompiles basic comparisons', () => {
        expect(decompileExpression({ ">": [{ var: "age" }, 18] })).toBe('age > 18');
        expect(decompileExpression({ "==": [{ var: "name" }, "John"] })).toBe('name == "John"');
    });

    it('decompiles arithmetic with correct precedence', () => {
        // (a + b) * c
        expect(decompileExpression({ "*": [{ "+": [{ var: "a" }, { var: "b" }] }, { var: "c" }] }))
            .toBe('(a + b) * c');

        // a + b * c -> no parens needed
        expect(decompileExpression({ "+": [{ var: "a" }, { "*": [{ var: "b" }, { var: "c" }] }] }))
            .toBe('a + b * c');
    });

    it('detects and decompiles "between" pattern', () => {
        // Pattern: age >= 18 and age <= 65
        const logic = {
            "and": [
                { ">=": [{ var: "age" }, 18] },
                { "<=": [{ var: "age" }, 65] }
            ]
        };
        expect(decompileExpression(logic)).toBe('age between 18 and 65');

        // Pattern 2: age <= 65 and age >= 18 (order reversed)
        const logicReverse = {
            "and": [
                { "<=": [{ var: "age" }, 65] },
                { ">=": [{ var: "age" }, 18] }
            ]
        };
        expect(decompileExpression(logicReverse)).toBe('age between 18 and 65');
    });

    it('decompiles custom functions', () => {
        expect(decompileExpression({ "max": [1, 2] })).toBe('max(1, 2)');
        expect(decompileExpression({ "contains": [{ var: "name" }, "john"] })).toBe('contains(name, "john")');
    });

    it('roundtrip test', () => {
        const original = 'age > 18 and (tier == "gold" or tier == "plat")';
        const logic = parseExpression(original);
        const text = decompileExpression(logic);
        // Note: output might normalize spacing/parens, but logic should preserve
        const loopback = decompileExpression(parseExpression(text));
        expect(loopback).toBe(text);

        // Verify semantics
        expect(text).toContain('age > 18');
        expect(text).toContain('tier == "gold"');
    });
});
