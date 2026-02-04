import { describe, it, expect } from 'vitest';
import { executePipeline, executeRule, getReferencedSteps, validateStepReferences } from '../pipelineExecutor';
import { validatePipeline, getReferencedVariables } from '../pipelineValidator';
import type { RulePipeline } from '../../types/rulePipeline';

describe('Pipeline Executor', () => {
    describe('executePipeline', () => {
        it('executes a simple pipeline', () => {
            const pipeline: RulePipeline = {
                id: 'simple-pipeline',
                name: 'Simple Pipeline',
                steps: [
                    {
                        key: 'step1',
                        name: 'Double Price',
                        logic: { '*': [{ var: 'price' }, 2] },
                    },
                ],
            };

            const result = executePipeline(pipeline, { price: 50 });

            expect(result.success).toBe(true);
            expect(result.output).toBe(100);
            expect(result.stepOutputs.step1).toBe(100);
        });

        it('executes a multi-step pipeline with references', () => {
            const pipeline: RulePipeline = {
                id: 'discount-pipeline',
                name: 'Discount Calculation',
                steps: [
                    {
                        key: 'subtotal',
                        name: 'Calculate Subtotal',
                        logic: { '*': [{ var: 'price' }, { var: 'quantity' }] },
                    },
                    {
                        key: 'discount',
                        name: 'Apply Discount',
                        logic: {
                            if: [
                                { '>': [{ var: '$.subtotal' }, 100] },
                                0.1,
                                0.05,
                            ],
                        },
                    },
                    {
                        key: 'total',
                        name: 'Calculate Total',
                        logic: {
                            '-': [
                                { var: '$.subtotal' },
                                { '*': [{ var: '$.subtotal' }, { var: '$.discount' }] },
                            ],
                        },
                    },
                ],
            };

            // Order > 100: 10% discount
            const result1 = executePipeline(pipeline, { price: 20, quantity: 10 });
            expect(result1.success).toBe(true);
            expect(result1.stepOutputs.subtotal).toBe(200);
            expect(result1.stepOutputs.discount).toBe(0.1);
            expect(result1.output).toBe(180); // 200 - 20

            // Order <= 100: 5% discount
            const result2 = executePipeline(pipeline, { price: 10, quantity: 5 });
            expect(result2.success).toBe(true);
            expect(result2.stepOutputs.subtotal).toBe(50);
            expect(result2.stepOutputs.discount).toBe(0.05);
            expect(result2.output).toBe(47.5); // 50 - 2.5
        });

        it('skips disabled steps', () => {
            const pipeline: RulePipeline = {
                id: 'skip-pipeline',
                name: 'Skip Pipeline',
                steps: [
                    {
                        key: 'step1',
                        name: 'Step 1',
                        logic: { '+': [{ var: 'x' }, 1] },
                    },
                    {
                        key: 'step2',
                        name: 'Step 2 (Disabled)',
                        logic: { '+': [{ var: '$.step1' }, 1] },
                        enabled: false,
                    },
                    {
                        key: 'step3',
                        name: 'Step 3',
                        logic: { '+': [{ var: '$.step1' }, 10] },
                    },
                ],
            };

            const result = executePipeline(pipeline, { x: 5 });

            expect(result.success).toBe(true);
            expect(result.stepOutputs.step1).toBe(6);
            expect(result.stepOutputs.step2).toBeUndefined();
            expect(result.stepOutputs.step3).toBe(16);
            expect(result.output).toBe(16);
        });

        it('handles unknown operators', () => {
            const pipeline: RulePipeline = {
                id: 'unknown-op-pipeline',
                name: 'Unknown Op Pipeline',
                steps: [
                    {
                        key: 'unknown_step',
                        name: 'Unknown Step',
                        logic: { 'unknown_op': [1, 2] }, // Unknown operator
                    },
                ],
            };

            const result = executePipeline(pipeline, {});

            // json-logic-js throws for unknown operators
            // Our executor should catch this and return failure
            expect(result.success).toBe(false);
            expect(result.failedStep).toBe('unknown_step');
        });

        it('handles empty pipeline', () => {
            const pipeline: RulePipeline = {
                id: 'empty-pipeline',
                name: 'Empty Pipeline',
                steps: [],
            };

            const result = executePipeline(pipeline, { x: 1 });

            expect(result.success).toBe(true);
            expect(result.output).toBe(null);
        });
    });

    describe('executeRule', () => {
        it('executes a single rule', () => {
            const logic = { '>': [{ var: 'age' }, 18] };
            expect(executeRule(logic, { age: 25 })).toBe(true);
            expect(executeRule(logic, { age: 15 })).toBe(false);
        });

        it('executes complex rule', () => {
            const logic = {
                and: [
                    { '>=': [{ var: 'age' }, 18] },
                    { '==': [{ var: 'country' }, 'US'] },
                ],
            };

            expect(executeRule(logic, { age: 25, country: 'US' })).toBe(true);
            expect(executeRule(logic, { age: 15, country: 'US' })).toBe(false);
            expect(executeRule(logic, { age: 25, country: 'CA' })).toBe(false);
        });
    });

    describe('getReferencedSteps', () => {
        it('finds step references in logic', () => {
            const logic = {
                '+': [{ var: '$.step1' }, { var: '$.step2.value' }],
            };

            const refs = getReferencedSteps(logic);

            expect(refs.has('step1')).toBe(true);
            expect(refs.has('step2')).toBe(true);
            expect(refs.size).toBe(2);
        });

        it('returns empty set for no references', () => {
            const logic = { '+': [{ var: 'x' }, 1] };
            expect(getReferencedSteps(logic).size).toBe(0);
        });
    });

    describe('validateStepReferences', () => {
        it('validates existing references', () => {
            const logic = { '+': [{ var: '$.step1' }, 1] };
            const available = new Set(['step1', 'step2']);

            expect(validateStepReferences(logic, available)).toEqual([]);
        });

        it('reports missing references', () => {
            const logic = { '+': [{ var: '$.missing' }, 1] };
            const available = new Set(['step1']);

            const errors = validateStepReferences(logic, available);
            expect(errors).toContain('Reference to unknown step: $.missing');
        });
    });
});

