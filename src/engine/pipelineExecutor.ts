/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PIPELINE EXECUTOR
 * Executes a sequence of JSONLogic steps, passing results between them
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Pipeline steps can reference previous step outputs using:
 * - $.stepKey notation in var references
 * - Example: { "var": "$.pricing.discount" } references output from "pricing" step
 */

import jsonLogic from 'json-logic-js';
import type { RulePipeline, PipelineStep } from '../types/rulePipeline';

export interface PipelineExecutionResult {
    /** Whether the pipeline executed successfully */
    success: boolean;
    /** Final output from the last step */
    output: any;
    /** Outputs from each step, keyed by step key */
    stepOutputs: Record<string, any>;
    /** Error message if execution failed */
    error?: string;
    /** Which step failed (if any) */
    failedStep?: string;
}

export interface ExecutionContext {
    /** The original input data */
    input: any;
    /** Accumulated step outputs */
    stepOutputs: Record<string, any>;
}

/**
 * Execute a rule pipeline against input data
 * @param pipeline The pipeline definition
 * @param data The input data object
 * @returns Execution result with all step outputs
 */
export function executePipeline(
    pipeline: RulePipeline,
    data: any
): PipelineExecutionResult {
    const context: ExecutionContext = {
        input: data,
        stepOutputs: {},
    };

    const enabledSteps = pipeline.steps.filter(step => step.enabled !== false);

    for (const step of enabledSteps) {
        try {
            const result = executeStep(step, context);
            context.stepOutputs[step.key] = result;
        } catch (err) {
            return {
                success: false,
                output: null,
                stepOutputs: context.stepOutputs,
                error: err instanceof Error ? err.message : String(err),
                failedStep: step.key,
            };
        }
    }

    // Get output from last step
    const lastStep = enabledSteps[enabledSteps.length - 1];
    const output = lastStep ? context.stepOutputs[lastStep.key] : null;

    return {
        success: true,
        output,
        stepOutputs: context.stepOutputs,
    };
}

/**
 * Execute a single pipeline step
 */
function executeStep(step: PipelineStep, context: ExecutionContext): any {
    // Build the data context for this step
    // Includes original input + all previous step outputs as $.<stepKey>
    const stepData = buildStepData(context);

    // Resolve any $.stepKey references in the logic
    const resolvedLogic = resolveStepReferences(step.logic, context.stepOutputs);

    // Execute the JSONLogic
    return jsonLogic.apply(resolvedLogic, stepData);
}

/**
 * Build the data object for a step execution
 * Merges original input with step outputs under $ prefix
 */
function buildStepData(context: ExecutionContext): any {
    return {
        ...context.input,
        $: context.stepOutputs,
    };
}

/**
 * Recursively resolve $.stepKey.path references in JSONLogic
 * Transforms { "var": "$.pricing.discount" } to access step outputs
 */
function resolveStepReferences(logic: any, stepOutputs: Record<string, any>): any {
    if (logic === null || logic === undefined) {
        return logic;
    }

    if (Array.isArray(logic)) {
        return logic.map(item => resolveStepReferences(item, stepOutputs));
    }

    if (typeof logic !== 'object') {
        return logic;
    }

    const keys = Object.keys(logic);
    if (keys.length !== 1) {
        // Not a JSONLogic operation, recursively process values
        const result: Record<string, any> = {};
        for (const key of keys) {
            result[key] = resolveStepReferences(logic[key], stepOutputs);
        }
        return result;
    }

    const op = keys[0];
    const args = logic[op];

    // Handle var operator with $.stepKey references
    if (op === 'var') {
        const varPath = typeof args === 'string' ? args : args[0];
        if (typeof varPath === 'string' && varPath.startsWith('$.')) {
            // Transform "$.stepKey.field" to "$.stepKey.field" for buildStepData format
            // The $ object contains all step outputs, so this will work as-is
            return { var: varPath };
        }
        return logic;
    }

    // Recursively process other operations
    return { [op]: resolveStepReferences(args, stepOutputs) };
}

/**
 * Validate that all step references in logic point to valid steps
 */
export function validateStepReferences(
    logic: any,
    availableSteps: Set<string>
): string[] {
    const errors: string[] = [];
    findStepReferences(logic, availableSteps, errors);
    return errors;
}

function findStepReferences(
    logic: any,
    availableSteps: Set<string>,
    errors: string[]
): void {
    if (logic === null || logic === undefined) {
        return;
    }

    if (Array.isArray(logic)) {
        logic.forEach(item => findStepReferences(item, availableSteps, errors));
        return;
    }

    if (typeof logic !== 'object') {
        return;
    }

    const keys = Object.keys(logic);
    if (keys.length !== 1) {
        Object.values(logic).forEach(v => findStepReferences(v, availableSteps, errors));
        return;
    }

    const op = keys[0];
    const args = logic[op];

    if (op === 'var') {
        const varPath = typeof args === 'string' ? args : args[0];
        if (typeof varPath === 'string' && varPath.startsWith('$.')) {
            // Extract step key from "$.stepKey" or "$.stepKey.field"
            const match = varPath.match(/^\$\.([^.]+)/);
            if (match) {
                const stepKey = match[1];
                if (!availableSteps.has(stepKey)) {
                    errors.push(`Reference to unknown step: $.${stepKey}`);
                }
            }
        }
    }

    findStepReferences(args, availableSteps, errors);
}

/**
 * Get all step keys referenced in a JSONLogic expression
 */
export function getReferencedSteps(logic: any): Set<string> {
    const refs = new Set<string>();
    collectStepReferences(logic, refs);
    return refs;
}

function collectStepReferences(logic: any, refs: Set<string>): void {
    if (logic === null || logic === undefined) {
        return;
    }

    if (Array.isArray(logic)) {
        logic.forEach(item => collectStepReferences(item, refs));
        return;
    }

    if (typeof logic !== 'object') {
        return;
    }

    const keys = Object.keys(logic);
    if (keys.length !== 1) {
        Object.values(logic).forEach(v => collectStepReferences(v, refs));
        return;
    }

    const op = keys[0];
    const args = logic[op];

    if (op === 'var') {
        const varPath = typeof args === 'string' ? args : args[0];
        if (typeof varPath === 'string' && varPath.startsWith('$.')) {
            const match = varPath.match(/^\$\.([^.]+)/);
            if (match) {
                refs.add(match[1]);
            }
        }
    }

    collectStepReferences(args, refs);
}

/**
 * Execute a single JSONLogic rule (not a pipeline)
 * Convenience function for simple rule evaluation
 */
export function executeRule(logic: any, data: any): any {
    return jsonLogic.apply(logic, data);
}
