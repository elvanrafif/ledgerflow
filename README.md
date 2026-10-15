# LedgerFlow

A learning project for managing **simulated** transactions. It does not process payments or move money.

The product requirements are in [PRD.md](./PRD.md). The backend API is implemented and tested; the web frontend and deployment are still to come.

**Where the build stands is in [STATUS.md](./STATUS.md)** — read that first, it is the single source of truth for what is done and what comes next.

## Stack

- Bun for the runtime, package manager, and scripts
- Express + TypeScript API
- Next.js + TypeScript web app (planned)
- PostgreSQL with Prisma

## Local setup

Prerequisites: Bun and Docker with Docker Compose.

```sh
cp .env.example apps/api/.env
bun install
docker compose up -d
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev:api
```

Set `SESSION_SECRET` in `.env` to a random string of at least 32 characters. The seed
command creates one synthetic local user; set `SEED_USER_PASSWORD` and it is stored as a bcrypt hash.

Run the test suite with `bun run test` and typecheck with `bun run typecheck` (tests
require the Docker PostgreSQL instance to be running).

## Current status

- [x] PRD captured in this repository
- [x] API and database foundation
- [x] Authentication (register/login/logout) and transaction workflows
- [ ] Frontend
- [ ] Deployment

### API endpoints (all under `/api/v1`)

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

No live demo is available yet. See the [Milestone 1 plan](./docs/superpowers/plans/2026-10-15-ledgerflow-milestone-1.md) for the first implementation steps.
