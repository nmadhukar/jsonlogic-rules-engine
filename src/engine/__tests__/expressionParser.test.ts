import { describe, it, expect } from 'vitest';
import { parseExpression } from '../expressionParser';

describe('Expression Parser', () => {
    it('parses basic comparisons', () => {
        expect(parseExpression('age > 18')).toEqual({ ">": [{ var: "age" }, 18] });
        expect(parseExpression('name == "John"')).toEqual({ "==": [{ var: "name" }, "John"] });
        expect(parseExpression('score <= 100')).toEqual({ "<=": [{ var: "score" }, 100] });
    });

    it('parses boolean logic (and/or/not)', () => {
        expect(parseExpression('active and valid')).toEqual({ "and": [{ var: "active" }, { var: "valid" }] });
        expect(parseExpression('a or b')).toEqual({ "or": [{ var: "a" }, { var: "b" }] });
        expect(parseExpression('not blocked')).toEqual({ "!": { var: "blocked" } });
        // Precedence: and > or
        // a or b and c -> a or (b and c)
        expect(parseExpression('a or b and c')).toEqual({ "or": [{ var: "a" }, { "and": [{ var: "b" }, { var: "c" }] }] });
    });

    it('parses complex nested logic', () => {
        const input = 'age >= 18 and (country == "US" or country == "CA")';
        const expected = {
            "and": [
                { ">=": [{ var: "age" }, 18] },
                {
                    "or": [
                        { "==": [{ var: "country" }, "US"] },
                        { "==": [{ var: "country" }, "CA"] }
                    ]
                }
            ]
        };
        expect(parseExpression(input)).toEqual(expected);
    });

    it('parses arithmetic', () => {
        expect(parseExpression('price * qty')).toEqual({ "*": [{ var: "price" }, { var: "qty" }] });
        expect(parseExpression('total + tax - discount')).toEqual({ "-": [{ "+": [{ var: "total" }, { var: "tax" }] }, { var: "discount" }] });
    });

    it('parses unary operators', () => {
        expect(parseExpression('-10')).toEqual({ "-": [0, 10] }); // Standard JSONLogic negation 0 - x
        expect(parseExpression('!true')).toEqual({ "!": true });
    });

    it('parses function calls', () => {
        expect(parseExpression('max(1, 2)')).toEqual({ "max": [1, 2] });
        // one arg
        expect(parseExpression('abs(-5)')).toEqual({ "abs": [{ "-": [0, 5] }] });
    });

    it('parses "in" operator with array literal', () => {
        expect(parseExpression('code in ["A", "B"]')).toEqual({ "in": [{ var: "code" }, ["A", "B"]] });
    });

    it('parses "between" syntax', () => {
        expect(parseExpression('age between 18 and 65')).toEqual({ "between": [{ var: "age" }, 18, 65] });
    });

    it('parses pipeline references ($)', () => {
        expect(parseExpression('$.subtotal > 0')).toEqual({ ">": [{ var: "$.subtotal" }, 0] });
    });

    it('handles empty input', () => {
        expect(parseExpression('')).toBe(true);
        expect(parseExpression('   ')).toBe(true);
    });
});
