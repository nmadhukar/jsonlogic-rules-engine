export type TokenType =
    | 'IDENTIFIER'
    | 'NUMBER'
    | 'STRING'
    | 'BOOLEAN'
    | 'OPERATOR' // >, >=, <, <=, ==, !=, +, -, *, /, %, in
    | 'KEYWORD'  // and, or, not
    | 'LPAREN'
    | 'RPAREN'
    | 'COMMA'
    | 'EOF';

export interface Token {
    type: TokenType;
    value: string;
    pos: number;
}

export interface ParseOptions {
    knownFields?: string[];
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LEXER
 * ─────────────────────────────────────────────────────────────────────────────
 */
const KEYWORDS = new Set(['and', 'or', 'not', 'in', 'between']);
const OPERATORS = new Set([
    '==', '!=', '>=', '<=', '>', '<',
    '+', '-', '*', '/', '%',
    '!', '&&', '||' // aliases
]);

function isWhitespace(char: string) {
    return /\s/.test(char);
}

function isAlpha(char: string) {
    return /[a-zA-Z_$]/.test(char);
}

function isDigit(char: string) {
    return /[0-9]/.test(char);
}

function fullTokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let current = 0;

    while (current < input.length) {
        let char = input[current];

        if (isWhitespace(char)) {
            current++;
            continue;
        }

        if (char === '(') { tokens.push({ type: 'LPAREN', value: '(', pos: current++ }); continue; }
        if (char === ')') { tokens.push({ type: 'RPAREN', value: ')', pos: current++ }); continue; }
        // Support Array Literals
        if (char === '[') {
            tokens.push({ type: 'OPERATOR', value: '[', pos: current++ }); continue;
        }
        if (char === ']') { tokens.push({ type: 'OPERATOR', value: ']', pos: current++ }); continue; }

        if (char === ',') { tokens.push({ type: 'COMMA', value: ',', pos: current++ }); continue; }

        // Operators
        const twoChar = input.slice(current, current + 2);
        if (OPERATORS.has(twoChar)) {
            tokens.push({ type: 'OPERATOR', value: twoChar, pos: current });
            current += 2;
            continue;
        }
        if (OPERATORS.has(char)) {
            tokens.push({ type: 'OPERATOR', value: char, pos: current++ });
            continue;
        }

        // Numbers
        if (isDigit(char)) {
            let value = '';
            const start = current;
            while (current < input.length && (isDigit(input[current]) || input[current] === '.')) {
                value += input[current++];
            }
            tokens.push({ type: 'NUMBER', value, pos: start });
            continue;
        }

        // Strings
        if (char === '"' || char === "'") {
            const quote = char;
            let value = '';
            current++;
            const start = current;
            while (current < input.length && input[current] !== quote) {
                value += input[current++];
            }
            current++;
            tokens.push({ type: 'STRING', value, pos: start - 1 });
            continue;
        }

        // Identifiers
        if (isAlpha(char)) {
            let value = '';
            const start = current;
            while (current < input.length && (isAlpha(input[current]) || isDigit(input[current]) || input[current] === '.')) {
                value += input[current++];
            }

            if (value === 'true' || value === 'false') {
                tokens.push({ type: 'BOOLEAN', value, pos: start });
                continue;
            }

            const lower = value.toLowerCase();
            if (KEYWORDS.has(lower)) {
                if (['and', 'or', 'in'].includes(lower)) {
                    tokens.push({ type: 'OPERATOR', value: lower, pos: start });
                } else if (lower === 'not') {
                    tokens.push({ type: 'OPERATOR', value: '!', pos: start });
                } else if (lower === 'between') {
                    // Keep between as OPERATOR for the parseComparison logic
                    tokens.push({ type: 'OPERATOR', value: 'between', pos: start });
                } else {
                    tokens.push({ type: 'KEYWORD', value: lower, pos: start });
                }
                continue;
            }

            tokens.push({ type: 'IDENTIFIER', value, pos: start });
            continue;
        }

        throw new Error(`Unexpected character "${char}" at position ${current}`);
    }

    tokens.push({ type: 'EOF', value: '', pos: current });
    return tokens;
}

