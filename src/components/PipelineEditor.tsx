import { useState, useCallback, useMemo } from 'react';
import type { RulePipeline, PipelineStep } from '../types/rulePipeline';
import { validatePipeline } from '../engine/pipelineValidator';
import { ExpressionInput } from './ExpressionInput';
import type { Field } from 'react-querybuilder';

interface PipelineEditorProps {
    /** The pipeline to edit */
    pipeline: RulePipeline;
    /** Callback when pipeline changes */
    onChange: (pipeline: RulePipeline) => void;
    /** Available fields for expression input */
    fields?: Field[];
    /** Read-only mode */
    disabled?: boolean;
}

export function PipelineEditor({
    pipeline,
    onChange,
    fields = [],
    disabled = false,
}: PipelineEditorProps) {
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    // Validate pipeline
    const validation = useMemo(() => validatePipeline(pipeline), [pipeline]);

    // Add a new step
    const addStep = useCallback(() => {
        const stepNum = pipeline.steps.length + 1;
        const newStep: PipelineStep = {
            key: `step${stepNum}`,
            name: `Step ${stepNum}`,
            logic: true,
            enabled: true,
        };
        onChange({ ...pipeline, steps: [...pipeline.steps, newStep] });
        setExpandedStep(newStep.key);
    }, [pipeline, onChange]);

    // Update a step
    const updateStep = useCallback((key: string, updates: Partial<PipelineStep>) => {
        const newSteps = pipeline.steps.map(step =>
            step.key === key ? { ...step, ...updates } : step
        );
        onChange({ ...pipeline, steps: newSteps });
    }, [pipeline, onChange]);

    // Delete a step
    const deleteStep = useCallback((key: string) => {
        const newSteps = pipeline.steps.filter(step => step.key !== key);
        onChange({ ...pipeline, steps: newSteps });
        if (expandedStep === key) {
            setExpandedStep(null);
        }
    }, [pipeline, onChange, expandedStep]);

    // Move step up/down
    const moveStep = useCallback((key: string, direction: 'up' | 'down') => {
        const idx = pipeline.steps.findIndex(s => s.key === key);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === pipeline.steps.length - 1) return;

        const newSteps = [...pipeline.steps];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
        onChange({ ...pipeline, steps: newSteps });
    }, [pipeline, onChange]);

    // Toggle step enabled
    const toggleStep = useCallback((key: string) => {
        const step = pipeline.steps.find(s => s.key === key);
        if (step) {
            updateStep(key, { enabled: !step.enabled });
        }
    }, [pipeline, updateStep]);

    // Get available step references for a given step index
    const getAvailableRefs = useCallback((stepIndex: number): string[] => {
        return pipeline.steps.slice(0, stepIndex).map(s => `$.${s.key}`);
    }, [pipeline.steps]);

    return (
        <div className="pipeline-editor">
            {/* Header */}
            <div style={{ marginBottom: 15, display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                    type="text"
                    value={pipeline.name}
                    onChange={e => onChange({ ...pipeline, name: e.target.value })}
                    disabled={disabled}
                    style={{ fontWeight: 'bold', fontSize: '1.1em', border: 'none', borderBottom: '1px solid #ccc' }}
                />
                <button onClick={addStep} disabled={disabled}>
                    + Add Step
                </button>
            </div>

            {/* Validation warnings */}
            {validation.warnings.length > 0 && (
                <div style={{ marginBottom: 10, padding: 8, background: '#fff3cd', borderRadius: 4, fontSize: '0.85em' }}>
                    {validation.warnings.map((w, i) => (
                        <div key={i}>⚠️ {w}</div>
                    ))}
                </div>
            )}

            {/* Validation errors */}
            {!validation.valid && (
                <div style={{ marginBottom: 10, padding: 8, background: '#f8d7da', borderRadius: 4, fontSize: '0.85em' }}>
                    {validation.errors.map((e, i) => (
                        <div key={i}>❌ {e}</div>
                    ))}
                </div>
            )}

            {/* Steps */}
            <div className="pipeline-steps">
                {pipeline.steps.map((step, idx) => {
                    const isExpanded = expandedStep === step.key;
                    const availableRefs = getAvailableRefs(idx);

                    return (
                        <div
                            key={step.key}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                marginBottom: 10,
                                opacity: step.enabled !== false ? 1 : 0.5,
                            }}
                        >
                            {/* Step header */}
                            <div
                                style={{
                                    padding: '8px 12px',
                                    background: '#f8f9fa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                }}
                                onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                            >
                                <span style={{ fontFamily: 'monospace', color: '#666' }}>
                                    {idx + 1}.
                                </span>
                                <input
                                    type="checkbox"
                                    checked={step.enabled !== false}
                                    onChange={() => toggleStep(step.key)}
                                    onClick={e => e.stopPropagation()}
                                    disabled={disabled}
                                />
                                <strong style={{ flex: 1 }}>{step.name}</strong>
                                <code style={{ color: '#666', fontSize: '0.85em' }}>$.{step.key}</code>
                                <button
                                    onClick={e => { e.stopPropagation(); moveStep(step.key, 'up'); }}
                                    disabled={disabled || idx === 0}
                                    title="Move up"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); moveStep(step.key, 'down'); }}
                                    disabled={disabled || idx === pipeline.steps.length - 1}
                                    title="Move down"
                                >
                                    ↓
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); deleteStep(step.key); }}
                                    disabled={disabled}
                                    style={{ color: 'red' }}
                                    title="Delete step"
                                >
                                    ×
                                </button>
                                <span>{isExpanded ? '▼' : '▶'}</span>
                            </div>

                            {/* Step body (expanded) */}
                            {isExpanded && (
                                <div style={{ padding: 12 }}>
                                    {/* Step key */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ display: 'block', marginBottom: 3, fontSize: '0.85em' }}>
                                            Step Key (for references):
                                        </label>
                                        <input
                                            type="text"
                                            value={step.key}
                                            onChange={e => updateStep(step.key, { key: e.target.value })}
                                            disabled={disabled}
                                            style={{ width: 200, fontFamily: 'monospace' }}
                                            pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                                        />
                                    </div>

                                    {/* Step name */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ display: 'block', marginBottom: 3, fontSize: '0.85em' }}>
                                            Display Name:
                                        </label>
                                        <input
                                            type="text"
                                            value={step.name}
                                            onChange={e => updateStep(step.key, { name: e.target.value })}
                                            disabled={disabled}
                                            style={{ width: 300 }}
                                        />
                                    </div>

                                    {/* Available references */}
                                    {availableRefs.length > 0 && (
                                        <div style={{ marginBottom: 10, fontSize: '0.85em', color: '#666' }}>
                                            <strong>Available references:</strong>{' '}
                                            {availableRefs.map(ref => (
                                                <code key={ref} style={{ marginRight: 8, background: '#e9ecef', padding: '1px 4px' }}>
                                                    {ref}
                                                </code>
                                            ))}
                                        </div>
                                    )}

                                    {/* Step logic */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ display: 'block', marginBottom: 3, fontSize: '0.85em' }}>
                                            Logic Expression:
                                        </label>
                                        <ExpressionInput
                                            value={step.logic}
                                            onChange={logic => updateStep(step.key, { logic })}
                                            fields={fields}
                                            disabled={disabled}
                                        />
                                    </div>

                                    {/* Raw JSONLogic preview */}
                                    <details style={{ fontSize: '0.8em' }}>
                                        <summary style={{ cursor: 'pointer', color: '#666' }}>
                                            View JSONLogic
                                        </summary>
                                        <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 5 }}>
                                            {JSON.stringify(step.logic, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </div>
                    );
                })}

                {pipeline.steps.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                        No steps yet. Click "+ Add Step" to create your first step.
                    </div>
                )}
            </div>

            {/* Pipeline summary */}
            {pipeline.steps.length > 0 && (
                <div style={{ marginTop: 15, padding: 10, background: '#f5f5f5', fontSize: '0.85em' }}>
                    <strong>Pipeline Flow:</strong>
                    <div style={{ marginTop: 5, fontFamily: 'monospace' }}>
                        {pipeline.steps
                            .filter(s => s.enabled !== false)
                            .map(s => s.name)
                            .join(' → ')}
                    </div>
                </div>
            )}
        </div>
    );
}
