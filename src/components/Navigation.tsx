import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
    const location = useLocation();
    const isDocsActive = location.pathname.startsWith('/docs');

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/">JSONLogic Engine</Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/">Rule Playground</Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link ${location.pathname.startsWith('/domains') ? 'active' : ''}`} to="/domains">Domain Manager</Link>
                        </li>
                        <li className="nav-item dropdown">
                            <a
                                className={`nav-link dropdown-toggle ${isDocsActive ? 'active' : ''}`}
                                href="#"
                                role="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Toggle dropdown manually for cases without Bootstrap JS
                                    const menu = e.currentTarget.nextElementSibling;
                                    if (menu) menu.classList.toggle('show');
                                }}
                            >
                                📖 Docs
                            </a>
                            <ul className="dropdown-menu dropdown-menu-dark">
                                <li>
                                    <Link
                                        className={`dropdown-item ${location.pathname === '/docs/api' ? 'active' : ''}`}
                                        to="/docs/api"
                                    >
                                        API Reference
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className={`dropdown-item ${location.pathname === '/docs/webhooks' ? 'active' : ''}`}
                                        to="/docs/webhooks"
                                    >
                                        Webhook Guide
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className={`dropdown-item ${location.pathname === '/docs/integration' ? 'active' : ''}`}
                                        to="/docs/integration"
                                    >
                                        Integration Guide
                                    </Link>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};
