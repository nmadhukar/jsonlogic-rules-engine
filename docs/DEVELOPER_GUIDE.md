# JSONLogic Rules Engine — Developer Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [Module Reference](#module-reference)
- [Adding a New Feature](#adding-a-new-feature)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The JSONLogic Rules Engine is a full-stack business rules management platform:

```
┌─────────────────────────────────────────────────┐
│              React Frontend (Vite)               │
│  Rule Builder │ Simulator │ Test Suites │ Admin  │
└─────────────────────┬───────────────────────────┘
                      │ REST API (JSON)
┌─────────────────────┴───────────────────────────┐
│             NestJS Backend (Port 3001)           │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌───────┐  │
│  │Execution│ │ Rules  │ │ Domains  │ │ Audit │  │
│  │ Service │ │Service │ │ Service  │ │Service│  │
│  └────┬────┘ └───┬────┘ └────┬─────┘ └───┬───┘  │
│  ┌────┴────┐ ┌───┴────┐ ┌────┴─────┐ ┌───┴───┐  │
│  │Testing  │ │  Auth  │ │Webhooks  │ │Analyze│  │
│  │ Service │ │(APIKey)│ │ Service  │ │Service│  │
│  └─────────┘ └────────┘ └──────────┘ └───────┘  │
│                    │                             │
│              ┌─────┴─────┐                       │
│              │  Prisma   │                       │
│              │  ORM      │                       │
│              └─────┬─────┘                       │
└────────────────────┼─────────────────────────────┘
                     │
              ┌──────┴──────┐
              │ PostgreSQL  │
              │  Database   │
              └─────────────┘
```

### Key Design Patterns

| Pattern | Usage |
|---|---|
| **Modular Monolith** | Each feature is a standalone NestJS module |
| **Global Modules** | AuditModule and WebhooksModule are global — accessible from any service |
| **Repository Pattern** | PrismaService wraps all database operations |
| **DTO Validation** | `class-validator` decorators enforce input validation |
| **Fire-and-Forget** | Webhooks are sent asynchronously without blocking the response |
| **Transactional Imports** | Domain imports use `$transaction` for atomicity |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS |
| **Backend** | NestJS 10, TypeScript |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL 15+ |
| **Rules Engine** | `json-logic-js` |
| **Auth** | API Key (SHA-256 hashed) |
| **Containerization** | Docker, Docker Compose |

---

## Project Structure

```
JsonRulesengine/
├── backend/                          # NestJS Backend
│   ├── prisma/
│   │   └── schema.prisma            # Database schema (8 models)
│   ├── src/
│   │   ├── analysis/                # Conflict detection module
│   │   │   ├── analysis.controller.ts
│   │   │   ├── analysis.service.ts  # Pairwise rule comparison
│   │   │   └── analysis.module.ts
│   │   ├── audit/                   # Audit trail module (global)
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts     # Logs all entity changes
│   │   │   └── audit.module.ts
│   │   ├── auth/                    # API key management
│   │   │   ├── api-key.controller.ts
│   │   │   ├── api-key.service.ts   # Key generation, validation
│   │   │   ├── api-key.guard.ts     # X-API-Key header guard
│   │   │   └── auth.module.ts
│   │   ├── domains/                 # Domain management
│   │   │   ├── domains.controller.ts
│   │   │   ├── domains.service.ts   # CRUD + import/export + seeding
│   │   │   ├── dto/                 # Validation DTOs
│   │   │   └── domains.module.ts
│   │   ├── execution/               # Rule execution engine
│   │   │   ├── execution.controller.ts
│   │   │   ├── execution.service.ts # JSONLogic evaluation
│   │   │   ├── dto/
│   │   │   └── execution.module.ts
│   │   ├── prisma/                  # Database connection
│   │   │   ├── prisma.service.ts    # Extends PrismaClient
│   │   │   └── prisma.module.ts
│   │   ├── rules/                   # Rule management + versioning
│   │   │   ├── rules.controller.ts
│   │   │   ├── rules.service.ts     # CRUD + versioning + rollback
│   │   │   ├── dto/
│   │   │   └── rules.module.ts
│   │   ├── testing/                 # Test suite management
│   │   │   ├── testing.controller.ts
│   │   │   ├── testing.service.ts   # Suite runner with comparison
│   │   │   └── testing.module.ts
│   │   ├── webhooks/                # Webhook notification (global)
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts  # Event matching + HMAC signing
│   │   │   └── webhooks.module.ts
│   │   ├── app.module.ts           # Root module — assembles everything
│   │   └── main.ts                 # Bootstrap with CORS + validation
│   └── test/                       # E2E tests
├── src/                            # React Frontend
│   ├── components/                 # UI components
│   ├── pages/                      # Route pages
│   └── App.tsx                     # Router + layout
├── docs/                           # Documentation (you are here)
├── docker-compose.yml              # Full stack + PostgreSQL
├── Dockerfile                      # Multi-stage build
└── package.json                    # Frontend dependencies
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or use Docker)
- npm or yarn

### Option 1: Docker (Recommended)

```bash
# Start everything (PostgreSQL + Backend + Frontend)
docker compose up --build -d

# Frontend: http://localhost:3081
# Backend:  http://localhost:3001
```

### Option 2: Local Development

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Set up database
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Generate Prisma client + run migrations
npx prisma generate
npx prisma db push

# 4. Start backend (port 3001)
npm run start:dev

# 5. In another terminal, start frontend
cd ..
npm install
npm run dev
```

### Environment File (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rules_engine"
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

---

## Database Schema

The database has 8 models:

```
Domain (1) ──→ (*) Rule ──→ (*) RuleVersion
  │
  └──→ (*) TestSuite ──→ (*) TestCase

AuditLog (standalone — logs all changes)
ApiKey   (standalone — authentication)
Webhook  (standalone — event notifications)
```

### Key Schema Details

| Model | Purpose | Key Fields |
|---|---|---|
| `Domain` | Rule container | `name` (unique), `fields` (JSON), `templates`, `presets` |
| `Rule` | Business rule | `jsonLogic` (JSON), `priority`, `environment`, `startDate`, `endDate` |
| `RuleVersion` | Version history | `version` (auto-increment), `jsonLogic`, `changeMsg` |
| `AuditLog` | Change log | `entityType`, `action`, `before`/`after` (JSON snapshots) |
| `TestSuite` | Test container | Linked to Domain |
| `TestCase` | Individual test | `inputData`, `expectedResult` |
| `ApiKey` | API authentication | `keyHash` (SHA-256), `prefix`, `scopes`, `expiresAt` |
| `Webhook` | Event notifications | `url`, `events` (JSON array), `secret` |

To view the full schema:
```bash
cat backend/prisma/schema.prisma
```

---

## Module Reference

### ExecutionModule

**Purpose**: Evaluate JSONLogic rules against input data.

- Queries rules by domain, environment, and active date range
- Executes rules in priority order (highest first)
- Catches individual rule errors without failing the batch
- Returns per-rule pass/fail results with timing

### RulesModule

**Purpose**: CRUD operations for rules with automatic versioning.

- Creates initial version (v1) on rule creation
- Auto-versions on `jsonLogic` changes
- Supports rollback to any historical version
- Emits audit logs for all mutations

### DomainsModule

**Purpose**: Domain management with seeding, import, and export.

- Seeds Healthcare and HR domains on first startup
- Export produces a portable JSON package
- Import is transactional (all-or-nothing)
- Cascade delete removes rules, versions, test suites, and test cases

### AuditModule (Global)

**Purpose**: Immutable audit trail for all entity changes.

- Records before/after state snapshots
- Supports metadata (e.g., rollback version number)
- Filterable by entity type, entity ID, and action
- Paginated with `limit` and `offset`

### TestingModule

**Purpose**: Automated test suites for rule validation.

- Suites contain multiple test cases
- Each case has `inputData` and `expectedResult`
- Runner executes all cases against the execution engine
- Compares results by rule name or rule ID

### AuthModule

**Purpose**: API key authentication.

- SHA-256 hashed key storage (raw key never stored)
- `rk_` prefix for key identification
- Expiration date support
- `ApiKeyGuard` for endpoint protection
- `lastUsed` tracking on validation

### WebhooksModule (Global)

**Purpose**: External event notifications.

- Fire-and-forget delivery (doesn't block responses)
- Event matching with wildcard (`*`) support
- HMAC-SHA256 payload signing
- 10-second delivery timeout

### AnalysisModule

**Purpose**: Static rule conflict detection.

- Pairwise comparison of all active rules in a domain
- Detects: contradictions, overlaps, always-true/false
- Bidirectional range conflict checking
- Reports field-level conflict details

---

## Adding a New Feature

Follow this pattern to add a new module:

```bash
# 1. Create the module directory
mkdir backend/src/my-feature

# 2. Create 4 files:
# - my-feature.module.ts  (NestJS module)
# - my-feature.service.ts (business logic)
# - my-feature.controller.ts (REST endpoints)
# - my-feature.service.spec.ts (unit tests)
```

### Module Template

```typescript
// my-feature.module.ts
import { Module } from '@nestjs/common';
import { MyFeatureService } from './my-feature.service';
import { MyFeatureController } from './my-feature.controller';

@Module({
    providers: [MyFeatureService],
    controllers: [MyFeatureController],
    exports: [MyFeatureService],
})
export class MyFeatureModule {}
```

```typescript
// my-feature.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MyFeatureService {
    constructor(private prisma: PrismaService) {}
    // Add methods here
}
```

### Register in app.module.ts

```typescript
import { MyFeatureModule } from './my-feature/my-feature.module';

@Module({
    imports: [
        PrismaModule,
        // ... existing modules
        MyFeatureModule,    // ← Add here
    ],
})
export class AppModule {}
```

---

## Testing

### Running Tests

```bash
cd backend

# Run all tests
npx jest

# Run with coverage
npx jest --coverage

# Run a specific module
npx jest src/rules/

# Run in watch mode
npx jest --watch
```

### Test Structure

Each module has `*.service.spec.ts` and `*.controller.spec.ts` files:

| File | Tests |
|---|---|
| `execution.service.spec.ts` | 8 tests |
| `execution.controller.spec.ts` | 5 tests |
| `rules.service.spec.ts` | 14 tests |
| `rules.controller.spec.ts` | 15 tests |
| `domains.service.spec.ts` | 12 tests |
| `domains.controller.spec.ts` | 12 tests |
| `audit.service.spec.ts` | 8 tests |
| `audit.controller.spec.ts` | 4 tests |
| `testing.service.spec.ts` | 12 tests |
| `testing.controller.spec.ts` | 10 tests |
| `api-key.service.spec.ts` | 11 tests |
| `api-key.controller.spec.ts` | 5 tests |
| `webhooks.service.spec.ts` | 12 tests |
| `webhooks.controller.spec.ts` | 10 tests |
| `analysis.service.spec.ts` | 10 tests |
| `analysis.controller.spec.ts` | 3 tests |
| **Total** | **152 tests** |

### Writing Tests

Mock the PrismaService and any dependencies:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MyService', () => {
    let service: MyService;
    let prisma: any;

    beforeEach(async () => {
        prisma = {
            myModel: {
                findMany: jest.fn().mockResolvedValue([]),
                create: jest.fn().mockResolvedValue({ id: '1' }),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MyService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<MyService>(MyService);
    });

    it('should list items', async () => {
        const result = await service.findAll();
        expect(result).toEqual([]);
    });
});
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

---

## Docker Deployment

### docker-compose.yml

The project includes a production-ready Docker Compose configuration:

```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rules_engine
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/rules_engine
    depends_on:
      - db

  frontend:
    build: .
    ports:
      - "3081:80"
    depends_on:
      - backend
```

### Building Images

```bash
docker compose build
docker compose up -d
```

---

## Troubleshooting

### Prisma Client Stale

If IDE shows errors like `Property 'ruleVersion' does not exist`:
```bash
cd backend
npx prisma generate
```
Then restart your IDE TypeScript server.

### Database Connection

If backend can't connect to PostgreSQL:
1. Verify `DATABASE_URL` in `.env`
2. Ensure PostgreSQL is running
3. Run `npx prisma db push` to sync schema

### CORS Issues

If frontend can't reach backend:
1. Check `CORS_ORIGIN` environment variable
2. Ensure backend is running on expected port
3. Check browser network tab for specific error

### Test Failures

If tests fail with module resolution errors:
```bash
cd backend
npx prisma generate    # Regenerate Prisma client
npx jest --clearCache  # Clear Jest cache
npx jest               # Re-run
```
