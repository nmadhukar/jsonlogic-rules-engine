/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PIPELINE VALIDATOR
 * Validates rule pipelines for correctness and consistency
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { RulePipeline, PipelineStep } from '../types/rulePipeline';
import { getReferencedSteps, validateStepReferences } from './pipelineExecutor';

export interface ValidationResult {
    /** Whether the pipeline is valid */
    valid: boolean;
    /** Array of error messages */
    errors: string[];
    /** Array of warning messages */
    warnings: string[];
}

/**
 * Validate a rule pipeline
 * @param pipeline The pipeline to validate
 * @returns Validation result with errors and warnings
 */
export function validatePipeline(pipeline: RulePipeline): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!pipeline.id) {
        errors.push('Pipeline must have an id');
    }

    if (!pipeline.name) {
        errors.push('Pipeline must have a name');
    }

    if (!pipeline.steps || pipeline.steps.length === 0) {
        errors.push('Pipeline must have at least one step');
        return { valid: false, errors, warnings };
    }

    // Validate individual steps
    const stepKeys = new Set<string>();
    const declaredSteps = new Set<string>();

    for (let i = 0; i < pipeline.steps.length; i++) {
        const step = pipeline.steps[i];
        const stepErrors = validateStep(step, i, declaredSteps);
        errors.push(...stepErrors);

        // Check for duplicate keys
        if (stepKeys.has(step.key)) {
            errors.push(`Duplicate step key: "${step.key}"`);
        }
        stepKeys.add(step.key);
        declaredSteps.add(step.key);
    }

    // Check for circular dependencies
    const circularErrors = checkCircularDependencies(pipeline.steps);
    errors.push(...circularErrors);

    // Check for unused steps (warnings)
    const unusedWarnings = checkUnusedSteps(pipeline.steps);
    warnings.push(...unusedWarnings);

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate a single pipeline step
 */
function validateStep(
    step: PipelineStep,
    index: number,
    previousSteps: Set<string>
): string[] {
    const errors: string[] = [];
    const stepLabel = `Step ${index + 1} ("${step.key || 'unnamed'}")`;

    // Required fields
    if (!step.key) {
        errors.push(`${stepLabel}: Step must have a key`);
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(step.key)) {
        errors.push(`${stepLabel}: Key must be a valid identifier (alphanumeric + underscore, not starting with number)`);
    }

    if (!step.name) {
        errors.push(`${stepLabel}: Step must have a name`);
    }

    if (step.logic === undefined || step.logic === null) {
        errors.push(`${stepLabel}: Step must have logic`);
    }

    // Validate step references
    if (step.logic) {
        const refErrors = validateStepReferences(step.logic, previousSteps);
        for (const refError of refErrors) {
            errors.push(`${stepLabel}: ${refError}`);
        }
    }

    return errors;
}

/**
 * Check for circular dependencies in pipeline steps
 */
