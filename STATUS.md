# LedgerFlow — Progress

Single source of truth for where the build stands. **Read this first** at the
start of a session, before touching code.

Last updated: 2026-10-15 (session 2)

## Next up

**Frontend Milestone 4 is complete.** Both prerequisites are cleared (see
"Frontend prerequisites" below). All 8 tasks are done: scaffold + API client,
tokens/fonts/primitives, login/register, dashboard, transaction list, create,
detail/edit/transitions, and the live click-through. The click-through found and
fixed two real bugs (session-cookie path; a 500 leak on non-numeric amounts).
Remaining: a manual visual pass at mobile + desktop widths in a real browser, and
Milestone 5 (release).

## Where we are

Milestones are from PRD §15. Backend (Milestones 1-3) is done and merged to
`main`. Frontend (Milestone 4) is complete: all 8 tasks done, and the live
click-through (Task 8) found and fixed two backend bugs. A manual visual pass at
mobile + desktop widths is still recommended. Release (Milestone 5) has not
started.

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

## Frontend prerequisites (cleared)

Both were resolved in session 2 before any UI work.

1. **antislop usage mode** — resolved to `during` as a session override (user
   choice). Announce `antislop active: during (session override)` before UI edits.
   To make it permanent across sessions, run `npx antislop-ai --mode during`.
2. **Design direction** — `DESIGN.md` now exists at the repo root, authored by the
   user via a direction questionnaire and transcribed by the agent: confident
   fintech identity, neutral grays with a deep slate blue accent, humanist sans +
   tabular-figures mono for numbers, dials **ENERGY 3 / RHYTHM 2 / MOTION 2**.

## Milestone 4 task progress

From `docs/superpowers/plans/2026-10-15-ledgerflow-frontend.md`:

- [x] Task 1 — web app foundation and API client (`apps/web`, `apiFetch`, `ApiError`)
- [x] Task 2 — visual foundation (tokens, fonts, 7 primitives; precise amount formatting)
- [x] Task 3 — authentication pages (`/login`, `/register`, session redirects, field errors)
- [x] Task 4 — dashboard summary (per-currency totals, status counts, empty/error states)
- [x] Task 5 — transaction list (URL-driven filters, sort, pagination, empty/error states)
- [x] Task 6 — create transaction (idempotency key reused across retries)
- [x] Task 7 — transaction detail, edit, transitions (timeline, terminal confirm, 409 surfaced)
- [x] Task 8 — run the app and verify every control (live stack click-through; 2 bugs found + fixed)
- [ ] Manual visual pass at mobile + desktop widths in a real browser (recommended, not blocking)

## Known issues / follow-ups

- **Rate limiting is process-local** (`apps/api/src/auth.ts`, marked with a
  `// shorthand` comment). Does not coordinate across API instances; needs a
  shared store before running more than one instance.
- **CSRF model assumes one frontend origin** (`apps/api/src/http.ts`,
  `// shorthand` comment). Requiring `Origin` to equal `FRONTEND_ORIGIN` is enough
  for a single same-origin app; multiple origins need a token-based scheme.
- **One dependency advisory remains**: `deepmerge-ts <8.0.0` (high) pulled in by
  Prisma 6 tooling. The fix requires a Prisma major upgrade; deferred deliberately.
- **Frontend `dev:web` script now works**: `apps/web` exists (created in
  Milestone 4, Task 1). `bun run dev:web` starts Next.js on port 3000; the API
  defaults to port 4000 and `FRONTEND_ORIGIN` defaults to `http://localhost:3000`.

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
bun run test                             # expect 28 API + 2 web passing
bun run typecheck
bun run dev:api                          # http://localhost:4000/api/v1/health
bun run dev:web                          # http://localhost:3000
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
- `apps/web/` — Next.js App Router frontend (Milestone 4)
  - `src/lib/api-client.ts` — centralized `apiFetch` + `ApiError`, credentials, 401 redirect
  - `src/components/` — design primitives (Task 2 onward)
  - `src/app/` — routed pages (Tasks 3-7)
- `DESIGN.md` — design direction (palette, typography, dials); source of truth for UI
- `docs/superpowers/plans/` — implementation plans
- `docker-compose.yml` — local PostgreSQL

## Git

- `main` is the production branch and the GitHub default.
- Remote: https://github.com/elvanrafif/ledgerflow (public).
- History is staged: 8 commits from repo init through API tests.