describe('Pipeline Validator', () => {
    describe('validatePipeline', () => {
        it('validates a correct pipeline', () => {
            const pipeline: RulePipeline = {
                id: 'valid-pipeline',
                name: 'Valid Pipeline',
                steps: [
                    { key: 'step1', name: 'Step 1', logic: { '+': [1, 2] } },
                    { key: 'step2', name: 'Step 2', logic: { '*': [{ var: '$.step1' }, 2] } },
                ],
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('detects missing pipeline id', () => {
            const pipeline: RulePipeline = {
                id: '',
                name: 'Test',
                steps: [{ key: 'step1', name: 'Step', logic: true }],
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Pipeline must have an id');
        });

        it('detects duplicate step keys', () => {
            const pipeline: RulePipeline = {
                id: 'test',
                name: 'Test',
                steps: [
                    { key: 'step1', name: 'Step 1', logic: true },
                    { key: 'step1', name: 'Step 2', logic: true },
                ],
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Duplicate step key: "step1"');
        });

        it('detects invalid step key format', () => {
            const pipeline: RulePipeline = {
                id: 'test',
                name: 'Test',
                steps: [{ key: '123invalid', name: 'Step', logic: true }],
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('valid identifier'))).toBe(true);
        });

        it('warns about unused steps', () => {
            const pipeline: RulePipeline = {
                id: 'test',
                name: 'Test',
                steps: [
                    { key: 'unused', name: 'Unused Step', logic: { '+': [1, 2] } },
                    { key: 'final', name: 'Final Step', logic: { '*': [3, 4] } },
                ],
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
            expect(result.warnings.some(w => w.includes('unused'))).toBe(true);
        });

        it('detects forward references', () => {
            const pipeline: RulePipeline = {
                id: 'test',
                name: 'Test',
                steps: [
                    { key: 'step1', name: 'Step 1', logic: { '+': [{ var: '$.step2' }, 1] } }, // step2 not defined yet
                    { key: 'step2', name: 'Step 2', logic: 10 },
                ],
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('unknown step'))).toBe(true);
        });
    });

    describe('getReferencedVariables', () => {
        it('collects all variable references', () => {
            const logic = {
                and: [
                    { '>': [{ var: 'age' }, 18] },
                    { '==': [{ var: 'country' }, 'US'] },
                    { 'in': [{ var: 'tier' }, ['gold', 'silver']] },
                ],
            };

            const vars = getReferencedVariables(logic);

            expect(vars.has('age')).toBe(true);
            expect(vars.has('country')).toBe(true);
            expect(vars.has('tier')).toBe(true);
            expect(vars.size).toBe(3);
        });

        it('includes pipeline references', () => {
            const logic = {
                '+': [{ var: '$.step1' }, { var: 'input' }],
            };

            const vars = getReferencedVariables(logic);

            expect(vars.has('$.step1')).toBe(true);
            expect(vars.has('input')).toBe(true);
        });
    });
});