function checkCircularDependencies(steps: PipelineStep[]): string[] {
    const errors: string[] = [];

    // Build dependency graph
    const graph = new Map<string, Set<string>>();
    for (const step of steps) {
        const refs = getReferencedSteps(step.logic);
        graph.set(step.key, refs);
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();

    function dfs(key: string, path: string[]): boolean {
        if (inStack.has(key)) {
            const cycleStart = path.indexOf(key);
            const cycle = path.slice(cycleStart).concat(key);
            errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
            return true;
        }

        if (visited.has(key)) {
            return false;
        }

        visited.add(key);
        inStack.add(key);

        const deps = graph.get(key) || new Set();
        for (const dep of deps) {
            if (dfs(dep, [...path, key])) {
                return true;
            }
        }

        inStack.delete(key);
        return false;
    }

    for (const step of steps) {
        if (!visited.has(step.key)) {
            dfs(step.key, []);
        }
    }

    return errors;
}

/**
 * Check for unused steps (steps whose output is never referenced)
 */
function checkUnusedSteps(steps: PipelineStep[]): string[] {
    const warnings: string[] = [];

    // Collect all referenced steps
    const referencedSteps = new Set<string>();
    for (const step of steps) {
        const refs = getReferencedSteps(step.logic);
        refs.forEach(ref => referencedSteps.add(ref));
    }

    // Check each step except the last one
    for (let i = 0; i < steps.length - 1; i++) {
        const step = steps[i];
        if (!referencedSteps.has(step.key)) {
            warnings.push(`Step "${step.key}" output is never used by subsequent steps`);
        }
    }

    return warnings;
}

/**
 * Validate that a JSONLogic expression is well-formed
 */
export function validateJsonLogic(logic: any): string[] {
    const errors: string[] = [];

    if (logic === null || logic === undefined) {
        errors.push('Logic cannot be null or undefined');
        return errors;
    }

    validateLogicNode(logic, errors, '');
    return errors;
}

function validateLogicNode(node: any, errors: string[], path: string): void {
    // Primitives are always valid
    if (node === null || typeof node === 'boolean' || typeof node === 'number' || typeof node === 'string') {
        return;
    }

    // Arrays - validate each element
    if (Array.isArray(node)) {
        node.forEach((item, i) => validateLogicNode(item, errors, `${path}[${i}]`));
        return;
    }

    // Objects - should be JSONLogic operations
    if (typeof node === 'object') {
        const keys = Object.keys(node);

        if (keys.length === 0) {
            errors.push(`${path || 'Root'}: Empty object is not valid JSONLogic`);
            return;
        }

        if (keys.length > 1) {
            // Could be a data object, which is technically valid
            // But in most cases, JSONLogic ops have single key
            // We'll allow it but recursively validate values
            for (const key of keys) {
                validateLogicNode(node[key], errors, `${path}.${key}`);
            }
            return;
        }

        // Single key - likely a JSONLogic operation
        const op = keys[0];
        const args = node[op];

        // Validate known operators have correct argument structure
        validateOperatorArgs(op, args, errors, path);

        // Recursively validate arguments
        validateLogicNode(args, errors, `${path}.${op}`);
    }
}

/**
 * Validate operator arguments for known JSONLogic operators
 */
function validateOperatorArgs(
    op: string,
    args: any,
    errors: string[],
    path: string
): void {
    const location = path ? `${path}.${op}` : op;

    // Operators requiring arrays
    const arrayOps = ['and', 'or', '+', '*', 'cat', 'merge'];
    if (arrayOps.includes(op) && !Array.isArray(args)) {
        // Allow single value for some
        if (op !== 'and' && op !== 'or') return;
        errors.push(`${location}: Expected array argument`);
        return;
    }

    // Binary operators
    const binaryOps = ['==', '!=', '>', '>=', '<', '<=', '-', '/', '%', 'in'];
    if (binaryOps.includes(op)) {
        if (!Array.isArray(args) || args.length !== 2) {
            errors.push(`${location}: Expected exactly 2 arguments`);
        }
        return;
    }

    // Ternary operators
    if (op === 'between') {
        if (!Array.isArray(args) || args.length !== 3) {
            errors.push(`${location}: Expected exactly 3 arguments (value, low, high)`);
        }
        return;
    }

    // if operator: needs at least 2 args (condition, then) or 3 (condition, then, else)
    if (op === 'if') {
        if (!Array.isArray(args) || args.length < 2) {
            errors.push(`${location}: Expected at least 2 arguments (condition, then)`);
        }
        return;
    }

    // var operator: string or array with string first element
    if (op === 'var') {
        if (typeof args !== 'string' && (!Array.isArray(args) || typeof args[0] !== 'string')) {
            errors.push(`${location}: Expected string or array with string path`);
        }
        return;
    }
}

/**
 * Get all variables referenced in a JSONLogic expression
 */
export function getReferencedVariables(logic: any): Set<string> {
    const vars = new Set<string>();
    collectVariables(logic, vars);
    return vars;
}

function collectVariables(logic: any, vars: Set<string>): void {
    if (logic === null || logic === undefined) {
        return;
    }

    if (Array.isArray(logic)) {
        logic.forEach(item => collectVariables(item, vars));
        return;
    }

    if (typeof logic !== 'object') {
        return;
    }

    const keys = Object.keys(logic);
    if (keys.length !== 1) {
        Object.values(logic).forEach(v => collectVariables(v, vars));
        return;
    }

    const op = keys[0];
    const args = logic[op];

    if (op === 'var') {
        const varPath = typeof args === 'string' ? args : args[0];
        if (typeof varPath === 'string') {
            vars.add(varPath);
        }
    }

    collectVariables(args, vars);
}
