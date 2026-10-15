# LedgerFlow — Progress

Single source of truth for where the build stands. **Read this first** at the
start of a session, before touching code.

Last updated: 2026-10-16 (deployed + split-origin session fix)

## Next up

**Milestones 1-5 are complete: the app is deployed and working at
[ledgerflow.elvanrff.id](https://ledgerflow.elvanrff.id) (synthetic data only).**
Milestones 1-4 delivered the API and web app; a moderate SOLID refactor split
responsibilities without changing behavior (API routes are thin transport over
service + repository layers; the web app uses per-page feature hooks and focused
presentational components).

**Client data fetching uses TanStack Query.** The transaction list reads through
`useQuery` and the detail's transition/description writes run through
`useMutation`; the dashboard stays server-rendered via `serverFetch`. The test
suite is **89 tests (30 API + 59 web)**, typecheck clean, `next build` serves all
routes.

**Deployment lesson (split-origin sessions).** Web and API are on different
origins (`ledgerflow.elvanrff.id` + `api-ledgerflow.elvanrff.id`). A cookie set by
the API belongs to the API domain, so Server Components (which read `cookies()`)
could not see the session and `/dashboard` returned 401. Fixed with a same-origin
proxy (`apps/web/src/app/api/proxy/[...path]/route.ts`) that forwards to the API
and rewrites `Set-Cookie` to drop `Domain`. See `docs/deployment.md` §5. A single
origin would also avoid this and is the recommended setup when available.

Remaining (non-blocking, needs a human with a browser): screenshots + a short demo
walkthrough, and a manual visual pass at mobile + desktop widths.

## Where we are

Milestones are from PRD §15, all five **Done** (Milestone 5's demo/screenshots are
the only optional leftovers, needing a human with a browser). Backend, frontend,
refactor, and deployment are complete and verified (89 tests, typecheck,
`next build`, live deploy on a VPS via Docker Compose).

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Foundation: repo, TypeScript, PostgreSQL/Prisma, schema, seed, health, errors | Done |
| 2 | Auth and transactions: register/sessions, create/list, authorization, tests | Done |
| 3 | Business rules: transitions, idempotency, history/atomic updates, filtering, dashboard | Done |
| 4 | Frontend: auth pages, dashboard/table, form/detail, API integration, UI states | Done |
| 5 | Release: security checks, tests, deployment, docs, demo | Done (deployed; demo/screenshots optional) |

## Requirements checklist

Traced to PRD functional requirements. Backend rows are implemented and covered
by tests; frontend rows are delivered by Milestone 4.

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

### Frontend (Milestone 4, done, verified)

- [x] FR-01 `/register` page with validation errors from API
- [x] FR-02 `/login` page, session cookie auth, redirect when already logged in
- [x] FR-04 `/transactions` list: pagination, filters, search, sorting, empty/loading/error states
- [x] FR-03 `/transactions/new` create form: basic validation, idempotency key generated per submit
- [x] FR-05 `/transactions/[id]` detail with status history timeline
- [x] FR-06 edit description while PENDING
- [x] FR-07 transition controls (only permitted), confirmation for consequential actions
- [x] FR-09 `/dashboard` summary: counts by status, totals per currency
- [x] §8 shared: centralized API client, reusable components, status badges, loading indicators,
      accessible labels, keyboard navigation, responsive desktop/mobile
- [x] §8 routed pages: `/login`, `/register`, `/dashboard`, `/transactions`,
      `/transactions/new`, `/transactions/[id]`

### Release (Milestone 5 — deployed)

- [x] Security pass against PRD §11 (CORS, CSRF, rate limiting, secrets, logging) — `docs/security-review.md`
- [x] README architecture/features/setup/limitations, API examples — README + `docs/api.md`
- [x] Deploy assets prepared and verified — `apps/api/Dockerfile`, `docker-compose.prod.yml`, `docs/deployment.md`
- [x] CI — `.github/workflows/ci.yml` (typecheck + test + build with a Postgres service)
- [x] Dependency advisory resolved (postcss; 5 → 1 advisory, remainder dev-only)
- [x] Deployment (Docker Compose on a VPS, synthetic data only) — live at ledgerflow.elvanrff.id
- [x] Split-origin session fix — same-origin API proxy (`docs/deployment.md` §5)
- [ ] Screenshots and short demo walkthrough — needs a browser
- [ ] Manual visual pass at mobile + desktop widths — needs a browser

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

- **Rate limiting is process-local** (`apps/api/src/auth/rate-limit.ts`, marked
  with a `shorthand` comment). Does not coordinate across API instances; needs a
  shared store (e.g. Redis) before running more than one instance.
- **CSRF model assumes one frontend origin** (`apps/api/src/http/cors.ts`,
  `shorthand` comment). Requiring `Origin` to equal `FRONTEND_ORIGIN` is enough
  for a single same-origin app; multiple origins need a token-based scheme.
- **One dependency advisory remains (dev-only)**: `deepmerge-ts <8.0.0` (high)
  pulled in by the `prisma` CLI devDependency (not in the runtime path; the
  postcss advisories are fixed via a root `overrides` entry). See
  `docs/security-review.md` §3. The deepmerge-ts fix needs a Prisma major upgrade;
  deferred deliberately.
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
bun run test                             # expect 30 API + 59 web passing
bun run typecheck
bun run dev:api                          # http://localhost:4000/api/v1/health
bun run dev:web                          # http://localhost:3000
```

## Repo map

- `PRD.md` — product requirements (source of truth)
- `apps/api/` — Express + TypeScript API
  - `src/routes/` — thin transport: health, auth, transactions, transaction-detail, dashboard
  - `src/auth/` — sessions, cookie config, Origin guard, rate limiting, account service
  - `src/transactions/` — service (rules), repository (Prisma), amount/status/reference/view
  - `src/http/` — shared body/query validation and CORS
  - `src/middleware/` — error handler
  - `prisma/` — schema, migrations, seed
  - `test/` — 9 suites, 30 tests, all against real PostgreSQL
- `apps/web/` — Next.js App Router frontend
  - `src/lib/api-client.ts` — centralized `apiFetch` + `ApiError`, credentials, 401 redirect
  - `src/lib/proxy-cookie.ts` — strips `Domain` from `Set-Cookie` for the proxy
  - `src/lib/query-client.tsx` — TanStack Query provider (root layout)
  - `src/features/` — per-domain hooks (list via `useQuery`, detail writes via `useMutation`) + components
  - `src/test/render.tsx` — `renderWithProviders` helper (wraps components in a QueryClient)
  - `src/components/` — design primitives
  - `src/app/` — routed pages (thin composition)
  - `src/app/api/proxy/` — same-origin proxy to the API (split-origin deploys)
- `DESIGN.md` — design direction (palette, typography, dials); source of truth for UI
- `docs/superpowers/plans/` — implementation plans
- `docs/api.md`, `docs/security-review.md`, `docs/deployment.md` — release docs
- `apps/api/Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/ci.yml` — deploy + CI
- `docker-compose.yml` — local PostgreSQL

## Git

- `main` is the production branch and the GitHub default.
- Remote: https://github.com/elvanrafif/ledgerflow (public).
- History is staged in small commits: repo init → Milestones 1-4 → SOLID refactor
  (API service/repository layers, web feature hooks) → Milestone 5 artifacts
  (security review, API docs, deploy assets, CI) → deployment + split-origin
  session fixes.
