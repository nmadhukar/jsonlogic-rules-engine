import { useState } from 'react';
import { RuleBuilder } from './RuleBuilder';
import { ExpressionInput } from './ExpressionInput';
import '../styles/ruleEditor.css';
import type { Field } from 'react-querybuilder';

interface UnifiedRuleEditorProps {
    fields: Field[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialValue?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (value: any) => void;
}

export function UnifiedRuleEditor({ fields, initialValue, onChange }: UnifiedRuleEditorProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [jsonLogic, setJsonLogic] = useState<any>(initialValue || null);
    const [mode, setMode] = useState<'visual' | 'text'>('visual');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdate = (newValue: any) => {
        setJsonLogic(newValue);
        onChange(newValue);
    };

    return (
        <div className="unified-editor">
            <div className="editor-header" style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
                <button
                    onClick={() => setMode('visual')}
                    disabled={mode === 'visual'}
                >
                    Visual Builder
                </button>
                <button
                    onClick={() => setMode('text')}
                    disabled={mode === 'text'}
                >
                    Advanced Text
                </button>
            </div>

            <div className="editor-content">
                {mode === 'visual' ? (
                    <RuleBuilder
                        fields={fields}
                        initialJsonLogic={jsonLogic}
                        onJsonLogicChange={handleUpdate}
                    />
                ) : (
                    <ExpressionInput
                        fields={fields}
                        value={jsonLogic}
                        onChange={handleUpdate}
                    />
                )}
            </div>

            {/* Debug/Preview Area */}
            <div style={{ marginTop: 20, padding: 10, background: '#eee', fontSize: '0.8em' }}>
                <strong>Current Value (JSONLogic):</strong>
                <pre>{JSON.stringify(jsonLogic, null, 2)}</pre>
            </div>
        </div>
    );
}
