/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AiPanelProps {
    /** Current domain fields for context-aware rule generation */
    domainFields: { name: string; type?: string; label?: string }[];
    /** Current domain ID */
    domainId: string;
    /** Current rule (for code generation) */
    currentRule: any;
    /** Current rule name */
    currentRuleName?: string;
    /** Callback when AI generates a rule — inject it into the editor */
    onRuleGenerated: (jsonLogic: any) => void;
}

type AiTab = 'rule' | 'code';
type CodeLang = 'dotnet' | 'nestjs' | 'python';

const LANG_LABELS: Record<CodeLang, string> = {
    dotnet: 'C# / .NET',
    nestjs: 'NestJS / TypeScript',
    python: 'Python',
};

export const AiPanel: React.FC<AiPanelProps> = ({
    domainFields,
    domainId,
    currentRule,
    currentRuleName,
    onRuleGenerated,
}) => {
    // State
    const [tab, setTab] = useState<AiTab>('rule');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
    const [showKey, setShowKey] = useState(false);

    // Rule generation state
    const [prompt, setPrompt] = useState('');
    const [ruleLoading, setRuleLoading] = useState(false);
    const [ruleResult, setRuleResult] = useState<{ jsonLogic: any; explanation: string } | null>(null);
    const [ruleError, setRuleError] = useState('');

    // Code generation state
    const [codeLang, setCodeLang] = useState<CodeLang>('nestjs');
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeResult, setCodeResult] = useState<{ code: string; explanation: string } | null>(null);
    const [codeError, setCodeError] = useState('');

    // Persist API key
    const handleKeyChange = (key: string) => {
        setApiKey(key);
        localStorage.setItem('openai_api_key', key);
    };

    // ─── Generate Rule ───
    const handleGenerateRule = async () => {
        if (!prompt.trim()) return;
        if (!apiKey.trim()) { setRuleError('Please enter your OpenAI API key above.'); return; }

        setRuleLoading(true);
        setRuleError('');
        setRuleResult(null);

        try {
            const res = await fetch(`${API_BASE}/ai/generate-rule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    domainFields: domainFields.map(f => f.name),
                    openaiApiKey: apiKey,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `HTTP ${res.status}`);
            }

            const data = await res.json();
            setRuleResult(data);
        } catch (err: any) {
            setRuleError(err.message || 'Failed to generate rule');
        } finally {
            setRuleLoading(false);
        }
    };

    // ─── Generate Code ───
    const handleGenerateCode = async () => {
        if (!currentRule) { setCodeError('Build or generate a rule first, then generate integration code.'); return; }
        if (!apiKey.trim()) { setCodeError('Please enter your OpenAI API key above.'); return; }

        setCodeLoading(true);
        setCodeError('');
        setCodeResult(null);

        try {
            const res = await fetch(`${API_BASE}/ai/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ruleName: currentRuleName || 'My Rule',
                    jsonLogic: currentRule,
                    domainId,
                    language: codeLang,
                    openaiApiKey: apiKey,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `HTTP ${res.status}`);
            }

            const data = await res.json();
            setCodeResult(data);
        } catch (err: any) {
            setCodeError(err.message || 'Failed to generate code');
        } finally {
            setCodeLoading(false);
        }
    };

    return (
        <div className="card" style={{ borderColor: 'rgba(100, 108, 255, 0.3)' }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, rgba(100,108,255,0.1), rgba(155,89,182,0.1))' }}>
                <strong>🤖 AI Assistant</strong>
                <span className="text-muted ms-2 small">Powered by OpenAI</span>
            </div>

            <div className="card-body">
                {/* API Key Input */}
                <div className="mb-3">
                    <label className="form-label small fw-bold">OpenAI API Key</label>
                    <div className="input-group input-group-sm">
                        <input
                            type={showKey ? 'text' : 'password'}
                            className="form-control"
                            placeholder="sk-..."
                            value={apiKey}
                            onChange={(e) => handleKeyChange(e.target.value)}
                        />
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                        >
                            {showKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <small className="text-muted">Stored locally in your browser. Never sent to our server.</small>
                </div>

                {/* Tabs */}
                <ul className="nav nav-pills nav-fill mb-3">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === 'rule' ? 'active' : ''}`}
                            onClick={() => setTab('rule')}
                            style={tab === 'rule' ? { background: '#646cff' } : {}}
                        >
                            ✨ Generate Rule
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === 'code' ? 'active' : ''}`}
                            onClick={() => setTab('code')}
                            style={tab === 'code' ? { background: '#646cff' } : {}}
                        >
                            💻 Generate Code
                        </button>
                    </li>
                </ul>

                {/* ─── Rule Generation Tab ─── */}
                {tab === 'rule' && (
                    <div>
                        <label className="form-label small fw-bold">Describe your business rule in plain English</label>
                        <textarea
                            className="form-control mb-2"
                            rows={3}
                            placeholder={`e.g. "Patient is 65 or older and has diabetes diagnosis"\nor "Order total exceeds $100 and customer is premium tier"`}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />

                        {domainFields.length > 0 && (
                            <div className="mb-2">
                                <small className="text-muted">
                                    <strong>Available fields:</strong>{' '}
                                    {domainFields.map((f, i) => (
                                        <span key={f.name}>
                                            <code style={{ fontSize: '0.75rem' }}>{f.name}</code>
                                            {i < domainFields.length - 1 ? ', ' : ''}
                                        </span>
                                    ))}
                                </small>
                            </div>
                        )}

                        <button
                            className="btn btn-sm w-100"
                            style={{ background: '#646cff', color: '#fff', border: 'none' }}
                            onClick={handleGenerateRule}
                            disabled={ruleLoading || !prompt.trim()}
                        >
                            {ruleLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Generating...
                                </>
                            ) : (
                                '✨ Generate JSONLogic Rule'
                            )}
                        </button>

                        {ruleError && (
                            <div className="alert alert-danger mt-2 py-1 small">{ruleError}</div>
                        )}

                        {ruleResult && (
                            <div className="mt-3">
                                <div className="alert alert-success py-2 small">
                                    <strong>💡 {ruleResult.explanation}</strong>
                                </div>
                                <pre
                                    className="p-2 rounded small"
                                    style={{ background: '#1a1a2e', color: '#c8d6e5', maxHeight: '200px', overflow: 'auto' }}
                                >
                                    {JSON.stringify(ruleResult.jsonLogic, null, 2)}
                                </pre>
                                <button
                                    className="btn btn-sm btn-success w-100"
                                    onClick={() => {
                                        onRuleGenerated(ruleResult.jsonLogic);
                                        setRuleResult(null);
                                        setPrompt('');
                                    }}
                                >
                                    ✅ Use This Rule in Editor
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Code Generation Tab ─── */}
                {tab === 'code' && (
                    <div>
                        <label className="form-label small fw-bold">Target Language</label>
                        <div className="btn-group w-100 mb-3">
                            {(Object.keys(LANG_LABELS) as CodeLang[]).map(lang => (
                                <button
                                    key={lang}
                                    className={`btn btn-sm ${codeLang === lang ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setCodeLang(lang)}
                                    style={codeLang === lang ? { background: '#646cff', borderColor: '#646cff' } : {}}
                                >
                                    {LANG_LABELS[lang]}
                                </button>
                            ))}
                        </div>

                        {currentRule ? (
                            <div className="mb-2">
                                <small className="text-muted">
                                    <strong>Current rule:</strong>{' '}
                                    <code style={{ fontSize: '0.7rem' }}>
                                        {JSON.stringify(currentRule).substring(0, 80)}
                                        {JSON.stringify(currentRule).length > 80 ? '...' : ''}
                                    </code>
                                </small>
                            </div>
                        ) : (
                            <div className="alert alert-warning py-1 small mb-2">
                                Build or generate a rule first, then come here to generate integration code.
                            </div>
                        )}

                        <button
                            className="btn btn-sm w-100"
                            style={{ background: '#646cff', color: '#fff', border: 'none' }}
                            onClick={handleGenerateCode}
                            disabled={codeLoading || !currentRule}
                        >
                            {codeLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Generating {LANG_LABELS[codeLang]} code...
                                </>
                            ) : (
                                `💻 Generate ${LANG_LABELS[codeLang]} Integration Code`
                            )}
                        </button>

                        {codeError && (
                            <div className="alert alert-danger mt-2 py-1 small">{codeError}</div>
                        )}

                        {codeResult && (
                            <div className="mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small className="text-muted fw-bold">{codeResult.explanation}</small>
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => navigator.clipboard.writeText(codeResult.code)}
                                        title="Copy to clipboard"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <pre
                                    className="p-2 rounded small"
                                    style={{
                                        background: '#1a1a2e',
                                        color: '#c8d6e5',
                                        maxHeight: '400px',
                                        overflow: 'auto',
                                        fontSize: '0.78rem',
                                        lineHeight: '1.5',
                                    }}
                                >
                                    {codeResult.code}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
