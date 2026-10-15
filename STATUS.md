# LedgerFlow — Progress

Single source of truth for where the build stands. **Read this first** at the
start of a session, before touching code.

Last updated: 2026-10-15

## Next up

**Start a new session with this:** frontend Milestone 4 (PRD §8) is not started.
Before writing any UI, clear two gates in the "Frontend prerequisites" section
below, then build the pages in the order listed.

## Where we are

Milestones are from PRD §15. Backend (Milestones 1-3) is done and merged to
`main`. Nothing in frontend or release has started.

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Foundation: repo, TypeScript, PostgreSQL/Prisma, schema, seed, health, errors | Done |
| 2 | Auth and transactions: register/sessions, create/list, authorization, tests | Done |
| 3 | Business rules: transitions, idempotency, history/atomic updates, filtering, dashboard | Done |
| 4 | Frontend: auth pages, dashboard/table, form/detail, API integration, UI states | **Not started** |
| 5 | Release: security checks, tests, deployment, docs, demo | Not started |

## Requirements checklist

Traced to PRD functional requirements. Backend rows are implemented and covered
by tests; frontend rows are what Milestone 4 must deliver.

### Backend (done, verified)

- [x] FR-01 registration: validated, normalized unique email, bcrypt hash, 409 on duplicate
- [x] FR-02 sessions: PostgreSQL-backed, HttpOnly/SameSite cookies, logout invalidates
- [x] FR-03 create transaction: idempotency key, amount > 0, IDR/USD/SGD, PENDING, replay/409
- [x] FR-04 list: owner-scoped, pagination (max 100), status filter, search, sort
- [x] FR-05 detail: owner-only, includes status history, 404 for others
- [x] FR-06 update: description only, only while PENDING, protected fields rejected
- [x] FR-07 status workflow: permitted transitions only, 409 otherwise, serialized by row lock
- [x] FR-08 history: initial PENDING recorded, appends per transition, initiating user, append-only
- [x] FR-09 dashboard summary: counts per status, totals per currency, no mixing
- [x] FR-10 errors: consistent shape, distinct validation/auth/authorization, no internals leaked

### Frontend (Milestone 4, not started)

- [ ] FR-01 `/register` page with validation errors from API
- [ ] FR-02 `/login` page, session cookie auth, redirect when already logged in
- [ ] FR-04 `/transactions` list: pagination, filters, search, sorting, empty/loading/error states
- [ ] FR-03 `/transactions/new` create form: basic validation, idempotency key generated per submit
- [ ] FR-05 `/transactions/[id]` detail with status history timeline
- [ ] FR-06 edit description while PENDING
- [ ] FR-07 transition controls (only permitted), confirmation for consequential actions
- [ ] FR-09 `/dashboard` summary: counts by status, totals per currency
- [ ] §8 shared: centralized API client, reusable components, status badges, loading indicators,
      accessible labels, keyboard navigation, responsive desktop/mobile
- [ ] §8 routed pages: `/login`, `/register`, `/dashboard`, `/transactions`,
      `/transactions/new`, `/transactions/[id]`

### Release (Milestone 5, not started)

- [ ] Security pass against PRD §11 (CORS, CSRF, rate limiting, secrets, logging)
- [ ] Deployment (documented, synthetic data only) and live demo URL
- [ ] README architecture/features/setup/limitations, API examples
- [ ] Screenshots and short demo walkthrough
- [ ] Resolve remaining dependency advisory (see "Known issues")

## Frontend prerequisites (blocking, PRD §8)

Both must be settled before writing UI. See
`docs/superpowers/plans/2026-10-15-ledgerflow-frontend.md` for the full plan.

1. **antislop usage mode** — installed globally at `~/.agents/skills/antislop`
   (v3.2.20, MIT). No saved preference exists, so `antislop` (R-37) requires a
   choice: `during` (apply rules while building) or `after` (audit afterwards).
   To stop being asked every session, the user runs `npx antislop-ai --mode during`.
2. **Design direction** — antislop is a filter, not a beautifier (R-37). Without a
   `DESIGN.md` the output must be labelled *"draft without direction"* with dials
   ENERGY 1 / RHYTHM 1 / MOTION 1, and is not shippable. A `DESIGN.md` must exist
   at the repo root before building.

## Known issues / follow-ups

- **Rate limiting is process-local** (`apps/api/src/auth.ts`, marked with a
  `// shorthand` comment). Does not coordinate across API instances; needs a
  shared store before running more than one instance.
- **CSRF model assumes one frontend origin** (`apps/api/src/http.ts`,
  `// shorthand` comment). Requiring `Origin` to equal `FRONTEND_ORIGIN` is enough
  for a single same-origin app; multiple origins need a token-based scheme.
- **One dependency advisory remains**: `deepmerge-ts <8.0.0` (high) pulled in by
  Prisma 6 tooling. The fix requires a Prisma major upgrade; deferred deliberately.
- **Frontend `dev:web` script points at `apps/web`, which does not exist yet.**
  Running `bun run dev:web` today fails until Milestone 4 creates the app.

## Environment notes

- Bun is installed via the official installer at `~/.bun/bin/bun` (version 1.4.3).
  Homebrew could not install it (Xcode 26.5 needs updating to 27.0 first).
  A new shell should have it; if not, use `PATH="$HOME/.bun/bin:$PATH"`.
- Docker Desktop 4.95.0 with Compose v5.6.0 runs PostgreSQL 17 via
  `docker compose up -d`. `apps/api/.env` is created from `.env.example` and is
  gitignored; it needs `SESSION_SECRET` (min 32 chars).
- Run from the repo root. Tests hit a real PostgreSQL instance:
  `bun run test`, then `bun run typecheck`.

## How to verify current state

```sh
docker compose up -d                     # PostgreSQL
bun run --cwd apps/api db:generate
bun run --cwd apps/api db:migrate
bun run test                             # expect 28 passing
bun run typecheck
bun run dev:api                          # http://localhost:4000/api/v1/health
```

## Repo map

- `PRD.md` — product requirements (source of truth)
- `apps/api/` — Express + TypeScript API
  - `src/routes/` — health, auth, transactions, transaction-detail, dashboard
  - `src/auth.ts` — sessions, cookie config, Origin guard, rate limiting
  - `src/http.ts` — shared body/query validation and CORS
  - `src/transactions/` — reference generator, status state machine, view mappers
  - `prisma/` — schema, migrations, seed
  - `test/` — 9 suites, 28 tests, all against real PostgreSQL
- `apps/web/` — Next.js frontend (to be created in Milestone 4)
- `docs/superpowers/plans/` — implementation plans
- `docker-compose.yml` — local PostgreSQL

## Git

- `main` is the production branch and the GitHub default.
- Remote: https://github.com/elvanrafif/ledgerflow (public).
- History is staged: 8 commits from repo init through API tests.
