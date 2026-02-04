/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from 'react';
import { UnifiedRuleEditor } from './components/UnifiedRuleEditor';
import { DecisionTableEditor } from './components/DecisionTableEditor';
import { PipelineEditor } from './components/PipelineEditor';
import { SimulatorPanel } from './components/SimulatorPanel';
import { TemplateSelector } from './components/TemplateSelector';
import { SyntaxHelp } from './components/SyntaxHelp';
import { ruleFields } from './config/ruleFields';
import { executePipeline } from './engine/pipelineExecutor';
import type { DecisionTable } from './types/decisionTable';
import type { RulePipeline } from './types/rulePipeline';
import './App.css';

type EditorMode = 'simple' | 'table' | 'pipeline' | 'templates';

// Sample decision table
const sampleTable: DecisionTable = {
  id: 'discount-rules',
  name: 'Customer Discount Rules',
  description: 'Determines discount percentage based on customer tier and order amount',
  hitPolicy: 'first',
  columns: [
    { id: 'tier', type: 'input', field: 'customer.tier', label: 'Customer Tier', dataType: 'string' },
    { id: 'amount', type: 'input', field: 'order.amount', label: 'Order Amount', dataType: 'number' },
    { id: 'discount', type: 'output', field: 'discount', label: 'Discount %', dataType: 'number' },
  ],
  rows: [
    { id: 'r1', cells: { tier: 'gold', amount: '> 100', discount: '0.20' } },
    { id: 'r2', cells: { tier: 'gold', amount: '*', discount: '0.15' } },
    { id: 'r3', cells: { tier: 'silver', amount: '> 50', discount: '0.10' } },
    { id: 'r4', cells: { tier: '*', amount: '*', discount: '0.05' } },
  ],
};

// Sample pipeline
const samplePipeline: RulePipeline = {
  id: 'pricing-pipeline',
  name: 'Pricing Calculation Pipeline',
  description: 'Calculate final price with discounts and tax',
  steps: [
    {
      key: 'subtotal',
      name: 'Calculate Subtotal',
      logic: { '*': [{ var: 'price' }, { var: 'quantity' }] },
      enabled: true,
    },
    {
      key: 'discount',
      name: 'Determine Discount',
      logic: {
        if: [
          { '>': [{ var: '$.subtotal' }, 100] },
          0.1,
          0.05,
        ],
      },
      enabled: true,
    },
    {
      key: 'total',
      name: 'Calculate Final Total',
      logic: {
        '-': [
          { var: '$.subtotal' },
          { '*': [{ var: '$.subtotal' }, { var: '$.discount' }] },
        ],
      },
      enabled: true,
    },
  ],
};

// Sample data presets for simulator
const sampleDataPresets = [
  {
    name: 'Gold Customer',
    data: { customer: { tier: 'gold', age: 45 }, order: { amount: 150 } },
  },
  {
    name: 'Silver Customer',
    data: { customer: { tier: 'silver', age: 30 }, order: { amount: 75 } },
  },
  {
    name: 'New Customer',
    data: { customer: { tier: 'bronze', age: 25 }, order: { amount: 50 } },
  },
  {
    name: 'Senior Patient',
    data: { patient: { age: 70, gender: 'female' }, vitals: { blood_pressure_systolic: 145 } },
  },
];

function App() {
  const [mode, setMode] = useState<EditorMode>('simple');
  const [simpleRule, setSimpleRule] = useState<any>(null);
  const [tableRule, setTableRule] = useState<any>(null);
  const [table, setTable] = useState<DecisionTable>(sampleTable);
  const [pipeline, setPipeline] = useState<RulePipeline>(samplePipeline);
  const [showSimulator, setShowSimulator] = useState(false);

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

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="h3">JSONLogic Rules Engine</h1>
        <p className="text-muted">
          Build business rules for Healthcare/EMR using visual builders, expressions, or decision tables
        </p>
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
                  fields={ruleFields}
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
                  fields={ruleFields}
                />
              </div>
            </div>
          )}

          {/* Template Selector */}
          {mode === 'templates' && (
            <div className="card">
              <div className="card-header">
                <strong>Healthcare Rule Templates</strong>
                <span className="text-muted ms-2">- Pre-built rules for common scenarios</span>
              </div>
              <div className="card-body">
                <TemplateSelector
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
              sampleDataPresets={sampleDataPresets}
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
            Using <code>json-logic-js</code> + <code>react-querybuilder</code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
