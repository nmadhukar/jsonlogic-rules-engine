import React, { useState } from 'react';
import '../styles/docs.css';

const Code: React.FC<{ label?: string; children: string }> = ({ label, children }) => (
    <div className="docs-code">
        {label && <span className="code-label">{label}</span>}
        <pre>{children}</pre>
    </div>
);

const TabbedCode: React.FC<{ tabs: { label: string; code: string }[] }> = ({ tabs }) => {
    const [active, setActive] = useState(0);
    return (
        <div>
            <div className="docs-tabs">
                {tabs.map((tab, i) => (
                    <button
                        key={i}
                        className={`docs-tab ${i === active ? 'active' : ''}`}
                        onClick={() => setActive(i)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="docs-code docs-tabbed-code">
                <pre>{tabs[active].code}</pre>
            </div>
        </div>
    );
};

export const WebhookDocs: React.FC = () => {
    return (
        <div className="docs-page">
            <div className="docs-header">
                <h1>Webhook Integration Guide</h1>
                <p className="subtitle">Real-time event notifications with HMAC signature verification</p>
            </div>

            <div className="docs-toc">
                <h3>Contents</h3>
                <ul>
                    <li><a href="#overview">Overview</a></li>
                    <li><a href="#events">Event Types</a></li>
                    <li><a href="#payload">Payload Format</a></li>
                    <li><a href="#hmac">HMAC Verification</a></li>
                    <li><a href="#setup">Setup Guide</a></li>
                    <li><a href="#patterns">Integration Patterns</a></li>
                    <li><a href="#troubleshooting">Troubleshooting</a></li>
                </ul>
            </div>

            {/* Overview */}
            <div className="docs-section" id="overview">
                <h2>Overview</h2>
                <p>
                    Webhooks allow your external systems to receive real-time HTTP POST notifications
                    when events occur in the rules engine. When a rule is created, updated, deleted,
                    or executed, all matching webhooks fire concurrently.
                </p>
                <div className="docs-info note">
                    <strong>💡 Fire-and-Forget</strong>
                    Webhook delivery is asynchronous. A 10-second timeout is applied to each request.
                    Delivery failures are silently caught — they do not affect rule operations.
                </div>
            </div>

            {/* Event Types */}
            <div className="docs-section" id="events">
                <h2>Event Types</h2>
                <table className="docs-table">
                    <thead>
                        <tr><th>Event</th><th>Trigger</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>rule.created</code></td><td>A new rule is created</td></tr>
                        <tr><td><code>rule.updated</code></td><td>A rule is modified (including JSONLogic changes)</td></tr>
                        <tr><td><code>rule.deleted</code></td><td>A rule is deleted</td></tr>
                        <tr><td><code>rule.executed</code></td><td>Rules are executed via the /execute endpoint</td></tr>
                        <tr><td><code>domain.created</code></td><td>A new domain is created</td></tr>
                        <tr><td><code>domain.updated</code></td><td>A domain is modified</td></tr>
                        <tr><td><code>domain.deleted</code></td><td>A domain is deleted</td></tr>
                        <tr><td><code>domain.imported</code></td><td>A domain is imported from JSON</td></tr>
                        <tr><td><code>*</code></td><td>Wildcard — matches all events</td></tr>
                    </tbody>
                </table>
            </div>

            {/* Payload Format */}
            <div className="docs-section" id="payload">
                <h2>Payload Format</h2>
                <p>Every webhook delivery includes a JSON payload with these fields:</p>
                <Code label="Payload">{`{
  "event": "rule.updated",
  "timestamp": "2026-02-08T22:30:00Z",
  "data": {
    "id": "rule-uuid",
    "name": "Senior Citizen Check",
    "domainId": "domain-uuid",
    "jsonLogic": { ">=": [{"var": "patient.age"}, 65] },
    "isActive": true,
    "priority": 10,
    "environment": "production"
  }
}`}</Code>

                <h3>Headers</h3>
                <table className="docs-table">
                    <thead>
                        <tr><th>Header</th><th>Value</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>Content-Type</code></td><td><code>application/json</code></td></tr>
                        <tr><td><code>X-Webhook-Signature</code></td><td>HMAC-SHA256 signature (if secret is configured)</td></tr>
                        <tr><td><code>X-Webhook-Event</code></td><td>Event type string (e.g., <code>rule.updated</code>)</td></tr>
                        <tr><td><code>User-Agent</code></td><td><code>RulesEngine-Webhook/1.0</code></td></tr>
                    </tbody>
                </table>
            </div>

            {/* HMAC Verification */}
            <div className="docs-section" id="hmac">
                <h2>HMAC Signature Verification</h2>
                <p>
                    When a webhook is created with a <code>secret</code>, every payload is signed
                    using HMAC-SHA256. You should verify this signature to ensure the payload was
                    sent by the rules engine and has not been tampered with.
                </p>

                <div className="docs-info warning">
                    <strong>⚠️ Security</strong>
                    Always verify signatures in production. Without verification, an attacker could
                    forge webhook payloads to your endpoint.
                </div>

                <h3>Verification Examples</h3>

                <TabbedCode tabs={[
                    {
                        label: 'Node.js',
                        code: `const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`
                    },
                    {
                        label: 'Python',
                        code: `import hmac, hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)`
                    },
                    {
                        label: 'C#',
                        code: `using System.Security.Cryptography;

public static bool VerifyWebhook(string payload, string signature, string secret)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
    var expected = BitConverter.ToString(hash)
        .Replace("-", "").ToLowerInvariant();
    
    return CryptographicOperations
        .FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature),
            Encoding.UTF8.GetBytes(expected));
}`
                    }
                ]} />
            </div>

            {/* Setup Guide */}
            <div className="docs-section" id="setup">
                <h2>Setup Guide</h2>
                <h3>1. Create a Webhook</h3>
                <Code label="cURL">{`curl -X POST http://localhost:3000/webhooks \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhook-receiver",
    "events": ["rule.created", "rule.updated", "rule.executed"],
    "secret": "your-strong-secret-key",
    "isActive": true
  }'`}</Code>

                <h3>2. Test the Webhook</h3>
                <Code label="cURL">{`curl -X POST http://localhost:3000/webhooks/{id}/test`}</Code>
                <p>This sends a test payload to your URL so you can verify connectivity and signature validation.</p>

                <h3>3. Manage Webhooks</h3>
                <p>Use <code>PUT /webhooks/:id</code> to update the URL, events, or deactivate. Use <code>DELETE /webhooks/:id</code> to remove.</p>
            </div>

            {/* Integration Patterns */}
            <div className="docs-section" id="patterns">
                <h2>Common Integration Patterns</h2>

                <h3>🔔 Slack Notifications</h3>
                <p>Forward rule changes to a Slack channel for team visibility:</p>
                <Code label="Node.js Handler">{`app.post('/webhook-receiver', (req, res) => {
  const { event, data } = req.body;
  
  const slackPayload = {
    text: \`📋 Rule Engine: *\${event}*\\nRule: \${data.name}\\nDomain: \${data.domainId}\`
  };
  
  fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify(slackPayload),
    headers: { 'Content-Type': 'application/json' }
  });
  
  res.status(200).send('OK');
});`}</Code>

                <h3>🗑️ Cache Invalidation</h3>
                <p>Invalidate cached rules when changes occur:</p>
                <Code label="Pattern">{`app.post('/webhook-receiver', (req, res) => {
  const { event, data } = req.body;
  
  if (['rule.updated', 'rule.deleted'].includes(event)) {
    cache.del(\`rules:\${data.domainId}\`);
    cache.del(\`rule:\${data.id}\`);
    console.log('Cache invalidated for domain', data.domainId);
  }
  
  res.status(200).send('OK');
});`}</Code>

                <h3>🚀 CI/CD Triggers</h3>
                <p>Trigger deployment pipelines when production rules change:</p>
                <Code label="Pattern">{`app.post('/webhook-receiver', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'rule.updated' && data.environment === 'production') {
    // Trigger deployment pipeline
    triggerGitHubAction('deploy-rules', {
      domain: data.domainId,
      ruleId: data.id
    });
  }
  
  res.status(200).send('OK');
});`}</Code>
            </div>

            {/* Troubleshooting */}
            <div className="docs-section" id="troubleshooting">
                <h2>Troubleshooting</h2>
                <table className="docs-table">
                    <thead>
                        <tr><th>Issue</th><th>Solution</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Webhook not firing</td><td>Check <code>isActive: true</code> and that the event is in the webhook's event list</td></tr>
                        <tr><td>Signature mismatch</td><td>Ensure you're computing HMAC on the raw JSON body, not a parsed/re-stringified version</td></tr>
                        <tr><td>Timeout errors</td><td>Respond within 10 seconds. Process heavy work asynchronously after sending 200</td></tr>
                        <tr><td>Missing events</td><td>Use the wildcard <code>"*"</code> event to capture everything</td></tr>
                        <tr><td>Test payload not arriving</td><td>Verify your URL is publicly accessible (no localhost for external services)</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
