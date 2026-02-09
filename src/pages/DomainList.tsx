import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Domain } from '../api';
import { rulesApi } from '../api';

export const DomainList: React.FC = () => {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDomains = async () => {
        try {
            setLoading(true);
            const data = await rulesApi.getDomains();
            setDomains(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load domains');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete "${name}" and all its rules? This cannot be undone.`)) return;
        try {
            await rulesApi.deleteDomain(id);
            await fetchDomains();
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading domains...</p>
            </div>
        );
    }

    if (error) return <div className="alert alert-danger m-4">{error}</div>;

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Business Domains</h2>
                    <p className="text-muted mb-0">Configure rule fields, templates, and test presets for each domain.</p>
                </div>
                <Link to="/domains/new" className="btn btn-primary">
                    <i className="bi bi-plus-lg me-1"></i>Create New Domain
                </Link>
            </div>

            <div className="row">
                {domains.map(domain => (
                    <div key={domain.id} className="col-md-4 mb-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start">
                                    <h5 className="card-title mb-1">{domain.name}</h5>
                                    {domain.isActive ? (
                                        <span className="badge bg-success">Active</span>
                                    ) : (
                                        <span className="badge bg-secondary">Inactive</span>
                                    )}
                                </div>
                                <p className="card-text text-muted small">{domain.description || 'No description'}</p>
                                <div className="d-flex flex-wrap gap-1 mb-3">
                                    <span className="badge bg-light text-dark border">{domain.fields?.length || 0} fields</span>
                                    <span className="badge bg-light text-dark border">{domain.templates?.length || 0} templates</span>
                                    <span className="badge bg-light text-dark border">{domain.presets?.length || 0} presets</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <Link to={`/domains/${domain.id}`} className="btn btn-outline-primary btn-sm">
                                        Edit Config
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(domain.id, domain.name)}
                                        className="btn btn-outline-danger btn-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="card-footer text-muted small">
                                Updated: {new Date(domain.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}

                {domains.length === 0 && (
                    <div className="col-12 text-center text-muted py-5">
                        <p className="h5">No domains configured yet</p>
                        <p>Create your first domain to start building rules.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
