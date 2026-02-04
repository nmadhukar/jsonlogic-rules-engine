import { useState, useCallback } from 'react';
import jsonLogic from 'json-logic-js';

interface CustomExecutorResult {
    success: boolean;
    output: any;
    stepOutputs?: Record<string, any>;
    error?: string;
}

interface SimulatorPanelProps {
    /** The JSONLogic rule to test */
    rule: any;
    /** Sample data presets (optional) */
    sampleDataPresets?: { name: string; data: any }[];
    /** Title for the panel */
    title?: string;
    /** Custom executor function (for pipelines) */
    customExecutor?: (data: any) => CustomExecutorResult;
}

interface TestResult {
    input: any;
    output: any;
    success: boolean;
    error?: string;
    stepOutputs?: Record<string, any>;
}

export function SimulatorPanel({
    rule,
    sampleDataPresets = [],
    title = 'Rule Simulator',
    customExecutor,
}: SimulatorPanelProps) {
    const [inputJson, setInputJson] = useState('{\n  "patient": {\n    "age": 65,\n    "tier": "gold"\n  }\n}');
    const [result, setResult] = useState<TestResult | null>(null);
    const [history, setHistory] = useState<TestResult[]>([]);

    // Parse and run the rule
    const runTest = useCallback(() => {
        try {
            const data = JSON.parse(inputJson);

            // Use custom executor if provided (for pipelines), otherwise use standard jsonLogic
            if (customExecutor) {
                const execResult = customExecutor(data);
                const testResult: TestResult = {
                    input: data,
                    output: execResult.output,
                    success: execResult.success,
                    error: execResult.error,
                    stepOutputs: execResult.stepOutputs,
                };
                setResult(testResult);
                setHistory(prev => [testResult, ...prev.slice(0, 9)]);
            } else {
                const output = jsonLogic.apply(rule, data);
                const testResult: TestResult = {
                    input: data,
                    output,
                    success: true,
                };
                setResult(testResult);
                setHistory(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10
            }
        } catch (err) {
            const testResult: TestResult = {
                input: inputJson,
                output: null,
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            };
            setResult(testResult);
        }
    }, [inputJson, rule, customExecutor]);

    // Load a preset
    const loadPreset = useCallback((preset: { name: string; data: any }) => {
        setInputJson(JSON.stringify(preset.data, null, 2));
    }, []);

    // Clear history
    const clearHistory = useCallback(() => {
        setHistory([]);
        setResult(null);
    }, []);

    return (
        <div className="simulator-panel" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
            <h5>{title}</h5>

            {/* Presets */}
            {sampleDataPresets.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                    <strong>Quick Presets:</strong>{' '}
                    {sampleDataPresets.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => loadPreset(preset)}
                            style={{ marginLeft: 5, fontSize: '0.85em' }}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Input area */}
            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>
                    <strong>Test Data (JSON):</strong>
                </label>
                <textarea
                    value={inputJson}
                    onChange={e => setInputJson(e.target.value)}
                    rows={8}
                    style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        fontSize: '0.85em',
                        padding: 8,
                        border: '1px solid #ccc',
                        borderRadius: 4,
                    }}
                />
            </div>

            {/* Run button */}
            <div style={{ marginBottom: 15 }}>
                <button
                    onClick={runTest}
                    style={{
                        padding: '8px 20px',
                        background: '#0d6efd',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                    }}
                >
                    Run Test
                </button>
                {history.length > 0 && (
                    <button
                        onClick={clearHistory}
                        style={{ marginLeft: 10, fontSize: '0.85em' }}
                    >
                        Clear History
                    </button>
                )}
            </div>

            {/* Current result */}
            {result && (
                <div
                    style={{
                        padding: 10,
                        background: result.success ? '#d4edda' : '#f8d7da',
                        borderRadius: 4,
                        marginBottom: 15,
                    }}
                >
                    <strong>Result:</strong>
                    {result.success ? (
                        <pre style={{ margin: '5px 0 0 0', fontFamily: 'monospace' }}>
                            {JSON.stringify(result.output, null, 2)}
                        </pre>
                    ) : (
                        <div style={{ color: 'red' }}>{result.error}</div>
                    )}

                    {/* Show step outputs for pipeline execution */}
                    {result.stepOutputs && Object.keys(result.stepOutputs).length > 0 && (
                        <div style={{ marginTop: 10, borderTop: '1px solid #ccc', paddingTop: 10 }}>
                            <strong>Step Outputs:</strong>
                            {Object.entries(result.stepOutputs).map(([key, value]) => (
                                <div key={key} style={{ marginTop: 5, fontSize: '0.9em' }}>
                                    <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: 3 }}>
                                        $.{key}
                                    </code>
                                    <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>
                                        {JSON.stringify(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Current rule preview */}
            <div style={{ marginBottom: 15 }}>
                <details>
                    <summary style={{ cursor: 'pointer', color: '#666' }}>
                        <strong>Current Rule (JSONLogic)</strong>
                    </summary>
                    <pre
                        style={{
                            background: '#f5f5f5',
                            padding: 10,
                            fontSize: '0.8em',
                            maxHeight: 200,
                            overflow: 'auto',
                            marginTop: 5,
                        }}
                    >
                        {JSON.stringify(rule, null, 2)}
                    </pre>
                </details>
            </div>

            {/* History */}
            {history.length > 0 && (
                <div>
                    <details>
                        <summary style={{ cursor: 'pointer', color: '#666' }}>
                            <strong>Test History ({history.length})</strong>
                        </summary>
                        <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 5 }}>
                            {history.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: 8,
                                        marginBottom: 5,
                                        background: item.success ? '#f0fff0' : '#fff0f0',
                                        borderRadius: 4,
                                        fontSize: '0.8em',
                                    }}
                                >
                                    <div>
                                        <strong>#{history.length - idx}</strong>{' '}
                                        {item.success ? (
                                            <span style={{ color: 'green' }}>Pass</span>
                                        ) : (
                                            <span style={{ color: 'red' }}>Fail</span>
                                        )}
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                                        Input: {JSON.stringify(item.input).slice(0, 50)}...
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                                        Output: {JSON.stringify(item.output)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}
