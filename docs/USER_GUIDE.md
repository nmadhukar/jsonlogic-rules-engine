# JSONLogic Rules Engine — User Guide

A comprehensive guide for administrators and business users to create, manage, test, and monitor business rules.

---

## Table of Contents

- [What is the Rules Engine?](#what-is-the-rules-engine)
- [Core Concepts](#core-concepts)
- [Getting Started](#getting-started)
- [Managing Domains](#managing-domains)
- [Creating Rules](#creating-rules)
- [JSONLogic Reference](#jsonlogic-reference)
- [Executing Rules](#executing-rules)
- [Rule Versioning & Rollback](#rule-versioning--rollback)
- [Scheduling Rules](#scheduling-rules)
- [Environments & Promotion](#environments--promotion)
- [Test Suites](#test-suites)
- [Conflict Analysis](#conflict-analysis)
- [Import & Export](#import--export)
- [API Key Management](#api-key-management)
- [Webhook Notifications](#webhook-notifications)
- [Audit Log](#audit-log)
- [Recipes & Examples](#recipes--examples)

---

## What is the Rules Engine?

The JSONLogic Rules Engine is a platform for creating, testing, and executing business logic as configurable rules — without writing code. Rules are stored as JSON and can be changed by business users without requiring a software deployment.

**Use Cases:**
- Healthcare: Patient eligibility, care gap alerts, billing logic
- HR: Leave policies, compensation rules, compliance checks
- Finance: Fee schedules, discount calculations, fraud detection
- Insurance: Underwriting rules, claim adjudication

---

## Core Concepts

| Concept | Description |
|---|---|
| **Domain** | A logical group of related rules (e.g., "Healthcare", "Finance") |
| **Rule** | A single business rule with JSONLogic that evaluates to true/false or a value |
| **JSONLogic** | A portable JSON format for expressing logic |
| **Version** | A snapshot of a rule's logic at a point in time |
| **Test Suite** | A collection of test cases that validate rules |
| **Environment** | A deployment stage: `development`, `staging`, `production` |
| **Priority** | Rules with higher priority execute first (0 = default) |
| **Scheduling** | Start/end dates that control when a rule is active |

---

## Getting Started

### Accessing the Application

| Component | URL |
|---|---|
| **Web Interface** | http://localhost:3081 |
| **API** | http://localhost:3001 |

### First-Time Setup

The engine automatically seeds two demo domains on first startup:
1. **Healthcare** — Patient-related rules with medical fields
2. **HR** — Employee policy rules

You can start creating rules immediately in either domain, or create your own.

---

## Managing Domains

### Creating a New Domain

A domain defines the **context** for your rules — what data fields are available, what templates to use, and what test presets to offer.

**Via API:**
```bash
curl -X POST http://localhost:3001/domains \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance",
    "description": "Billing, pricing, and discount rules",
    "fields": [
      {
        "name": "invoice.amount",
        "label": "Invoice Amount",
        "inputType": "number"
      },
      {
        "name": "customer.tier",
        "label": "Customer Tier",
        "inputType": "select",
        "options": ["bronze", "silver", "gold", "platinum"]
      },
      {
        "name": "payment.method",
        "label": "Payment Method",
        "inputType": "text"
      }
    ],
    "templates": [],
    "presets": []
  }'
```

### Domain Fields

Fields define what input data your rules can reference:

| Field Property | Description |
|---|---|
| `name` | Dot-notation path used in rules (e.g., `patient.age`) |
| `label` | Human-readable label for the UI |
| `inputType` | `text`, `number`, `select`, `date`, `boolean` |
| `options` | Array of choices (for `select` type) |

---

## Creating Rules

### Simple Boolean Rule

A rule that evaluates to `true` or `false`:

```json
{
  "name": "Medicare Eligibility",
  "description": "Patient qualifies for Medicare if age >= 65",
  "domainId": "<your-domain-id>",
  "jsonLogic": {
    ">=": [{ "var": "patient.age" }, 65]
  },
  "priority": 10,
  "environment": "production"
}
```

### Compound Rule (AND/OR)

```json
{
  "name": "High Risk Patient",
  "description": "Age >= 65 AND has diabetes AND BMI > 30",
  "domainId": "<your-domain-id>",
  "jsonLogic": {
    "and": [
      { ">=": [{ "var": "patient.age" }, 65] },
      { "==": [{ "var": "diagnosis.code" }, "E11"] },
      { ">": [{ "var": "vitals.bmi" }, 30] }
    ]
  }
}
```

### Conditional Value Rule (if/then/else)

```json
{
  "name": "Discount Calculator",
  "description": "Returns discount percentage based on customer tier",
  "domainId": "<your-domain-id>",
  "jsonLogic": {
    "if": [
      { "==": [{ "var": "customer.tier" }, "platinum"] }, 0.25,
      { "==": [{ "var": "customer.tier" }, "gold"] }, 0.15,
      { "==": [{ "var": "customer.tier" }, "silver"] }, 0.10,
      0.05
    ]
  }
}
```

---

## JSONLogic Reference

JSONLogic is a portable format for expressing logic as JSON. Full specification: [jsonlogic.com](https://jsonlogic.com/)

### Common Operators

| Operator | Description | Example |
|---|---|---|
| `==` | Equal | `{ "==": [{ "var": "status" }, "active"] }` |
| `!=` | Not equal | `{ "!=": [{ "var": "status" }, "deleted"] }` |
| `>`, `>=`, `<`, `<=` | Comparison | `{ ">=": [{ "var": "age" }, 18] }` |
| `and` | All conditions true | `{ "and": [cond1, cond2] }` |
| `or` | Any condition true | `{ "or": [cond1, cond2] }` |
| `!` | Negation | `{ "!": [{ "var": "isBlocked" }] }` |
| `if` | Conditional | `{ "if": [cond, then, else] }` |
| `var` | Access data field | `{ "var": "patient.age" }` |
| `in` | Value in array | `{ "in": ["admin", { "var": "roles" }] }` |
| `+`, `-`, `*`, `/` | Arithmetic | `{ "*": [{ "var": "qty" }, { "var": "price" }] }` |
| `min`, `max` | Min/Max | `{ "max": [{ "var": "a" }, { "var": "b" }] }` |
| `merge` | Combine arrays | `{ "merge": [[1,2], [3,4]] }` |

### Accessing Nested Data

Use dot notation with `var`:
```json
{ "var": "patient.vitals.blood_pressure.systolic" }
```

### Default Values

Provide a default if the field doesn't exist:
```json
{ "var": ["patient.middle_name", "N/A"] }
```

---

## Executing Rules

### Basic Execution

Execute all active rules in a domain against your input data:

```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "domainId": "<domain-id>",
    "data": {
      "patient": { "age": 70, "gender": "female" },
      "diagnosis": { "code": "E11" },
      "vitals": { "bmi": 32 }
    }
  }'
```

### Targeting Specific Rules

Only execute certain rules by providing their IDs:

```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "domainId": "<domain-id>",
    "data": { "patient": { "age": 70 } },
    "ruleIds": ["<rule-id-1>", "<rule-id-2>"]
  }'
```

### Environment-Specific Execution

Execute only rules tagged for a specific environment:

```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "domainId": "<domain-id>",
    "data": { "patient": { "age": 70 } },
    "environment": "staging"
  }'
```

### Understanding Results

The response tells you how each rule evaluated:

```json
{
  "domainId": "uuid",
  "domainName": "Healthcare",
  "environment": "production",
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
    },
    {
      "ruleId": "uuid",
      "ruleName": "Under 18 Check",
      "result": false,
      "passed": false,
      "priority": 5,
      "executionTimeMs": 0
    }
  ],
  "executionTimeMs": 5
}
```

- **`result`**: The raw value returned by JSONLogic (could be `true`, `false`, a number, a string)
- **`passed`**: Whether the result is truthy

---

## Rule Versioning & Rollback

Every time a rule's JSONLogic is modified, the engine automatically creates a new version. You can view the full history and rollback to any previous version.

### View Version History

```bash
curl http://localhost:3001/rules/<rule-id>/versions
```

### Rollback to a Previous Version

```bash
curl -X POST http://localhost:3001/rules/<rule-id>/rollback/2
```

This restores the rule to version 2's JSONLogic and creates a new version entry recording the rollback.

---

## Scheduling Rules

Rules can be scheduled to activate and deactivate automatically:

```json
{
  "name": "Holiday Discount",
  "jsonLogic": { ">=": [{ "var": "order.total" }, 50] },
  "startDate": "2026-12-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z"
}
```

- **Before `startDate`**: Rule is skipped during execution
- **Between `startDate` and `endDate`**: Rule is active
- **After `endDate`**: Rule is skipped
- **No dates**: Rule is always active (default)

---

## Environments & Promotion

Rules support three environments: `development`, `staging`, and `production`.

### Workflow

1. Create a rule with `"environment": "development"`
2. Test it using `"environment": "development"` in execute requests
3. Update to `"environment": "staging"` for QA
4. Promote to `"environment": "production"` for live use

```bash
# Promote a rule to production
curl -X PUT http://localhost:3001/rules/<rule-id> \
  -H "Content-Type: application/json" \
  -d '{ "environment": "production" }'
```

When executing, only rules matching the requested environment are evaluated.

---

## Test Suites

Test suites let you define expected outcomes and automatically validate your rules.

### Create a Test Suite

```bash
curl -X POST http://localhost:3001/test-suites \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Medicare Smoke Tests",
    "domainId": "<domain-id>"
  }'
```

### Add Test Cases

```bash
# Case 1: 70-year-old should qualify
curl -X POST http://localhost:3001/test-suites/<suite-id>/cases \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Elderly patient qualifies for Medicare",
    "inputData": { "patient": { "age": 70 } },
    "expectedResult": { "Medicare Eligibility": true }
  }'

# Case 2: 30-year-old should NOT qualify
curl -X POST http://localhost:3001/test-suites/<suite-id>/cases \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Young patient does not qualify",
    "inputData": { "patient": { "age": 30 } },
    "expectedResult": { "Medicare Eligibility": false }
  }'
```

### Run the Test Suite

```bash
curl -X POST http://localhost:3001/test-suites/<suite-id>/run
```

The response shows which cases passed and which failed, with the actual vs. expected results.

---

## Conflict Analysis

The conflict analyzer examines all active rules in a domain and identifies potential issues:

```bash
curl http://localhost:3001/analysis/conflicts/<domain-id>
```

### What It Detects

| Finding | Severity | Description |
|---|---|---|
| **Contradiction** | High | Two rules have conditions on the same field that can never both be true (e.g., `age > 65` and `age < 60`) |
| **Overlap** | High | Two rules have identical JSONLogic |
| **Always True** | Medium | A rule that always evaluates to true |
| **Always False** | Medium | A rule that never evaluates to true |

### When to Run

- After creating or modifying rules
- Before promoting rules to production
- As part of your CI/CD pipeline
- During code review of rule changes

---

## Import & Export

### Export a Domain

Download a domain with all its rules as a portable JSON package:

```bash
curl http://localhost:3001/domains/<domain-id>/export > healthcare-backup.json
```

### Import a Domain

Import creates a new domain with all its rules (atomically):

```bash
curl -X POST http://localhost:3001/domains/import \
  -H "Content-Type: application/json" \
  -d @healthcare-backup.json
```

### Use Cases

- **Backup/Restore**: Regularly export domains for disaster recovery
- **Migration**: Move rules between environments (dev → staging → prod)
- **Sharing**: Send rule packages to other teams or organizations
- **Version Control**: Store exports in Git for change tracking

---

## API Key Management

API keys provide secure, programmatic access to the rules engine.

### Generate a Key

```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Content-Type: application/json" \
  -d '{ "name": "CI/CD Pipeline", "scopes": ["execute", "read"] }'
```

> ⚠️ **Important**: The raw key is only shown once. Save it immediately!

### Using a Key

Include the key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: rk_abc123..." http://localhost:3001/execute \
  -X POST -H "Content-Type: application/json" \
  -d '{"domainId": "...", "data": {...}}'
```

### Key Security

- Keys are hashed with SHA-256 before storage — the raw key is never saved
- Keys can have an expiration date
- Revoked keys immediately stop working
- `lastUsed` is tracked for monitoring

---

## Webhook Notifications

Set up webhooks to get notified when events occur:

```bash
curl -X POST http://localhost:3001/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://your-handler.com/webhook",
    "events": ["rule.created", "rule.updated", "rule.deleted"],
    "secret": "your-signing-secret"
  }'
```

For detailed integration instructions, see the [Webhook Integration Guide](./WEBHOOK_INTEGRATION.md).

---

## Audit Log

The audit log records all changes to rules, domains, and other entities:

```bash
# View all audit entries
curl "http://localhost:3001/audit"

# Filter by entity
curl "http://localhost:3001/audit?entityType=Rule"

# Filter by action
curl "http://localhost:3001/audit?action=UPDATE"

# Filter by specific entity
curl "http://localhost:3001/audit?entityType=Rule&entityId=<rule-id>"

# Paginate
curl "http://localhost:3001/audit?limit=20&offset=40"
```

Each audit entry includes:
- **Before state**: What the entity looked like before the change
- **After state**: What it looks like after the change
- **Action**: `CREATE`, `UPDATE`, `DELETE`, `ROLLBACK`, `IMPORT`
- **Actor**: Who made the change (defaults to `"system"`)
- **Timestamp**: When it happened

---

## Recipes & Examples

### Recipe 1: Age-Based Eligibility

```json
{
  "name": "Senior Eligibility",
  "jsonLogic": {
    "and": [
      { ">=": [{ "var": "patient.age" }, 65] },
      { "==": [{ "var": "patient.isActive" }, true] }
    ]
  }
}
```

### Recipe 2: Fee Schedule Lookup

```json
{
  "name": "Fee Schedule",
  "jsonLogic": {
    "if": [
      { "and": [
        { "==": [{ "var": "payer.type" }, "Medicare"] },
        { "==": [{ "var": "claim.cpt" }, "90837"] }
      ]}, 150.00,
      { "and": [
        { "==": [{ "var": "payer.type" }, "BlueCross"] },
        { "==": [{ "var": "claim.cpt" }, "90837"] }
      ]}, 175.00,
      0.00
    ]
  }
}
```

### Recipe 3: Risk Score with Multiple Factors

```json
{
  "name": "Risk Score Calculator",
  "jsonLogic": {
    "+": [
      { "if": [{ ">=": [{ "var": "patient.age" }, 65] }, 30, 0] },
      { "if": [{ ">": [{ "var": "vitals.bmi" }, 30] }, 20, 0] },
      { "if": [{ "==": [{ "var": "smoking.status" }, "current"] }, 25, 0] },
      { "if": [{ ">": [{ "var": "lab.a1c" }, 7.0] }, 15, 0] }
    ]
  }
}
```

### Recipe 4: Date-Based Rule

```json
{
  "name": "Q1 Promotion",
  "jsonLogic": {
    "and": [
      { ">=": [{ "var": "order.total" }, 100] },
      { "==": [{ "var": "customer.tier" }, "gold"] }
    ]
  },
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-03-31T23:59:59Z",
  "environment": "production",
  "priority": 20
}
```
