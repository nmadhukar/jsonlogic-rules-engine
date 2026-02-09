import React from 'react';
import '../styles/docs.css';

/* ─── Tiny helpers ─── */
const Endpoint: React.FC<{ method: string; path: string; desc: string }> = ({ method, path, desc }) => (
    <div className="endpoint-card">
        <div className="endpoint-header">
            <span className={`method-badge ${method.toLowerCase()}`}>{method}</span>
            <span className="endpoint-path">{path}</span>
        </div>
        <p className="endpoint-desc">{desc}</p>
    </div>
);

const Code: React.FC<{ label?: string; children: string }> = ({ label, children }) => (
    <div className="docs-code">
        {label && <span className="code-label">{label}</span>}
        <pre>{children}</pre>
    </div>
);

/* ─── Page ─── */
export const ApiDocs: React.FC = () => {
    return (
        <div className="docs-page">
            {/* Header */}
            <div className="docs-header">
                <h1>API Reference</h1>
                <p className="subtitle">Complete REST API documentation for the JSONLogic Rules Engine</p>
            </div>

            {/* Table of Contents */}
            <div className="docs-toc">
                <h3>Contents</h3>
                <ul>
                    <li><a href="#base-url">Base URL &amp; Authentication</a></li>
                    <li><a href="#domains">Domains</a></li>
                    <li><a href="#rules">Rules</a></li>
                    <li><a href="#execution">Rule Execution</a></li>
                    <li><a href="#versioning">Versioning &amp; Rollback</a></li>
                    <li><a href="#testing">Test Suites</a></li>
                    <li><a href="#audit">Audit Logs</a></li>
                    <li><a href="#api-keys">API Keys</a></li>
                    <li><a href="#webhooks-api">Webhooks</a></li>
                    <li><a href="#analysis">Conflict Analysis</a></li>
                    <li><a href="#errors">Error Codes</a></li>
                </ul>
            </div>

            {/* ─── Base URL ─── */}
            <div className="docs-section" id="base-url">
                <h2>Base URL &amp; Authentication</h2>
                <p>All API endpoints are served from the backend on port <code>3000</code> by default.</p>
                <Code label="Base URL">{`http://localhost:3000`}</Code>

                <h3>Authentication</h3>
                <p>Protected endpoints require an API key in the <code>X-API-Key</code> header:</p>
                <Code label="cURL">{`curl -H "X-API-Key: rk_your_api_key_here" \\
     http://localhost:3000/rules`}</Code>

                <div className="docs-info note">
                    <strong>💡 Note</strong>
                    API key authentication is optional by default. Enable the <code>@UseGuards(ApiKeyGuard)</code> decorator on controllers you want to protect.
                </div>
            </div>

            {/* ─── Domains ─── */}
            <div className="docs-section" id="domains">
                <h2>Domains</h2>
                <p>Domains are logical containers for related rules (e.g., "Healthcare", "Finance").</p>

                <Endpoint method="GET" path="/domains" desc="List all domains" />
                <Endpoint method="GET" path="/domains/:id" desc="Get a single domain by ID" />
                <Endpoint method="POST" path="/domains" desc="Create a new domain" />
                <Endpoint method="PUT" path="/domains/:id" desc="Update an existing domain" />
                <Endpoint method="DELETE" path="/domains/:id" desc="Delete a domain and all its rules (cascading)" />

                <h3>Create Domain</h3>
                <Code label="Request Body">{`{
  "name": "Healthcare",
  "description": "EMR/Patient logic",
  "fields": [
    { "name": "patient.age", "type": "number", "label": "Patient Age" },
    { "name": "patient.diagnosis", "type": "string", "label": "Diagnosis" }
  ],
  "templates": [],
  "presets": []
}`}</Code>

                <h3>Import / Export</h3>
                <Endpoint method="GET" path="/domains/:id/export" desc="Export domain with all rules as portable JSON" />
                <Endpoint method="POST" path="/domains/import" desc="Import a domain from exported JSON (atomic transaction)" />

                <Code label="Export Response">{`{
  "domain": { "name": "Healthcare", "description": "...", "fields": [...] },
  "rules": [
    { "name": "Age Check", "jsonLogic": {">=": [{"var":"patient.age"}, 18]}, ... }
  ],
  "exportedAt": "2026-02-08T22:00:00Z",
  "version": "1.0"
}`}</Code>
            </div>

            {/* ─── Rules ─── */}
            <div className="docs-section" id="rules">
                <h2>Rules</h2>
                <p>Rules contain JSONLogic expressions that evaluate data against business conditions.</p>

                <Endpoint method="GET" path="/rules?domainId=..." desc="List rules, optionally filtered by domain" />
                <Endpoint method="GET" path="/rules/:id" desc="Get a single rule" />
                <Endpoint method="POST" path="/rules" desc="Create a new rule" />
                <Endpoint method="PUT" path="/rules/:id" desc="Update a rule (auto-creates version if JSONLogic changes)" />
                <Endpoint method="DELETE" path="/rules/:id" desc="Delete a rule and all its versions" />

                <h3>Create Rule</h3>
                <Code label="Request Body">{`{
  "name": "Senior Citizen Check",
  "description": "Patient is 65 or older",
  "domainId": "uuid-here",
  "jsonLogic": { ">=": [{"var": "patient.age"}, 65] },
  "isActive": true,
  "priority": 10,
  "environment": "production",
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z"
}`}</Code>

                <h3>Query Parameters</h3>
                <table className="docs-table">
                    <thead>
                        <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>domainId</code></td><td>UUID</td><td>Filter rules by domain</td></tr>
                        <tr><td><code>isActive</code></td><td>boolean</td><td>Filter by active/inactive status</td></tr>
                        <tr><td><code>environment</code></td><td>string</td><td>Filter by environment (staging, production)</td></tr>
                    </tbody>
                </table>
            </div>

            {/* ─── Execution ─── */}
            <div className="docs-section" id="execution">
                <h2>Rule Execution</h2>
                <p>Execute all active rules in a domain against provided data. Rules are evaluated in priority order.</p>

                <Endpoint method="POST" path="/execute" desc="Execute rules against input data" />

                <Code label="Request">{`{
  "domainId": "uuid-here",
  "data": {
    "patient": {
      "age": 72,
      "diagnosis": "Type 2 Diabetes",
      "medications": ["metformin", "insulin"]
    }
  },
  "environment": "production"
}`}</Code>

                <Code label="Response">{`{
  "domainId": "uuid-here",
  "domainName": "Healthcare",
  "results": [
    {
      "ruleId": "uuid",
      "ruleName": "Senior Citizen Check",
      "result": true,
      "passed": true,
      "priority": 10,
      "executionTimeMs": 1
    },
    {
      "ruleId": "uuid",
      "ruleName": "Minor Check",
      "result": false,
      "passed": false,
      "priority": 5,
      "executionTimeMs": 0
    }
  ],
  "executionTimeMs": 3
}`}</Code>

                <div className="docs-info tip">
                    <strong>✅ Tip</strong>
                    Each rule executes independently. One rule failing does not block others. Results include timing metrics per rule.
                </div>
            </div>

            {/* ─── Versioning ─── */}
            <div className="docs-section" id="versioning">
                <h2>Versioning &amp; Rollback</h2>
                <p>Every time a rule's JSONLogic is modified, a version snapshot is automatically created.</p>

                <Endpoint method="GET" path="/rules/:id/versions" desc="List all versions of a rule" />
                <Endpoint method="POST" path="/rules/:id/rollback/:versionId" desc="Rollback rule to a specific version" />

                <Code label="Version Response">{`[
  {
    "id": "version-uuid",
    "ruleId": "rule-uuid",
    "version": 3,
    "jsonLogic": { ">=": [{"var": "patient.age"}, 65] },
    "createdAt": "2026-02-08T22:00:00Z"
  },
  {
    "id": "version-uuid-2",
    "version": 2,
    "jsonLogic": { ">=": [{"var": "patient.age"}, 60] },
    "createdAt": "2026-02-07T18:00:00Z"
  }
]`}</Code>
            </div>

            {/* ─── Testing ─── */}
            <div className="docs-section" id="testing">
                <h2>Test Suites</h2>
                <p>Create automated test cases to validate your rules against expected outcomes.</p>

                <Endpoint method="GET" path="/test-suites?domainId=..." desc="List test suites for a domain" />
                <Endpoint method="POST" path="/test-suites" desc="Create a test suite" />
                <Endpoint method="DELETE" path="/test-suites/:id" desc="Delete a test suite" />
                <Endpoint method="POST" path="/test-suites/:id/cases" desc="Add a test case" />
                <Endpoint method="DELETE" path="/test-suites/:suiteId/cases/:caseId" desc="Delete a test case" />
                <Endpoint method="POST" path="/test-suites/:id/run" desc="Run all test cases in the suite" />

                <h3>Create Test Case</h3>
                <Code label="Request Body">{`{
  "name": "72-year-old should pass Senior Check",
  "inputData": {
    "patient": { "age": 72, "diagnosis": "Flu" }
  },
  "expectedResults": [
    { "ruleName": "Senior Citizen Check", "expected": true }
  ]
}`}</Code>

                <h3>Run Results</h3>
                <Code label="Response">{`{
  "suiteId": "uuid",
  "suiteName": "Age Rules Validation",
  "totalCases": 3,
  "passed": 2,
  "failed": 1,
  "results": [
    {
      "testCaseId": "uuid",
      "testCaseName": "72yo passes Senior Check",
      "passed": true,
      "ruleResults": [...]
    }
  ]
}`}</Code>
            </div>

            {/* ─── Audit ─── */}
            <div className="docs-section" id="audit">
                <h2>Audit Logs</h2>
                <p>Immutable trail of all mutations. Every create, update, delete, rollback, and import is recorded.</p>

                <Endpoint method="GET" path="/audit" desc="Query audit logs with filters" />

                <h3>Query Parameters</h3>
                <table className="docs-table">
                    <thead>
                        <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>entityType</code></td><td>string</td><td>Filter by entity (rule, domain, test_suite, etc.)</td></tr>
                        <tr><td><code>entityId</code></td><td>UUID</td><td>Filter by specific entity</td></tr>
                        <tr><td><code>action</code></td><td>string</td><td>Filter by action (create, update, delete, rollback)</td></tr>
                        <tr><td><code>limit</code></td><td>number</td><td>Results per page (default: 50)</td></tr>
                        <tr><td><code>offset</code></td><td>number</td><td>Pagination offset</td></tr>
                    </tbody>
                </table>

                <Code label="Response">{`{
  "data": [
    {
      "id": "audit-uuid",
      "entityType": "rule",
      "entityId": "rule-uuid",
      "action": "update",
      "before": { "name": "Old Name", "jsonLogic": {...} },
      "after": { "name": "New Name", "jsonLogic": {...} },
      "createdAt": "2026-02-08T22:30:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}`}</Code>
            </div>

            {/* ─── API Keys ─── */}
            <div className="docs-section" id="api-keys">
                <h2>API Keys</h2>
                <p>Generate and manage API keys for programmatic access. Keys are SHA-256 hashed — the raw key is shown only once.</p>

                <Endpoint method="GET" path="/api-keys" desc="List all API keys (hash hidden)" />
                <Endpoint method="POST" path="/api-keys" desc="Generate a new API key" />
                <Endpoint method="PUT" path="/api-keys/:id/revoke" desc="Revoke (deactivate) an API key" />
                <Endpoint method="DELETE" path="/api-keys/:id" desc="Permanently delete an API key" />

                <h3>Create Key</h3>
                <Code label="Request">{`{
  "name": "CI/CD Pipeline Key",
  "scopes": ["execute", "rules:read"],
  "expiresAt": "2027-01-01T00:00:00Z"
}`}</Code>

                <Code label="Response (one-time key)">{`{
  "id": "key-uuid",
  "name": "CI/CD Pipeline Key",
  "key": "rk_a1b2c3d4e5f6...",
  "prefix": "rk_a1b2c",
  "scopes": ["execute", "rules:read"],
  "expiresAt": "2027-01-01T00:00:00Z",
  "createdAt": "2026-02-08T22:00:00Z"
}`}</Code>

                <div className="docs-info warning">
                    <strong>⚠️ Warning</strong>
                    The raw API key is only returned once at creation time. Store it securely — it cannot be retrieved later.
                </div>
            </div>

            {/* ─── Webhooks API ─── */}
            <div className="docs-section" id="webhooks-api">
                <h2>Webhooks</h2>
                <p>Register HTTP endpoints to receive real-time event notifications.</p>

                <Endpoint method="GET" path="/webhooks" desc="List all webhooks" />
                <Endpoint method="POST" path="/webhooks" desc="Create a new webhook" />
                <Endpoint method="PUT" path="/webhooks/:id" desc="Update a webhook" />
                <Endpoint method="DELETE" path="/webhooks/:id" desc="Delete a webhook" />
                <Endpoint method="POST" path="/webhooks/:id/test" desc="Send a test payload to the webhook URL" />

                <Code label="Create Webhook">{`{
  "url": "https://your-app.com/webhook",
  "events": ["rule.created", "rule.updated", "rule.executed"],
  "secret": "your-hmac-secret",
  "isActive": true
}`}</Code>

                <p>See the <a href="/docs/webhooks" style={{ color: '#646cff' }}>Webhook Integration Guide</a> for payload formats and HMAC verification.</p>
            </div>

            {/* ─── Analysis ─── */}
            <div className="docs-section" id="analysis">
                <h2>Conflict Analysis</h2>
                <p>Detect conflicts, contradictions, and quality issues across rules in a domain.</p>

                <Endpoint method="GET" path="/analysis/:domainId" desc="Analyze all rules in a domain for conflicts" />

                <Code label="Response">{`{
  "domainId": "uuid",
  "domainName": "Healthcare",
  "totalRules": 12,
  "conflicts": [
    {
      "type": "range_contradiction",
      "ruleA": { "id": "uuid", "name": "Senior Check" },
      "ruleB": { "id": "uuid", "name": "Minor Discount" },
      "field": "patient.age",
      "description": "Rule A requires age >= 65 but Rule B requires age < 18"
    }
  ],
  "warnings": [
    {
      "type": "always_true",
      "ruleId": "uuid",
      "ruleName": "Universal Rule",
      "description": "Rule evaluates to a static true value"
    }
  ],
  "analyzedAt": "2026-02-08T22:30:00Z"
}`}</Code>
            </div>

            {/* ─── Error Codes ─── */}
            <div className="docs-section" id="errors">
                <h2>Error Codes</h2>
                <table className="docs-table">
                    <thead>
                        <tr><th>Code</th><th>Meaning</th><th>Common Cause</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>400</code></td><td>Bad Request</td><td>Invalid JSON, missing required fields, failed validation</td></tr>
                        <tr><td><code>401</code></td><td>Unauthorized</td><td>Missing or invalid API key</td></tr>
                        <tr><td><code>404</code></td><td>Not Found</td><td>Domain, rule, or resource does not exist</td></tr>
                        <tr><td><code>409</code></td><td>Conflict</td><td>Duplicate name or constraint violation</td></tr>
                        <tr><td><code>500</code></td><td>Internal Error</td><td>Unexpected server error, check backend logs</td></tr>
                    </tbody>
                </table>

                <Code label="Error Response Shape">{`{
  "statusCode": 404,
  "message": "Domain with id abc-123 not found",
  "error": "Not Found"
}`}</Code>
            </div>
        </div>
    );
};
