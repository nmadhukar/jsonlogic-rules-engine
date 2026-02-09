import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Domain } from '../api';
import { rulesApi } from '../api';

/**
 * Lightweight JSON Editor component using <textarea>.
 * Validates JSON on blur and shows inline errors.
 */
const JsonEditor: React.FC<{
    value: string;
    onChange: (val: string) => void;
    label: string;
    helpText: string;
    rows?: number;
}> = ({ value, onChange, label, helpText, rows = 12 }) => {
    const [error, setError] = useState<string | null>(null);

    const handleBlur = useCallback(() => {
        try {
            JSON.parse(value);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, [value]);

    // Try to pretty-print on focus out if valid
    const handleFormat = useCallback(() => {
        try {
            const parsed = JSON.parse(value);
            onChange(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch {
            // Don't format if invalid — user will see the error from onBlur
        }
    }, [value, onChange]);

    return (
        <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="mb-0">{label}</h5>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleFormat}
                    title="Format JSON"
                >
                    Format
                </button>
            </div>
            <p className="text-muted small mb-2">{helpText}</p>
            <textarea
                className={`form-control font-monospace ${error ? 'is-invalid' : ''}`}
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={handleBlur}
                rows={rows}
                spellCheck={false}
                style={{ fontSize: '0.85rem', tabSize: 2 }}
            />
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
};

export const DomainEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // JSON Editor States
    const [fieldsJson, setFieldsJson] = useState('[]');
    const [templatesJson, setTemplatesJson] = useState('[]');
    const [presetsJson, setPresetsJson] = useState('[]');

    useEffect(() => {
        if (!isNew && id) {
            rulesApi.getDomain(id)
                .then((data: Domain) => {
                    setName(data.name);
                    setDescription(data.description || '');
                    setFieldsJson(JSON.stringify(data.fields, null, 2));
                    setTemplatesJson(JSON.stringify(data.templates, null, 2));
                    setPresetsJson(JSON.stringify(data.presets, null, 2));
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message || 'Domain not found');
                    setLoading(false);
                });
        }
    }, [id, isNew]);

    const handleSave = async () => {
        // Client-side validation
        if (!name.trim()) {
            setError('Domain name is required.');
            return;
        }

        let fields: any[], templates: any[], presets: any[];
        try {
            fields = JSON.parse(fieldsJson);
        } catch {
            setError('Fields JSON is invalid. Please fix syntax errors.');
            return;
        }
        try {
            templates = JSON.parse(templatesJson);
        } catch {
            setError('Templates JSON is invalid. Please fix syntax errors.');
            return;
        }
        try {
            presets = JSON.parse(presetsJson);
        } catch {
            setError('Presets JSON is invalid. Please fix syntax errors.');
            return;
        }

        if (!Array.isArray(fields)) {
            setError('Fields must be a JSON array.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccessMsg(null);

            const payload = {
                name: name.trim(),
                description: description.trim(),
                fields,
                templates,
                presets,
            };

            if (isNew) {
                await rulesApi.createDomain(payload);
            } else if (id) {
                await rulesApi.updateDomain(id, payload);
            }

            navigate('/domains');
        } catch (err: any) {
            setError(err.message || 'Failed to save domain.');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4 mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>{isNew ? 'Create New Domain' : `Edit Domain: ${name}`}</h2>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => navigate('/domains')}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-danger alert-dismissible">
                {error}
                <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            {/* Basic Info */}
            <div className="card mb-4">
                <div className="card-header"><strong>Basic Information</strong></div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Domain Name <span className="text-danger">*</span></label>
                            <input
                                className="form-control"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Healthcare, Finance, HR"
                                disabled={!isNew}
                            />
                            {!isNew && <small className="text-muted">Name cannot be changed after creation.</small>}
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Description</label>
                            <input
                                className="form-control"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief description of this business domain"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* JSON Editors */}
            <div className="card mb-4">
                <div className="card-header"><strong>Rule Fields</strong></div>
                <div className="card-body">
                    <JsonEditor
                        value={fieldsJson}
                        onChange={setFieldsJson}
                        label="Fields Configuration"
                        helpText='Define the fields available in the rule builder. Each field needs: name, label, inputType. Example: [{"name": "patient.age", "label": "Patient Age", "inputType": "number"}]'
                    />
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-header"><strong>Rule Templates</strong></div>
                <div className="card-body">
                    <JsonEditor
                        value={templatesJson}
                        onChange={setTemplatesJson}
                        label="Templates"
                        helpText='Pre-built rule snippets. Each needs: id, name, description, category, jsonLogic. Example: [{"id": "age-check", "name": "Age Check", "description": "Over 65", "category": "Eligibility", "jsonLogic": {">=": [{"var": "patient.age"}, 65]}}]'
                    />
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-header"><strong>Test Presets</strong></div>
                <div className="card-body">
                    <JsonEditor
                        value={presetsJson}
                        onChange={setPresetsJson}
                        label="Simulator Presets"
                        helpText='Sample data for the test simulator. Each needs: name, data. Example: [{"name": "Senior Patient", "data": {"patient": {"age": 70}}}]'
                        rows={8}
                    />
                </div>
            </div>
        </div>
    );
};
