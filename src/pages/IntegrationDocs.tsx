import React from 'react';
import '../styles/docs.css';

const Code: React.FC<{ label?: string; children: string }> = ({ label, children }) => (
  <div className="docs-code">
    {label && <span className="code-label">{label}</span>}
    <pre>{children}</pre>
  </div>
);

export const IntegrationDocs: React.FC = () => {
  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1>Integration Guide</h1>
        <p className="subtitle">How to integrate the JSONLogic Rules Engine into your applications</p>
      </div>

      <div className="docs-toc">
        <h3>Contents</h3>
        <ul>
          <li><a href="#quickstart">Quick Start</a></li>
          <li><a href="#architecture">Architecture Overview</a></li>
          <li><a href="#sdk-patterns">SDK Patterns</a></li>
          <li><a href="#environments">Environments &amp; Promotion</a></li>
          <li><a href="#scheduling">Rule Scheduling</a></li>
          <li><a href="#testing-integration">Testing Strategy</a></li>
          <li><a href="#docker">Docker Deployment</a></li>
          <li><a href="#best-practices">Best Practices</a></li>
        </ul>
      </div>

      {/* Quick Start */}
      <div className="docs-section" id="quickstart">
        <h2>Quick Start</h2>
        <p>Get rules evaluation working in your application in 3 steps:</p>

        <h3>Step 1: Create a Domain</h3>
        <Code label="cURL">{`curl -X POST http://localhost:3000/domains \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Pricing",
    "description": "Dynamic pricing rules",
    "fields": [
      { "name": "customer.tier", "type": "string" },
      { "name": "order.total", "type": "number" },
      { "name": "order.itemCount", "type": "number" }
    ]
  }'`}</Code>

        <h3>Step 2: Add Rules</h3>
        <Code label="cURL">{`curl -X POST http://localhost:3000/rules \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "VIP Discount",
    "domainId": "YOUR_DOMAIN_ID",
    "jsonLogic": {
      "and": [
        { "==": [{"var": "customer.tier"}, "vip"] },
        { ">=": [{"var": "order.total"}, 100] }
      ]
    },
    "priority": 10,
    "environment": "production"
  }'`}</Code>

        <h3>Step 3: Execute Rules</h3>
        <Code label="cURL">{`curl -X POST http://localhost:3000/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "domainId": "YOUR_DOMAIN_ID",
    "data": {
      "customer": { "tier": "vip" },
      "order": { "total": 250, "itemCount": 3 }
    }
  }'`}</Code>

        <div className="docs-info tip">
          <strong>✅ Result</strong>
          The response includes per-rule pass/fail, execution time, and priority ordering so your app can act on the results.
        </div>
      </div>

      {/* Architecture */}
      <div className="docs-section" id="architecture">
        <h2>Architecture Overview</h2>
        <p>The rules engine follows a 3-tier architecture designed for embedding into any stack:</p>

        <table className="docs-table">
          <thead>
            <tr><th>Layer</th><th>Technology</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Frontend</strong></td><td>React + Vite + Bootstrap</td><td>Rule builder UI, domain management, testing playground</td></tr>
            <tr><td><strong>Backend</strong></td><td>NestJS + TypeScript</td><td>REST API, rule execution, versioning, webhooks, audit</td></tr>
            <tr><td><strong>Database</strong></td><td>PostgreSQL + Prisma ORM</td><td>Persistent storage with 8 relational models</td></tr>
          </tbody>
        </table>

        <h3>Data Flow</h3>
        <Code label="Flow">{`Client App
    ↓ POST /execute { domainId, data }
NestJS Backend
    ↓ Query active rules for domain
PostgreSQL
    ↑ Return matching rules
NestJS Backend
    ↓ Evaluate JSONLogic per rule
    ↓ Fire webhooks (async)
    ↓ Log to audit trail
    ↑ Return results
Client App
    → Act on pass/fail results`}</Code>
      </div>

      {/* SDK Patterns */}
      <div className="docs-section" id="sdk-patterns">
        <h2>SDK Patterns</h2>
        <p>Integrate from any language using standard HTTP. Here are common patterns:</p>

        <h3>Node.js / TypeScript</h3>
        <Code label="TypeScript">{`class RulesClient {
  constructor(
    private baseUrl: string,
    private apiKey?: string
  ) {}

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['X-API-Key'] = this.apiKey;
    return h;
  }

  async execute(domainId: string, data: Record<string, any>) {
    const res = await fetch(\`\${this.baseUrl}/execute\`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ domainId, data }),
    });
    if (!res.ok) throw new Error(\`Rules API: \${res.status}\`);
    return res.json();
  }

  async getRules(domainId: string) {
    const res = await fetch(
      \`\${this.baseUrl}/rules?domainId=\${domainId}\`,
      { headers: this.headers() }
    );
    return res.json();
  }
}

// Usage
const rules = new RulesClient('http://localhost:3000', 'rk_your_key');
const result = await rules.execute('domain-id', { patient: { age: 72 } });
console.log(result.results.filter(r => r.passed));`}</Code>

        <h3>Python</h3>
        <Code label="Python">{`import requests

class RulesClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.session = requests.Session()
        if api_key:
            self.session.headers['X-API-Key'] = api_key

    def execute(self, domain_id, data):
        resp = self.session.post(
            f"{self.base_url}/execute",
            json={"domainId": domain_id, "data": data}
        )
        resp.raise_for_status()
        return resp.json()

# Usage
client = RulesClient("http://localhost:3000", "rk_your_key")
result = client.execute("domain-id", {"patient": {"age": 72}})
passed = [r for r in result["results"] if r["passed"]]`}</Code>

        <h3>C# / .NET</h3>
        <Code label="C#">{`public class RulesClient
{
    private readonly HttpClient _http;

    public RulesClient(string baseUrl, string? apiKey = null)
    {
        _http = new HttpClient { BaseAddress = new Uri(baseUrl) };
        if (apiKey != null)
            _http.DefaultRequestHeaders.Add("X-API-Key", apiKey);
    }

    public async Task<ExecutionResult> ExecuteAsync(
        string domainId, object data)
    {
        var payload = new { domainId, data };
        var response = await _http.PostAsJsonAsync("/execute", payload);
        response.EnsureSuccessStatusCode();
        return await response.Content
            .ReadFromJsonAsync<ExecutionResult>();
    }
}`}</Code>
      </div>

      {/* Environments */}
      <div className="docs-section" id="environments">
        <h2>Environments &amp; Promotion</h2>
        <p>Rules support <code>environment</code> tagging for safe promotion workflows:</p>

        <table className="docs-table">
          <thead>
            <tr><th>Environment</th><th>Usage</th></tr>
          </thead>
          <tbody>
            <tr><td><code>staging</code></td><td>Test new rules without affecting production</td></tr>
            <tr><td><code>production</code></td><td>Live rules evaluated for real workloads</td></tr>
          </tbody>
        </table>

        <h3>Promotion Workflow</h3>
        <Code label="Steps">{`# 1. Create rule in staging
POST /rules  { "environment": "staging", ... }

# 2. Test with test suites
POST /test-suites/:id/run

# 3. Promote to production
PUT /rules/:id  { "environment": "production" }

# 4. Execute only considers rules matching environment
POST /execute  { "domainId": "...", "environment": "production", ... }`}</Code>
      </div>

      {/* Scheduling */}
      <div className="docs-section" id="scheduling">
        <h2>Rule Scheduling</h2>
        <p>Rules can have <code>startDate</code> and <code>endDate</code> for time-limited activation:</p>
        <Code label="Scheduled Rule">{`{
  "name": "Holiday Discount",
  "jsonLogic": { ">=": [{"var": "order.total"}, 50] },
  "startDate": "2026-12-20T00:00:00Z",
  "endDate": "2027-01-05T23:59:59Z",
  "environment": "production"
}`}</Code>
        <p>The execution engine automatically filters rules based on the current date — scheduled rules outside their window are skipped.</p>
      </div>

      {/* Testing */}
      <div className="docs-section" id="testing-integration">
        <h2>Testing Strategy</h2>
        <p>Use automated test suites to validate rules before promotion:</p>

        <Code label="Workflow">{`# 1. Create a test suite for the domain
POST /test-suites { "name": "Pricing Rules QA", "domainId": "..." }

# 2. Add test cases
POST /test-suites/:id/cases {
  "name": "VIP gets discount on large orders",
  "inputData": { "customer": {"tier":"vip"}, "order": {"total":250} },
  "expectedResults": [
    { "ruleName": "VIP Discount", "expected": true }
  ]
}

# 3. Run the suite
POST /test-suites/:id/run
# → Returns per-case pass/fail with actual vs expected

# 4. Integrate into CI/CD
# Fail the pipeline if any test case fails`}</Code>

        <div className="docs-info tip">
          <strong>✅ CI/CD Integration</strong>
          Add <code>POST /test-suites/:id/run</code> to your pipeline. If <code>failed &gt; 0</code>, block the deployment.
        </div>
      </div>

      {/* Docker */}
      <div className="docs-section" id="docker">
        <h2>Docker Deployment</h2>
        <p>The entire stack is containerized and ready for production:</p>
        <Code label="docker-compose.yml">{`services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_strong_password
      POSTGRES_DB: rules_engine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    depends_on:
      db: { condition: service_healthy }
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://postgres:password@db:5432/rules_engine"

  frontend:
    build: .
    ports:
      - "3081:80"
    depends_on:
      - backend`}</Code>

        <h3>Deploy</h3>
        <Code label="Shell">{`# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f backend

# Restart after code changes
docker compose down && docker compose up --build -d`}</Code>
      </div>

      {/* Best Practices */}
      <div className="docs-section" id="best-practices">
        <h2>Best Practices</h2>
        <ul>
          <li><strong>Use domains</strong> to separate concerns — don't put all rules in one domain</li>
          <li><strong>Set priorities</strong> — higher priority rules execute and appear first in results</li>
          <li><strong>Use environments</strong> — test in staging before promoting to production</li>
          <li><strong>Write test suites</strong> — automated validation catches regressions before deployment</li>
          <li><strong>Use webhooks</strong> for cache invalidation — don't poll for changes</li>
          <li><strong>Check the audit log</strong> when debugging — every change is recorded with before/after snapshots</li>
          <li><strong>Use conflict analysis</strong> to catch contradictions between rules</li>
          <li><strong>Version your rules</strong> — rollback instantly if a production rule causes issues</li>
          <li><strong>Schedule rules</strong> with start/end dates for time-limited campaigns or promotions</li>
          <li><strong>Secure with API keys</strong> — generate scoped keys for different consumers</li>
        </ul>
      </div>
    </div>
  );
};
