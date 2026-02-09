# JSONLogic Rules Engine — Webhook Integration Guide

This guide covers everything you need to integrate your services with the Rules Engine's webhook system. Webhooks allow your applications to react in real-time to rule changes, executions, and administrative events.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Creating a Webhook](#creating-a-webhook)
- [Events Reference](#events-reference)
- [Payload Format](#payload-format)
- [Payload Examples](#payload-examples)
- [HMAC Signature Verification](#hmac-signature-verification)
- [Wildcard Subscriptions](#wildcard-subscriptions)
- [Managing Webhooks](#managing-webhooks)
- [Retry & Delivery Behavior](#retry--delivery-behavior)
- [Common Integration Patterns](#common-integration-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

The webhook system implements a fire-and-forget push notification model. When an event occurs (e.g., a rule is created, updated, or executed), the engine sends an HTTP POST request to every registered webhook URL that subscribes to that event.

**Key Properties:**
- Events are delivered via HTTP POST with a JSON body
- Delivery is asynchronous — it doesn't block the originating API call
- Each webhook request has a **10-second timeout**
- If a `secret` is configured, payloads are signed with **HMAC-SHA256**
- Delivery failures are logged but not retried (fire-and-forget)

---

## Quick Start

### 1. Create an endpoint on your server

```javascript
// Express.js example
app.post('/rules-webhook', (req, res) => {
  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`Received event: ${event}`, payload);

  // Handle the event
  switch (event) {
    case 'rule.created':
      notifyTeam(`New rule created: ${payload.ruleName}`);
      break;
    case 'rule.executed':
      updateDashboard(payload);
      break;
  }

  res.status(200).send('OK');
});
```

### 2. Register the webhook

```bash
curl -X POST http://localhost:3001/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Notifications",
    "url": "https://your-server.com/rules-webhook",
    "events": ["rule.created", "rule.updated", "rule.deleted"],
    "secret": "whsec_my_secret_key_12345"
  }'
```

### 3. Test it

```bash
# Send a test event
curl -X POST http://localhost:3001/webhooks/test/<webhook-id>
```

---

## Creating a Webhook

### API Endpoint

```
POST /webhooks
```

### Request Body

```json
{
  "name": "Slack Rule Notifications",
  "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXX",
  "events": ["rule.created", "rule.updated", "rule.deleted"],
  "secret": "whsec_optional_signing_secret"
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Human-readable name for identification |
| `url` | `string` | ✅ | HTTPS endpoint that will receive POST requests |
| `events` | `string[]` | ✅ | Array of event types to subscribe to |
| `secret` | `string` | ❌ | HMAC-SHA256 signing key (recommended for production) |

### Response

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Slack Rule Notifications",
  "url": "https://hooks.slack.com/services/...",
  "events": ["rule.created", "rule.updated", "rule.deleted"],
  "secret": "whsec_optional_signing_secret",
  "isActive": true,
  "createdAt": "2026-02-08T12:00:00.000Z",
  "updatedAt": "2026-02-08T12:00:00.000Z"
}
```

---

## Events Reference

| Event | Trigger | Payload Contains |
|---|---|---|
| `rule.created` | New rule is created | Rule details |
| `rule.updated` | Rule is modified | Updated rule details |
| `rule.deleted` | Rule is deleted | Rule ID |
| `rule.executed` | Rules are executed | Execution results |
| `domain.created` | New domain is created | Domain details |
| `domain.updated` | Domain is modified | Updated domain details |
| `domain.deleted` | Domain is deleted | Domain ID |
| `webhook.test` | Test event is sent | Test message |
| `*` | **Wildcard** — matches all events | Varies |

### Event Naming Convention

Events follow the pattern `entity.action`:
- Entity: `rule`, `domain`, `webhook`
- Action: `created`, `updated`, `deleted`, `executed`

---

## Payload Format

Every webhook delivery uses this envelope structure:

```json
{
  "event": "rule.created",
  "payload": {
    // Event-specific data
  },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

### HTTP Headers

| Header | Value | Present When |
|---|---|---|
| `Content-Type` | `application/json` | Always |
| `X-Webhook-Signature` | `sha256=<hex>` | When `secret` is configured |

---

## Payload Examples

### `rule.created`

```json
{
  "event": "rule.created",
  "payload": {
    "id": "uuid",
    "name": "Medicare Eligibility Check",
    "domainId": "uuid",
    "jsonLogic": { ">=": [{ "var": "patient.age" }, 65] },
    "priority": 10,
    "environment": "production",
    "isActive": true
  },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

### `rule.updated`

```json
{
  "event": "rule.updated",
  "payload": {
    "id": "uuid",
    "name": "Medicare Eligibility Check",
    "domainId": "uuid",
    "changes": {
      "jsonLogic": { ">=": [{ "var": "patient.age" }, 60] },
      "priority": 15
    }
  },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

### `rule.executed`

```json
{
  "event": "rule.executed",
  "payload": {
    "domainId": "uuid",
    "domainName": "Healthcare",
    "environment": "production",
    "totalRules": 5,
    "passed": 3,
    "failed": 2,
    "executionTimeMs": 12
  },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

### `webhook.test`

```json
{
  "event": "webhook.test",
  "payload": {
    "webhookId": "uuid",
    "message": "Test event"
  },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

---

## HMAC Signature Verification

When you configure a `secret` on your webhook, every delivery includes an `X-Webhook-Signature` header containing an HMAC-SHA256 signature of the request body. **Always verify this signature before processing the payload.**

### How It Works

1. The engine computes `HMAC-SHA256(body, secret)` using the raw JSON body
2. The hex-encoded hash is sent as `sha256=<hash>` in the header
3. Your server should compute the same hash and compare

### Node.js Verification

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// Express middleware
app.post('/rules-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.body.toString();

  if (!verifyWebhookSignature(rawBody, signature, 'your-webhook-secret')) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(rawBody);
  // ... process event safely
  res.status(200).send('OK');
});
```

### Python Verification

```python
import hmac
import hashlib

def verify_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

### C# Verification

```csharp
using System.Security.Cryptography;
using System.Text;

public static bool VerifyWebhookSignature(string body, string signature, string secret)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
    var expected = "sha256=" + BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(signature),
        Encoding.UTF8.GetBytes(expected)
    );
}
```

---

## Wildcard Subscriptions

Use `"*"` in the events array to subscribe to **all** events:

```json
{
  "name": "Log Everything",
  "url": "https://your-log-service.com/ingest",
  "events": ["*"]
}
```

You can also mix specific events with wildcards:
```json
{
  "events": ["rule.*"]   // Not currently supported — use exact events or "*"
}
```

> **Note:** Currently only `"*"` is supported as a wildcard. Partial patterns like `"rule.*"` are not yet implemented.

---

## Managing Webhooks

### List All Webhooks

```bash
curl http://localhost:3001/webhooks
```

### Update a Webhook

```bash
curl -X PUT http://localhost:3001/webhooks/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["rule.created", "rule.updated"],
    "isActive": true
  }'
```

### Disable a Webhook

```bash
curl -X PUT http://localhost:3001/webhooks/<id> \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
```

### Delete a Webhook

```bash
curl -X DELETE http://localhost:3001/webhooks/<id>
```

### Send a Test Event

```bash
curl -X POST http://localhost:3001/webhooks/test/<id>
```

---

## Retry & Delivery Behavior

| Behavior | Detail |
|---|---|
| **Delivery model** | Fire-and-forget |
| **Timeout** | 10 seconds per request |
| **Retries** | None (failures are silently caught) |
| **Concurrency** | All matching webhooks are fired in parallel |
| **Inactive webhooks** | Webhooks with `isActive: false` are never fired |
| **Ordering** | No guaranteed delivery order |

> **Production Recommendation**: For critical integrations, consider adding a message queue (e.g., RabbitMQ, Redis Streams) between the rules engine and your receiving service to ensure delivery guarantees.

---

## Common Integration Patterns

### 1. Slack/Teams Notifications

```javascript
// Notify a Slack channel when rules change
app.post('/webhook-handler', (req, res) => {
  const { event, payload } = req.body;
  
  const message = {
    text: `📋 Rules Engine: ${event}`,
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${event}*\n${JSON.stringify(payload, null, 2)}`
      }
    }]
  };

  fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  res.status(200).send('OK');
});
```

### 2. Cache Invalidation

```javascript
// Invalidate rule cache when rules change
app.post('/webhook-handler', (req, res) => {
  const { event, payload } = req.body;

  if (['rule.created', 'rule.updated', 'rule.deleted'].includes(event)) {
    redis.del(`rules:domain:${payload.domainId}`);
    console.log(`Cache invalidated for domain ${payload.domainId}`);
  }

  res.status(200).send('OK');
});
```

### 3. Audit Log Sync

```javascript
// Sync events to an external audit system
app.post('/webhook-handler', async (req, res) => {
  const { event, payload, timestamp } = req.body;

  await externalAuditService.log({
    source: 'rules-engine',
    event,
    data: payload,
    timestamp,
  });

  res.status(200).send('OK');
});
```

### 4. CI/CD Pipeline Trigger

```javascript
// Trigger deployment when rules change in staging → production
app.post('/webhook-handler', async (req, res) => {
  const { event, payload } = req.body;

  if (event === 'rule.updated' && payload.environment === 'production') {
    await fetch('https://api.github.com/repos/owner/repo/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'rules-updated',
        client_payload: payload,
      }),
    });
  }

  res.status(200).send('OK');
});
```

---

## Troubleshooting

### Webhook not firing

1. **Check `isActive`**: Ensure the webhook is active
   ```bash
   curl http://localhost:3001/webhooks/<id>
   ```
2. **Check events match**: The webhook's `events` array must include the event or `"*"`
3. **Check URL is reachable**: The engine must be able to reach the URL from its network
4. **Test with the test endpoint**:
   ```bash
   curl -X POST http://localhost:3001/webhooks/test/<id>
   ```

### Signature verification failing

1. Ensure you're using the **raw request body** (not parsed JSON) for signature computation
2. Verify the `secret` matches exactly what was configured on the webhook
3. Check encoding: the signature is hex-encoded, not base64

### Webhook receiving duplicate events

This shouldn't happen with fire-and-forget, but if it does:
- Implement **idempotency** by tracking processed event timestamps
- Use a unique constraint on `(event, timestamp)` in your handler
