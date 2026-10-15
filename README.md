# LedgerFlow

A learning project for managing **simulated** transactions. It does not process payments or move money.

The product requirements are in [PRD.md](./PRD.md). Milestones 1–5 are complete:
the API, the web frontend, and a moderate SOLID refactor of both are done and
tested, and the app is deployed (synthetic data only).

**Live demo:** [ledgerflow.elvanrff.id](https://ledgerflow.elvanrff.id)

**Where the build stands is in [STATUS.md](./STATUS.md)** — read that first, it is the single source of truth for what is done and what comes next.

## Stack

- Bun for the runtime, package manager, and scripts
- Express + TypeScript API
- Next.js + TypeScript web app
- TanStack Query for client-side data fetching (list & detail)
- PostgreSQL with Prisma

## Architecture

Monorepo (Bun workspaces) with two apps. Both are organized by responsibility
(level: moderate — split concerns, not one file per function).

```
ledgerflow/
├─ apps/api/            Express API (thin routes → services → repositories)
│  └─ src/
│     ├─ routes/        transport only: parse, delegate, respond
│     ├─ auth/          sessions, guards, rate limiting, account service
│     ├─ transactions/  service (rules) + repository (Prisma) + status/amount/view
│     ├─ http/          validation + CORS/Origin helpers
│     └─ middleware/    error handler
├─ apps/web/            Next.js app (App Router, feature folders)
│  └─ src/
│     ├─ app/           routed pages — thin composition
│     │  └─ api/proxy/  same-origin proxy to the API (split-origin deploys)
│     ├─ features/      per-domain hooks + presentational components
│     ├─ components/    shared UI primitives (Button, Field, Amount, …)
│     └─ lib/           API client, types, filters, transitions
└─ docs/                plans, API reference, security review, deployment
```

- **API** — routes never touch Prisma; business rules live in services, data
  access in repositories. See [docs/api.md](./docs/api.md).
- **Web** — each page is a thin shell over a feature hook (`use-transaction-list`,
  `use-transaction-detail`, `use-create-transaction`, `use-auth-form`) plus
  focused presentational pieces. The transaction list and detail fetch
  client-side through **TanStack Query** (`useQuery` for the list, `useMutation`
  for the detail's transition and description writes); the **dashboard stays
  server-rendered** via `serverFetch`. Money is rendered from the API's string
  amounts.
- **Same-origin proxy** — in the deployed split-origin setup (web and API on
  different domains), browser calls go through `app/api/proxy/[...path]`, which
  forwards to the API and rewrites `Set-Cookie` to drop the `Domain` attribute.
  That keeps the session cookie on the web origin so Server Components can read
  it. See [docs/deployment.md](./docs/deployment.md).

## Features

- **Accounts** — register/login/logout with PostgreSQL-backed sessions
  (`HttpOnly`, `Secure` in production, `SameSite=Lax` by default), bcrypt
  password hashing.
- **Transactions** — create (with `Idempotency-Key`), owner-scoped list with
  pagination/filter/search/sort, detail with status history, description edit
  while `PENDING`.
- **Status workflow** — `PENDING → PROCESSING | FAILED`, `PROCESSING → COMPLETED | FAILED`;
  COMPLETED/FAILED are terminal. Transitions are atomic (row lock) and invalid
  moves are rejected.
- **Dashboard** — counts per status and totals **per currency** (never mixed).
- **Web UI** — `/login`, `/register`, `/dashboard`, `/transactions`,
  `/transactions/new`, `/transactions/[id]`, with empty/loading/error states.

## Local setup

Prerequisites: Bun and Docker with Docker Compose.

```sh
cp .env.example apps/api/.env
bun install
docker compose up -d
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev:api      # terminal 1 — http://localhost:4000
bun run dev:web      # terminal 2 — http://localhost:3000
```

Set `SESSION_SECRET` in `.env` to a random string of at least 32 characters. The seed
command creates one synthetic local user; set `SEED_USER_PASSWORD` and it is stored as a bcrypt hash.

Run the test suite with `bun run test` and typecheck with `bun run typecheck` (tests
require the Docker PostgreSQL instance to be running).

## API

Full reference with request/response examples: [docs/api.md](./docs/api.md).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Liveness/DB check |
| POST | `/auth/register` | Creates a user and a server session |
| POST | `/auth/login` | Establishes a server session |
| GET | `/auth/me` | Current user's public profile |
| POST | `/auth/logout` | Invalidates the session |
| POST | `/transactions` | Requires `Idempotency-Key` header |
| GET | `/transactions` | Owner-scoped list with pagination/filter/search/sort |
| GET | `/transactions/:id` | Details plus status history |
| PATCH | `/transactions/:id` | Edits description only, while `PENDING` |
| POST | `/transactions/:id/status` | Permitted status transitions |
| GET | `/dashboard/summary` | Counts by status and totals per currency |

Sessions are stored in PostgreSQL; state-changing cookie-authenticated requests
must send an `Origin` matching `FRONTEND_ORIGIN` (CSRF protection).

## Security

The security review (PRD §11) is in [docs/security-review.md](./docs/security-review.md).
Highlights: Origin-checked CSRF, hashed session tokens, Zod-validated input,
consistent error shape with no internals leaked in production.

## Limitations

- **Simulated only** — no real payments, transfers, or money movement.
- **Single-origin CSRF model** — the API requires `Origin` to equal
  `FRONTEND_ORIGIN`; multiple origins would need a token scheme.
- **In-memory rate limiting** — per-process; a shared store (e.g. Redis) is needed
  to scale to multiple API instances.

## Status

- [x] PRD captured in this repository
- [x] API and database foundation
- [x] Authentication (register/login/logout) and transaction workflows
- [x] Frontend (auth, dashboard, list, create, detail/edit/transitions)
- [x] SOLID refactor of API + web (behavior-preserving)
- [x] Deployment (Docker Compose on a VPS, synthetic data only)
