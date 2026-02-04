
/**
 * Operator Precedence Table (Higher value = Higher precedence)
 */
const PRECEDENCE: Record<string, number> = {
    'var': 100, // Highest precedence (atomic)
    '!': 90, // Unary not
    '*': 4, '/': 4, '%': 4,
    '+': 3, '-': 3,
    '>': 2, '>=': 2, '<': 2, '<=': 2, 'in': 2, 'between': 2,
    '==': 1, '!=': 1,
    'and': 0, 'or': 0,
    '||': 0, '&&': 0, // Aliases for logical ops
};

function isLogic(logic: any): boolean {
    return typeof logic === 'object' && logic !== null && !Array.isArray(logic);
}

function getOp(logic: any): string {
    return Object.keys(logic)[0];
}

function getArgs(logic: any): any[] {
    const op = getOp(logic);
    const val = logic[op];
    return Array.isArray(val) ? val : [val];
}

/**
 * Checks if a JSONLogic structure matches the "between" pattern:
 * { and: [ { >=: [var, low] }, { <=: [var, high] } ] }
 * (or the reverse order of conditions)
 */
function isBetweenPattern(args: any[]): boolean {
    if (args.length !== 2) return false;
    const [left, right] = args;

    // Must be objects
    if (!isLogic(left) || !isLogic(right)) return false;

    const op1 = getOp(left);
    const op2 = getOp(right);

    // Must be >= and <= pair
    if (!(['>=', '<='].includes(op1) && ['>=', '<='].includes(op2))) return false;
    if (op1 === op2) return false; // can't be both >= or both <=

    const args1 = getArgs(left);
    const args2 = getArgs(right);

    // Check if they refer to the same variable
    const var1 = JSON.stringify(args1[0]);
    const var2 = JSON.stringify(args2[0]);

    return var1 === var2;
}

export function decompileExpression(logic: any): string {
    if (logic === true) return ''; // Empty expression (wildcard)
    if (logic === false) return 'false';
    if (logic === null) return 'null';

    if (typeof logic === 'string') return `"${logic}"`; // string literal
    if (typeof logic === 'number') return String(logic);

    if (Array.isArray(logic)) {
        // Array literal for "in" operator: ["US", "CA"]
        return `[${logic.map(decompileExpression).join(', ')}]`;
    }

    const op = getOp(logic);
    const args = getArgs(logic);

    // Variable
    if (op === 'var') {
        return args[0];
    }

    // ⚠️ CRITICAL: Check 'between' pattern BEFORE generic 'and'
    // logic: { and: [...] }
    if ((op === 'and' || op === '&&') && args.length === 2 && isBetweenPattern(args)) {
        // Extract var, low, high
        const c1 = args[0];
        const c2 = args[1];
        const op1 = getOp(c1);
        const args1 = getArgs(c1);
        const args2 = getArgs(c2);

        // Identify variable (args1[0]) and bounds
        const variable = decompileExpression(args1[0]);
        let low, high;

        if (op1 === '>=') {
            low = decompileExpression(args1[1]);
            high = decompileExpression(args2[1]);
        } else {
            // op1 is <=, so c1 is var <= high
            high = decompileExpression(args1[1]);
            low = decompileExpression(args2[1]);
        }

        return `${variable} between ${low} and ${high}`;
    }

    // Native 'between' operator (if used directly)
    if (op === 'between') {
        return `${decompileExpression(args[0])} between ${decompileExpression(args[1])} and ${decompileExpression(args[2])}`;
    }

    // Binary Operators (infix)
    if (['==', '!=', '>', '>=', '<', '<=', '+', '-', '*', '/', '%', 'and', 'or', 'in'].includes(op)) {
        // Flatten multiple args for and/or? json-logic allows {and: [a, b, c]}
        if (args.length > 2) {
            // chained: a and b and c
            return args.map((arg: any) => {
                const str = decompileExpression(arg);
                // Wrap in parens if nested op has lower precedence
                const subOp = isLogic(arg) ? getOp(arg) : '';
                const subPrec = PRECEDENCE[subOp] !== undefined ? PRECEDENCE[subOp] : 99; // Default to high if unknown
                const currentPrec = PRECEDENCE[op];

                if (isLogic(arg) && subPrec < currentPrec) {
                    return `(${str})`;
                }
                return str;
            }).join(` ${op} `);
        }

        const left = args[0];
        const right = args[1];
        let lhs = decompileExpression(left);
        let rhs = decompileExpression(right);

        const leftOp = isLogic(left) ? getOp(left) : '';
        const leftPrec = PRECEDENCE[leftOp] !== undefined ? PRECEDENCE[leftOp] : 99;
        const currentPrec = PRECEDENCE[op];

        if (isLogic(left) && leftPrec < currentPrec) {
            lhs = `(${lhs})`;
        }

        // Right side wrapping
        const rightOp = isLogic(right) ? getOp(right) : '';
        const rightPrec = PRECEDENCE[rightOp] !== undefined ? PRECEDENCE[rightOp] : 99;

        // For left-associative operators, we might need strict < for right side? 
        // e.g. a - (b - c). a - b - c is (a-b)-c. 
        // but usually < is safe.
        if (isLogic(right) && rightPrec < currentPrec) {
            rhs = `(${rhs})`;
        }

        return `${lhs} ${op} ${rhs}`;
    }

    // Unary operators
    if (op === '!' || op === 'not') {
        const val = decompileExpression(args[0]);
        const innerOp = isLogic(args[0]) ? getOp(args[0]) : '';
        const innerPrec = PRECEDENCE[innerOp] !== undefined ? PRECEDENCE[innerOp] : 99;

        // 90 is NOT precedence. If inner is lower (e.g. + at 3, or and at 0), wrap.
        if (isLogic(args[0]) && innerPrec < 90) {
            return `not(${val})`;
        }
        return `not ${val}`;
    }

    if (op === '-') {
        // Unary minus? { "-": [x] } or { "-": [0, x] }
        // json-logic usually uses { "-": [0, x] } for negation
        if (args.length === 2 && args[0] === 0) {
            const val = decompileExpression(args[1]);
            return `-${val}`; // High precedence usually
        }
        // If length 1 standard unary
        if (args.length === 1) {
            return `-${decompileExpression(args[0])}`;
        }
    }

    // Functions: max(a, b)
    return `${op}(${args.map(decompileExpression).join(', ')})`;
}
