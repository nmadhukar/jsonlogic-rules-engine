/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { UnifiedRuleEditor } from '../components/UnifiedRuleEditor';
import { DecisionTableEditor } from '../components/DecisionTableEditor';
import { PipelineEditor } from '../components/PipelineEditor';
import { SimulatorPanel } from '../components/SimulatorPanel';
import { TemplateSelector } from '../components/TemplateSelector';
import { SyntaxHelp } from '../components/SyntaxHelp';
import { executePipeline } from '../engine/pipelineExecutor';
import type { DecisionTable } from '../types/decisionTable';
import type { RulePipeline } from '../types/rulePipeline';
import { rulesApi } from '../api/rulesApi';
import type { Domain } from '../types/domain';
// Styles imported via App.tsx

type EditorMode = 'simple' | 'table' | 'pipeline' | 'templates';

// Empty fallback for initial load
const EMPTY_DOMAIN: Domain = {
    id: 'loading',
    name: 'Loading...',
    fields: [],
    templates: [],
    presets: [],
    isActive: false,
    createdAt: '',
    updatedAt: ''
};

export const Playground = () => {
    const [mode, setMode] = useState<EditorMode>('simple');
    const [simpleRule, setSimpleRule] = useState<any>(null);
    const [tableRule, setTableRule] = useState<any>(null);
    const [table, setTable] = useState<DecisionTable>({
        id: 'dt-1', name: 'New Table', hitPolicy: 'first', columns: [], rows: []
    });
    const [pipeline, setPipeline] = useState<RulePipeline>({
        id: 'pl-1', name: 'New Pipeline', steps: []
    });
    const [showSimulator, setShowSimulator] = useState(false);

    // Domain State
    const [domains, setDomains] = useState<Domain[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<Domain>(EMPTY_DOMAIN);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch domains on mount
    useEffect(() => {
        rulesApi.getDomains()
            .then(data => {
                setDomains(data);
                if (data.length > 0) {
                    setSelectedDomain(data[0]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load domains:", err);
                setError("Failed to load business domains. Is the backend running?");
                setLoading(false);
            });
    }, []);

    const handleDomainChange = (domainId: string) => {
        const nextDomain = domains.find(d => d.id === domainId);
        if (nextDomain) {
            if (confirm("Switching domains will reset your current rule. Continue?")) {
                setSelectedDomain(nextDomain);
                // Reset editors to clean state
                setSimpleRule(null);
                setTableRule(null);
                setTable({ id: 'dt-1', name: 'New Table', hitPolicy: 'first', columns: [], rows: [] });
                setPipeline({ id: 'pl-1', name: 'New Pipeline', steps: [] });
            }
        }
    };

    // Get current rule based on mode - returns rule and optional custom executor
    const currentRule = useMemo(() => {
        switch (mode) {
            case 'simple':
                return simpleRule;
            case 'table':
                return tableRule;
            case 'pipeline':
                // Return first enabled step's logic as preview, or null
                const firstStep = pipeline.steps.find(s => s.enabled !== false);
                return firstStep?.logic ?? null;
            case 'templates':
                return simpleRule;
            default:
                return null;
        }
    }, [mode, simpleRule, tableRule, pipeline.steps]);

    // Custom executor for pipeline mode
    const pipelineExecutor = useCallback((data: any) => {
        const result = executePipeline(pipeline, data);
        return {
            success: result.success,
            output: result.output,
            stepOutputs: result.stepOutputs,
            error: result.error,
        };
    }, [pipeline]);

    if (loading) return <div className="container py-5 text-center">Loading domains...</div>;
    if (error) return <div className="container py-5 text-center text-danger">Error: {error}</div>;

    return (
        <div className="container py-4">
            {/* Header with Domain Selector */}
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <div>
                    <h1 className="h3 mb-0">JSONLogic Rules Engine</h1>
                    <p className="text-muted mb-0 small">
                        Build business rules for <strong>{selectedDomain.name}</strong>
                    </p>
                </div>
                <div className="d-flex align-items-center">
                    <label className="me-2 fw-bold small">Domain:</label>
                    <select
                        className="form-select form-select-sm"
                        style={{ width: '200px' }}
                        value={selectedDomain.id}
                        onChange={(e) => handleDomainChange(e.target.value)}
                    >
                        {domains.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mode Tabs */}
            <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                    <button
                        className={`nav-link ${mode === 'simple' ? 'active' : ''}`}
                        onClick={() => setMode('simple')}
                    >
                        Simple Rule
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${mode === 'table' ? 'active' : ''}`}
                        onClick={() => setMode('table')}
                    >
                        Decision Table
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${mode === 'pipeline' ? 'active' : ''}`}
                        onClick={() => setMode('pipeline')}
                    >
                        Pipeline
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${mode === 'templates' ? 'active' : ''}`}
                        onClick={() => setMode('templates')}
                    >
                        Templates
                    </button>
                </li>
                <li className="nav-item ms-auto">
                    <button
                        className={`nav-link ${showSimulator ? 'active' : ''}`}
                        onClick={() => setShowSimulator(!showSimulator)}
                    >
                        {showSimulator ? 'Hide' : 'Show'} Simulator
                    </button>
                </li>
            </ul>

            <div className="row">
                {/* Main Editor Panel */}
                <div className={showSimulator ? 'col-md-8' : 'col-12'}>
                    {/* Simple Rule Editor */}
                    {mode === 'simple' && (
                        <div className="card">
                            <div className="card-header">
                                <strong>Rule Builder</strong>
                                <span className="text-muted ms-2">- Visual or Expression mode</span>
                            </div>
                            <div className="card-body">
                                <UnifiedRuleEditor
                                    fields={selectedDomain.fields}
                                    initialValue={simpleRule}
                                    onChange={setSimpleRule}
                                />
                            </div>
                        </div>
                    )}

                    {/* Decision Table Editor */}
                    {mode === 'table' && (
                        <div className="card">
                            <div className="card-header">
                                <strong>Decision Table</strong>
                                <span className="text-muted ms-2">- Spreadsheet-style rules</span>
                            </div>
                            <div className="card-body">
                                <DecisionTableEditor
                                    table={table}
                                    onChange={setTable}
                                    onCompile={setTableRule}
                                />
                            </div>
                        </div>
                    )}

                    {/* Pipeline Editor */}
                    {mode === 'pipeline' && (
                        <div className="card">
                            <div className="card-header">
                                <strong>Rule Pipeline</strong>
                                <span className="text-muted ms-2">- Multi-step calculations</span>
                            </div>
                            <div className="card-body">
                                <PipelineEditor
                                    pipeline={pipeline}
                                    onChange={setPipeline}
                                    fields={selectedDomain.fields}
                                />
                            </div>
                        </div>
                    )}

                    {/* Template Selector */}
                    {mode === 'templates' && (
                        <div className="card">
                            <div className="card-header">
                                <strong>{selectedDomain.name} Rule Templates</strong>
                            </div>
                            <div className="card-body">
                                <TemplateSelector
                                    templates={selectedDomain.templates}
                                    onSelect={(template) => {
                                        setSimpleRule(template.jsonLogic);
                                        setMode('simple');
                                    }}
                                    variant="cards"
                                />
                            </div>
                        </div>
                    )}

                    {/* Syntax Help */}
                    <div className="mt-3">
                        <SyntaxHelp collapsible defaultCollapsed />
                    </div>
                </div>

                {/* Simulator Panel */}
                {showSimulator && (
                    <div className="col-md-4">
                        <SimulatorPanel
                            rule={currentRule}
                            sampleDataPresets={selectedDomain.presets}
                            title={mode === 'pipeline' ? 'Pipeline Executor' : 'Test Your Rule'}
                            customExecutor={mode === 'pipeline' ? pipelineExecutor : undefined}
                        />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-top text-muted" style={{ fontSize: '0.85em' }}>
                <div className="row">
                    <div className="col">
                        <strong>JSONLogic Rules Engine</strong> - Portable rules for JavaScript &amp; .NET
                    </div>
                    <div className="col text-end">
                        Domain: {selectedDomain.name} | Fields: {selectedDomain.fields.length}
                    </div>
                </div>
            </div>
        </div>
    );
};
