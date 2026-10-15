# LedgerFlow Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a minimal, runnable repository foundation for LedgerFlow: Express/TypeScript API, Next.js/TypeScript web app, PostgreSQL/Prisma, migration/seed, health check, and consistent API errors.

**Architecture:** Use Bun workspaces with `apps/api` and `apps/web`; Bun runs scripts and the applications. Keep feature/business code out until later milestones. PostgreSQL runs in Docker Compose; Prisma owns schema and migrations. API errors use one small JSON contract and a final Express error handler.

**Tech Stack:** Bun, TypeScript, Express, Next.js, PostgreSQL, Prisma, Zod, Vitest, Supertest.

**Spec:** `PRD.md` (Sections 9, 10, 13–16; Milestone 1).

## Global Constraints
- API is Express with TypeScript and REST under `/api/v1`.
- PostgreSQL accessed primarily through Prisma; schema changes use migrations.
- Validate untrusted input; production errors must not expose stack traces or database internals.
- Secrets stay out of source control; provide `.env.example` without real secrets.
- The application handles simulated transactions only; no real payment/money movement.
- Keep the setup small and documented; defer all later milestone features.

## Review Focus
- Missing database configuration must fail clearly at startup, not silently use an unintended database; add a config/startup check in Task 2.
- Unexpected API errors must not leak internals; test the production error shape in Task 3.
- Health status must distinguish a live process from an unavailable database; test healthy and DB-failure behavior in Task 3.
- Seed reruns must not create duplicate sample users; test idempotent seeding in Task 4.
- New clone should not accidentally commit secrets or generated build output; verify ignore rules and `.env.example` in Task 1.

---

### Task 1: Repository workspace and documentation

**Files:**
- Create: `package.json`, `bun.lock`, `.gitignore`, `.env.example`, `README.md`
- Existing: `PRD.md`

**Interfaces:**
- Produces Bun workspace roots `apps/api` and `apps/web`; scripts will be completed by app tasks.

- [ ] **Step 1: Define workspace and repository scripts**

Set root package as private Bun workspace with `apps/*`; add only scripts needed to run/typecheck/test the two apps once their packages exist.

- [ ] **Step 2: Add safe environment and ignore defaults**

`.env.example` documents `DATABASE_URL`, `PORT`, `FRONTEND_ORIGIN`, and `NODE_ENV` with local placeholders only. Ignore `.env*` except `.env.example`, node_modules, build output, coverage, and generated secrets.

- [ ] **Step 3: Document setup and scope**

README links to `PRD.md`, describes app layout, prerequisites, local start/test commands, simulated-only limitations, and says deployment/live URL are not yet available.

- [ ] **Step 4: Verify workspace metadata and secret hygiene**

Run `bun install`; verify no real credentials or `.env` are tracked and Bun recognizes both apps after Tasks 2 and 4.

### Task 2: API foundation and PostgreSQL schema

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/config.ts`, `apps/api/src/routes/health.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`, `docker-compose.yml`

**Interfaces:**
- Produces Express app export for Supertest without listening; server entrypoint loads configuration, connects Prisma, then listens.
- Produces `GET /api/v1/health` returning `{ status: "ok" }` only when DB connectivity is confirmed.

- [ ] **Step 1: Add API and database foundation tests**

Test `GET /api/v1/health` healthy response, unavailable DB response, and app construction without opening a port. Add Prisma schema validation to the verification command.

- [ ] **Step 2: Add local PostgreSQL service and configuration validation**

Docker Compose provides only PostgreSQL with a named volume and health check. Parse required environment values at startup; never supply production secrets in code.

- [ ] **Step 3: Create minimal Prisma models and migration**

Define User, Transaction, TransactionStatusHistory with UUID IDs, foreign keys, unique normalized email, unique reference, `(userId, idempotencyKey)` uniqueness, decimal amount, and indexes for user/status/creation-time access. Use enums for the PRD's statuses and currencies. Do not implement transaction routes yet.

- [ ] **Step 4: Implement Prisma connection and health route**

Health route confirms DB connectivity; return 503 with a stable response when unavailable. Keep exported app separate from listening server.

- [ ] **Step 5: Generate and verify migration**

Run Prisma format/validate and create initial migration against local PostgreSQL. Verify a fresh database can migrate successfully.

### Task 3: API error contract and middleware

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/errors.ts`, `apps/api/src/middleware/error-handler.ts`, `apps/api/test/errors.test.ts`

**Interfaces:**
- Error response: `{ error: { code: string, message: string } }`.
- Produces final Express error middleware; unexpected production errors return generic `INTERNAL_ERROR` without details.

- [ ] **Step 1: Test not-found and unexpected error responses**

Assert stable JSON shape; unknown path is 404; production-mode thrown error returns 500 with no stack/message internals.

- [ ] **Step 2: Implement minimal error middleware**

Handle known `AppError` status/code/message; log unexpected error without secrets; mask production message; mount after routes.

- [ ] **Step 3: Verify API tests and TypeScript**

Run API unit/integration test and `tsc --noEmit`.

### Task 4: Synthetic seed and local run verification

**Files:**
- Modify: `apps/api/prisma/seed.ts`, `README.md`, root scripts
- Test: `apps/api/test/seed.test.ts` or repeatable local seed command

**Interfaces:**
- Seed creates deterministic synthetic user data only and can be rerun safely.

- [ ] **Step 1: Define a repeatable seed check**

Run seed twice and verify the same sample user count remains; never use real personal/financial data.

- [ ] **Step 2: Implement minimal idempotent seed**

Use Prisma upsert for a clearly documented local sample user. Do not seed transactions until transaction service exists.

- [ ] **Step 3: Document and run local foundation flow**

Document `docker compose up -d`, install, migrate, seed, and dev commands. Run migration, seed twice, API tests, and health check against local Postgres.

### Task 5: Minimal web app placeholder

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`

**Interfaces:**
- Produces a Next.js TypeScript app root route that identifies the project as LedgerFlow and links to the API health endpoint for local smoke testing.

- [ ] **Step 1: Add web startup smoke check**

Verify web app builds and root page renders the LedgerFlow foundation placeholder; do not add dashboard/auth UI in this milestone.

- [ ] **Step 2: Implement minimal Next.js app**

Use default Next.js app structure and a plain, accessible placeholder. Avoid introducing a UI library or design system.

- [ ] **Step 3: Run repository verification**

Run root typecheck, API tests, Prisma validate/migrate, web build, and local health check with Bun. Update README with verified commands only.