export function tokenize(input: string): Token[] {
    return fullTokenize(input);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PARSER (Recursive Descent)
 * ─────────────────────────────────────────────────────────────────────────────
 */
class Parser {
    private tokens: Token[];
    private current = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.tokens[this.current - 1];
    }

    private isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    private match(...types: TokenType[]): boolean {
        if (types.includes(this.peek().type)) {
            this.advance();
            return true;
        }
        return false;
    }

    private consume(type: TokenType, message: string): Token {
        if (this.peek().type === type) return this.advance();
        throw new Error(message + ` found ${this.peek().type} "${this.peek().value}"`);
    }

    public parse(): any {
        return this.parseOr();
    }

    // OR (left associative)
    private parseOr(): any {
        let expr = this.parseAnd();

        while (this.peek().value === 'or' || this.peek().value === '||') {
            this.advance();
            const right = this.parseAnd();
            if (expr && typeof expr === 'object' && Array.isArray(expr.or)) {
                expr.or.push(right);
            } else {
                expr = { or: [expr, right] };
            }
        }

        return expr;
    }

    // AND (left associative)
    private parseAnd(): any {
        let expr = this.parseEquality();

        while (this.peek().value === 'and' || this.peek().value === '&&') {
            this.advance();
            const right = this.parseEquality();
            if (expr && typeof expr === 'object' && Array.isArray(expr.and)) {
                expr.and.push(right);
            } else {
                expr = { and: [expr, right] };
            }
        }

        return expr;
    }

    // ==, !=
    private parseEquality(): any {
        let expr = this.parseComparison();

        while (['==', '!='].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseComparison();
            expr = { [op]: [expr, right] };
        }

        return expr;
    }

    // <, <=, >, >=, in, between
    private parseComparison(): any {
        let expr = this.parseTerm();

        const op = this.peek().value.toLowerCase();

        if (['>', '>=', '<', '<=', 'in'].includes(op)) {
            this.advance();
            const right = this.parseTerm();
            expr = { [op]: [expr, right] };
        }
        else if (op === 'between') {
            this.advance(); // consume 'between'
            const low = this.parseTerm();
            this.consume('OPERATOR', "Expected 'and' after lower bound of between"); // consume 'and'
            const high = this.parseTerm();

            expr = { between: [expr, low, high] };
        }

        return expr;
    }

    // +, -
    private parseTerm(): any {
        let expr = this.parseFactor();

        while (['+', '-'].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseFactor();
            expr = { [op]: [expr, right] };
        }

        return expr;
    }

    // *, /, %
    private parseFactor(): any {
        let expr = this.parseUnary();

        while (['*', '/', '%'].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseUnary();
            expr = { [op]: [expr, right] };
        }

        return expr;
    }

    // !, - (negation)
    private parseUnary(): any {
        if (this.peek().value === '!' || this.peek().value === 'not') {
            this.advance();
            const right = this.parseUnary();
            return { '!': right };
        }
        if (this.peek().value === '-') {
            this.advance();
            const right = this.parseUnary();
            return { '-': [0, right] }; // 0 - x for negation
        }

        return this.parsePrimary();
    }

    private parsePrimary(): any {
        const token = this.peek();

        if (token.type === 'BOOLEAN') {
            this.advance();
            return token.value === 'true';
        }
        if (token.type === 'NUMBER') {
            this.advance();
            return parseFloat(token.value);
        }
        if (token.type === 'STRING') {
            this.advance();
            return token.value;
        }
        if (token.type === 'IDENTIFIER') {
            this.advance();
            if (this.peek().type === 'LPAREN') {
                const fnName = token.value;
                this.advance();
                const args = [];
                if (this.peek().type !== 'RPAREN') {
                    do {
                        args.push(this.parse());
                    } while (this.match('COMMA'));
                }
                this.consume('RPAREN', "Expected ')'");
                // Flatten single args if convention requires, otherwise pass array
                // Standard JSONLogic: method: [arg1, arg2]
                // But some ops like var take 1 arg.
                // We will just return array of args for function calls generally.
                // However, standard json-logic operations expect specific formats.
                // E.g. { "max": [1, 2] }
                return { [fnName]: args };
            }
            return { var: token.value };
        }
        if (token.type === 'LPAREN') {
            this.advance();
            const expr = this.parse();
            this.consume('RPAREN', "Expected ')'");
            return expr;
        }

        // ARRAY LITERAL START
        if (token.value === '[') {
            this.advance(); // eat [
            const elements = [];
            if (this.peek().value !== ']') {
                do {
                    elements.push(this.parsePrimary()); // Allow only primitives in arrays for 'in' check for now
                } while (this.match('COMMA'));
            }
            this.consume('OPERATOR', "Expected ']'"); // The ']' is tokenized as OPERATOR
            return elements;
        }

        if (token.type === 'EOF') throw new Error("Unexpected end");
        throw new Error(`Unexpected token: ${token.value}`);
    }
}

export function parseExpression(input: string, _options?: ParseOptions): any {
    // Options reserved for future use (e.g. knownFields validation)
    const trimmed = input.trim();
    if (!trimmed) return true; // Empty = wildcard

    const tokens = fullTokenize(trimmed);
    const parser = new Parser(tokens);
    return parser.parse();
}
