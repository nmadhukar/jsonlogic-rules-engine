# JSONLogic Rules Engine — API Reference

> Complete REST API reference for all backend endpoints.
> Base URL: `http://localhost:3001` (development) or your deployed host.

---

## Table of Contents

- [Domains](#domains)
- [Rules](#rules)
- [Rule Execution](#rule-execution)
- [Audit Trail](#audit-trail)
- [Test Suites](#test-suites)
- [API Keys](#api-keys)
- [Webhooks](#webhooks)
- [Conflict Analysis](#conflict-analysis)
- [Error Handling](#error-handling)

---

## Domains

Domains are logical containers for rules (e.g., "Healthcare", "HR", "Finance"). Each domain defines its own fields, templates, and simulator presets.

### `GET /domains`

List all domains.

**Response** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Healthcare",
    "description": "EMR/Patient logic",
    "fields": [...],
    "templates": [...],
    "presets": [...],
    "isActive": true,
    "createdAt": "2026-02-08T12:00:00.000Z",
    "updatedAt": "2026-02-08T12:00:00.000Z"
  }
]
```

### `GET /domains/:id`

Get a single domain by ID.

**Response** `200 OK` — Domain object  
**Response** `404 Not Found` — Domain not found

### `POST /domains`

Create a new domain.

**Request Body**
```json
{
  "name": "Finance",
  "description": "Billing and pricing rules",
  "fields": [
    {
      "name": "invoice.amount",
      "label": "Invoice Amount",
      "inputType": "number"
    }
  ],
  "templates": [],
  "presets": []
}
```

**Response** `201 Created` — Created domain object

### `PUT /domains/:id`

Update an existing domain. Only specified fields are modified.

**Request Body** — Partial domain (any combination of `name`, `description`, `fields`, `templates`, `presets`, `isActive`)

**Response** `200 OK` — Updated domain object  
**Response** `404 Not Found`

### `DELETE /domains/:id`

Delete a domain and all its associated rules, versions, and test suites (cascades).

**Response** `200 OK`
```json
{ "deleted": true, "id": "uuid" }
```
**Response** `404 Not Found`

### `GET /domains/:id/export`

Export a domain with all its rules as a portable JSON package.

**Response** `200 OK`
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-02-08T12:00:00.000Z",
  "domain": { "name": "Healthcare", "fields": [...], ... },
  "rules": [
    { "name": "Age Check", "jsonLogic": {...}, "priority": 10, "environment": "production" }
  ]
}
```
**Response** `404 Not Found`

### `POST /domains/import`

Import a domain from an export package. Creates a new domain and all rules atomically (transactional).

**Request Body** — Export package (same format as export response)

**Response** `201 Created` — Created domain object

---

## Rules

Rules belong to a domain and contain JSONLogic expressions.

### `GET /rules`

List all rules. Optionally filter by domain.

**Query Parameters**
| Parameter | Type | Description |
|---|---|---|
| `domainId` | `string` | Filter by domain ID |

**Response** `200 OK` — Array of rules, sorted by priority (desc) then creation date (desc)

### `GET /rules/:id`

Get a single rule by ID.

**Response** `200 OK`
```json
{
  "id": "uuid",
  "name": "Medicare Eligibility",
  "description": "Checks if patient qualifies for Medicare",
  "domainId": "uuid",
  "jsonLogic": { ">=": [{ "var": "patient.age" }, 65] },
  "priority": 10,
  "isActive": true,
  "environment": "production",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```
**Response** `404 Not Found`

### `POST /rules`

Create a new rule. Automatically creates version 1 and an audit log entry.

**Request Body**
```json
{
  "name": "Medicare Eligibility",
  "description": "Patient age >= 65",
  "domainId": "uuid",
  "jsonLogic": { ">=": [{ "var": "patient.age" }, 65] },
  "isActive": true,
  "priority": 10,
  "environment": "production",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | ✅ | — | Rule display name |
| `domainId` | `string` | ✅ | — | Parent domain ID |
| `jsonLogic` | `object` | ✅ | — | JSONLogic expression |
| `description` | `string` | ❌ | `null` | Human description |
| `isActive` | `boolean` | ❌ | `true` | Whether rule is active |
| `priority` | `integer` | ❌ | `0` | Execution priority (higher = first) |
| `environment` | `string` | ❌ | `"production"` | `"development"`, `"staging"`, or `"production"` |
| `startDate` | `ISO 8601` | ❌ | `null` | Schedule: active from this date |
| `endDate` | `ISO 8601` | ❌ | `null` | Schedule: active until this date |

**Response** `201 Created` — Created rule object

### `PUT /rules/:id`

Update a rule. If `jsonLogic` is changed, a new version is automatically created.

**Request Body** — Partial rule (any combination of fields from create)

**Response** `200 OK` — Updated rule object  
**Response** `404 Not Found`

### `DELETE /rules/:id`

Delete a rule and all its version history.

**Response** `200 OK`
```json
{ "deleted": true, "id": "uuid" }
```
**Response** `404 Not Found`

### `GET /rules/:id/versions`

Get the version history of a rule, ordered newest-first.

**Response** `200 OK`
```json
[
  {
    "id": "uuid",
    "ruleId": "uuid",
    "version": 3,
    "name": "Medicare Eligibility",
    "jsonLogic": { ">=": [{ "var": "patient.age" }, 65] },
    "changeMsg": "Rollback to version 1",
    "changedBy": "system",
    "createdAt": "..."
  }
]
```
**Response** `404 Not Found`

### `POST /rules/:id/rollback/:version`

Rollback a rule to a specific historical version. Creates a new version entry as a record of the rollback.

**URL Parameters**
| Parameter | Description |
|---|---|
| `id` | Rule ID |
| `version` | Version number to rollback to (integer) |

**Response** `200 OK` — Updated rule object  
**Response** `404 Not Found` — Rule or version not found

---

## Rule Execution

### `POST /execute`

Execute all active rules in a domain against provided input data.

**Request Body**
```json
{
  "domainId": "uuid",
  "data": {
    "patient": { "age": 70, "gender": "female" },
    "encounter": { "type": "outpatient" },
    "insurance": { "type": "medicare" }
  },
  "environment": "production",
  "ruleIds": ["uuid-1", "uuid-2"]
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `domainId` | `string` | ✅ | — | Domain to execute against |
| `data` | `object` | ✅ | — | Input data for rule evaluation |
| `environment` | `string` | ❌ | `"production"` | Environment filter |
| `ruleIds` | `string[]` | ❌ | all rules | Subset of rules to execute |

**Execution Behavior:**
- Only **active** rules (`isActive: true`) are executed
- Only rules matching the specified **environment** are included
- **Scheduling** is enforced: rules outside their `startDate`/`endDate` window are skipped
- Rules are executed in **priority order** (highest first)
- Each rule is independently evaluated — one rule failing doesn't affect others

**Response** `200 OK`
```json
{
  "domainId": "uuid",
  "domainName": "Healthcare",
  "environment": "production",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "totalRules": 3,
  "passed": 2,
  "failed": 1,
  "results": [
    {
      "ruleId": "uuid",
      "ruleName": "Medicare Eligibility",
      "result": true,
      "passed": true,
      "priority": 10,
      "executionTimeMs": 1
    }
  ],
  "executionTimeMs": 5
}
```
**Response** `404 Not Found` — Domain not found

---

## Audit Trail

### `GET /audit`

Query the audit log with optional filters and pagination.

**Query Parameters**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `entityType` | `string` | — | Filter: `"Domain"`, `"Rule"`, etc. |
| `entityId` | `string` | — | Filter by specific entity ID |
| `action` | `string` | — | Filter: `"CREATE"`, `"UPDATE"`, `"DELETE"`, `"ROLLBACK"`, `"IMPORT"` |
| `limit` | `integer` | `50` | Page size |
| `offset` | `integer` | `0` | Pagination offset |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "entityType": "Rule",
      "entityId": "uuid",
      "action": "UPDATE",
      "actor": "system",
      "before": { "...previous state..." },
      "after": { "...new state..." },
      "metadata": null,
      "createdAt": "2026-02-08T12:00:00.000Z"
    }
  ],
  "total": 156
}
```

---

## Test Suites

Test suites allow you to define automated test cases that validate your rules against expected outcomes.

### `GET /test-suites`

List all test suites. Optionally filter by domain.

**Query Parameters**
| Parameter | Type | Description |
|---|---|---|
| `domainId` | `string` | Filter by domain ID |

**Response** `200 OK` — Array of suites with their test cases

### `GET /test-suites/:id`

Get a single test suite with all its test cases.

**Response** `200 OK`  
**Response** `404 Not Found`

### `POST /test-suites`

Create a new test suite.

**Request Body**
```json
{
  "name": "Medicare Smoke Tests",
  "domainId": "uuid"
}
```

**Response** `201 Created`

### `DELETE /test-suites/:id`

Delete a test suite and all its test cases.

**Response** `200 OK`
```json
{ "deleted": true, "id": "uuid" }
```

### `POST /test-suites/:id/cases`

Add a test case to a suite.

**Request Body**
```json
{
  "name": "70-year-old qualifies for Medicare",
  "inputData": {
    "patient": { "age": 70, "gender": "female" },
    "insurance": { "type": "medicare" }
  },
  "expectedResult": {
    "Medicare Eligibility": true,
    "High Risk": false
  }
}
```

The `expectedResult` maps rule names or IDs to their expected `passed` boolean.

**Response** `201 Created`

### `DELETE /test-suites/cases/:caseId`

Delete a single test case.

**Response** `200 OK`
```json
{ "deleted": true, "id": "uuid" }
```

### `POST /test-suites/:id/run`

Execute all test cases in a suite against the current rules.

**Response** `200 OK`
```json
{
  "suiteId": "uuid",
  "suiteName": "Medicare Smoke Tests",
  "domainId": "uuid",
  "totalCases": 4,
  "passed": 3,
  "failed": 1,
  "results": [
    {
      "testCaseId": "uuid",
      "testCaseName": "70-year-old qualifies",
      "passed": true,
      "expected": { "Medicare Eligibility": true },
      "actual": [{ "Medicare Eligibility": true }],
      "ruleResults": [...]
    }
  ],
  "executionTimeMs": 12
}
```

---

## API Keys

Manage API keys for programmatic access. Keys are hashed using SHA-256 — raw keys are only shown once at creation time.

### `GET /api-keys`

List all API keys (without the key hash).

**Response** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "CI/CD Pipeline Key",
    "prefix": "rk_abc12345",
    "scopes": ["execute", "read"],
    "isActive": true,
    "lastUsed": "2026-02-08T12:00:00.000Z",
    "expiresAt": null,
    "createdAt": "..."
  }
]
```

### `POST /api-keys`

Generate a new API key.

**Request Body**
```json
{
  "name": "CI/CD Pipeline Key",
  "scopes": ["execute", "read"]
}
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "name": "CI/CD Pipeline Key",
  "prefix": "rk_a1b2c3d4",
  "scopes": ["execute", "read"],
  "rawKey": "rk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6...",
  "warning": "Save this key now. It will not be shown again."
}
```

> ⚠️ **Important**: The `rawKey` is only returned once. Store it securely immediately.

### `POST /api-keys/:id/revoke`

Revoke an API key (soft disable).

**Response** `200 OK`
```json
{ "id": "uuid", "isActive": false }
```

### `DELETE /api-keys/:id`

Permanently delete an API key.

**Response** `200 OK`
```json
{ "deleted": true, "id": "uuid" }
```

### Using API Keys

To authenticate with an API key, include it in the `X-API-Key` header:

```bash
curl -H "X-API-Key: rk_a1b2c3d4..." http://localhost:3001/execute \
  -X POST -H "Content-Type: application/json" \
  -d '{"domainId": "uuid", "data": {...}}'
```

To protect a specific endpoint with API key auth, use the `@UseGuards(ApiKeyGuard)` decorator in the controller.

---

## Webhooks

Webhooks notify external services when events occur in the rules engine (fire-and-forget).

### `GET /webhooks`

List all webhooks.

### `GET /webhooks/:id`

Get a single webhook.

**Response** `404 Not Found` if not exists

### `POST /webhooks`

Create a new webhook.

**Request Body**
```json
{
  "name": "Notify Slack on Rule Change",
  "url": "https://your-service.com/webhook-handler",
  "events": ["rule.created", "rule.updated", "rule.deleted"],
  "secret": "my-signing-secret"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Display name |
| `url` | `string` | ✅ | HTTPS endpoint to receive events |
| `events` | `string[]` | ✅ | Events to subscribe to (or `["*"]` for all) |
| `secret` | `string` | ❌ | HMAC-SHA256 signing secret |

**Available Events:**
- `rule.created` — A new rule was created
- `rule.updated` — A rule was modified
- `rule.deleted` — A rule was deleted
- `rule.executed` — Rules were executed
- `domain.created` / `domain.updated` / `domain.deleted`
- `webhook.test` — Test event
- `*` — Subscribe to all events

**Response** `201 Created`

### `PUT /webhooks/:id`

Update a webhook (`name`, `url`, `events`, `isActive`).

**Response** `200 OK`  
**Response** `404 Not Found`

### `DELETE /webhooks/:id`

Delete a webhook.

**Response** `200 OK`
```json
{ "deleted": true, "id": "uuid" }
```

### `POST /webhooks/test/:id`

Send a test event to a specific webhook.

**Response** `200 OK`
```json
{ "sent": true, "webhookId": "uuid" }
```

### Webhook Payload Format

When an event fires, the webhook endpoint receives:

```json
{
  "event": "rule.created",
  "payload": {
    "ruleId": "uuid",
    "ruleName": "New Rule",
    "domainId": "uuid"
  },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

### HMAC Signature Verification

If a `secret` is configured, the payload is signed with HMAC-SHA256. The signature is sent in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=<hex-encoded-hash>
```

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Conflict Analysis

### `GET /analysis/conflicts/:domainId`

Analyze all active rules in a domain for conflicts and warnings.

**Response** `200 OK`
```json
{
  "domainId": "uuid",
  "domainName": "Healthcare",
  "totalRules": 8,
  "conflicts": [
    {
      "type": "contradiction",
      "severity": "high",
      "ruleA": { "id": "uuid", "name": "Age Check >= 65" },
      "ruleB": { "id": "uuid", "name": "Age Check < 60" },
      "description": "Contradicting conditions on \"patient.age\": >= 65 vs < 60",
      "field": "patient.age"
    },
    {
      "type": "overlap",
      "severity": "high",
      "ruleA": { "id": "uuid", "name": "Rule A" },
      "ruleB": { "id": "uuid", "name": "Rule B" },
      "description": "Rules have identical logic",
      "field": "*"
    }
  ],
  "warnings": [
    {
      "type": "always-true",
      "severity": "medium",
      "rule": { "id": "uuid", "name": "Always True Rule" },
      "description": "Rule will always evaluate to true"
    }
  ],
  "analyzedAt": "2026-02-08T12:00:00.000Z"
}
```

**Conflict Types:**
| Type | Severity | Description |
|---|---|---|
| `contradiction` | `high` | Two rules have impossible-to-satisfy conditions on the same field |
| `overlap` | `high` | Two rules have identical JSONLogic |
| `subsumption` | `medium` | One rule is a subset of another |

**Warning Types:**
| Type | Description |
|---|---|
| `always-true` | Rule logic is a static truthy value (e.g., `true`, non-zero number) |
| `always-false` | Rule logic is a static falsy value (e.g., `false`, `null`, `0`) |
| `unreachable` | Rule can never execute |
| `redundant` | Rule duplicates another rule's effect |

**Response** `404 Not Found` — Domain not found

---

## Error Handling

All error responses use standard HTTP status codes with a JSON body:

```json
{
  "statusCode": 404,
  "message": "Rule with id \"uuid\" not found",
  "error": "Not Found"
}
```

| Status Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (invalid/missing API key) |
| `404` | Not Found |
| `500` | Internal Server Error |
