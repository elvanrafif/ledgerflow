# Design — Adopt TanStack Query for client-side data fetching (LedgerFlow web)

**Date:** 2026-10-16
**Scope:** `apps/web` only. Backend, API contract, routes, and visuals unchanged.
**Status:** awaiting approval.

---

## 1. Intent and why

The web app currently fetches client-side data with hand-rolled hooks
(`useState` + `useEffect` + an `active` flag) in `features/transactions/`.
The user wants data fetching to be **simpler and more idiomatic**, with
TanStack Query doing the work the manual hooks do today (loading/error state,
refetch, cache).

This is a **behavior-preserving** change: the same screens, the same API calls,
the same user-visible states. Only the mechanism changes.

## 2. Goals

- Replace hand-rolled client fetch logic with TanStack Query hooks.
- Delete the manual `loading | error | ready` state machine and the `active`-flag
  cleanup; TanStack owns that.
- Keep **all 53 web tests green** (no test assertions rewritten; only a provider
  wrapper added where a component now needs one).
- Keep contracts intact: same `/api/v1` endpoints, same `apiFetch` (401 redirect
  + error envelope + `ApiError.message` stay the single source of error text).

## 3. Non-goals (explicit)

- **No change to the dashboard.** It is a Server Component using `serverFetch`;
  TanStack Query is client-side only and does not apply. Decision (user): keep
  the easiest implementation — list & detail move to TanStack, dashboard stays
  server-fetched.
- No change to `use-create-transaction` (create form) or `use-auth-form` at this
  stage — they are form submissions with redirects, not cache reads. (A mutation
  for create is a possible later follow-up; out of scope now.)
- No SSR/hydration of queries, no prefetching, no persistence, no devtools UI.
- No new API endpoints, no schema/migration changes, no visual changes, no CSS
  changes.
- No `globals.css`, route, or URL changes.

## 4. Constraints

- Behavior-preserving: 53 web tests stay green; typecheck clean; `next build`
  serves all 8 routes.
- New dependency: `@tanstack/react-query` (a library the user explicitly asked
  for). No other new libraries.
- Money stays a string end-to-end (TanStack must not parse amounts).
- The list keeps URL-driven filters (`useListNavigation` unchanged) and the
  detail keeps its confirmation gate for terminal transitions.

## 5. What changes (the how)

### 5.1 Provider

- Add `apps/web/src/lib/query-client.tsx` exporting a `Providers` component that
  creates one `QueryClient` and wraps children in `QueryClientProvider`.
- Mount `Providers` in `apps/web/src/app/layout.tsx` (root layout) so every page
  has a client.
- Defaults: `staleTime` a few seconds, `retry: false` for queries (tests assert
  first-error behavior; also matches "surface the API error" intent),
  `refetchOnWindowFocus: false` (avoid surprise refetches mid-demo). Exact
  numbers are a builder call, documented in code.

### 5.2 Query keys and the query function

- Add `apps/web/src/features/transactions/query-keys.ts` with a `transactionKeys`
  object: `list(filters)` and `detail(id)`.
- Query functions call the existing `apiFetch` (`apiFetch<TransactionListResponse>(…)`,
  `apiFetch<{ transaction: TransactionDetailData }>(…)`). `apiFetch` already
  throws `ApiError` with the right message and handles 401 redirect, so the
  query function is a one-liner.

### 5.3 List — `use-transaction-list.ts` (rewrite)

- `useQuery({ queryKey: transactionKeys.list(query), queryFn })`.
- Keep the returned shape the UI already consumes: a discriminated state
  (`loading | error | ready`) **plus** `reload`. Map TanStack's
  `isPending` / `isError` / `data` onto it so `TransactionList` and
  `TransactionListStates` need **no changes**.
  - `loading` → `isPending`
  - `error` → `isError`, message from `error.message`
  - `ready` → `{ data }`
  - `reload` → `refetch` (wrapped to the same `() => void` signature).
- This "adapter" keeps the presentational components untouched and keeps the
  existing tests passing as-is (they assert on the rendered states).

### 5.4 Detail — `use-transaction-detail.ts` (rewrite internals, same surface)

- Keep the current public return shape (used by `TransactionDetail` and its
  sections): `current`, `error`, `moves`, `editable`, `pending`, `busy`,
  `description`, `setDescription`, `editing`, `setEditing`, `saveBusy`,
  `requestTransition`, `confirmTransition`, `cancelTransition`, `saveDescription`,
  `cancelEdit`.
- The initial transaction comes from the route (already server-rendered into the
  page); keep `initial` as the seed. Use TanStack for the **status change** and
  **description edit** as `useMutation`, and keep the local `current` state as the
  rendered copy updated from the mutation response (preserving the exact
  history-append behavior the tests check).
  - `applyTransition` → mutation hitting `POST /transactions/:id/status`; on
    success, update `current` and append the same synthetic history entry as
    today; on error, set the same error string (`ApiError.message`), clear
    `pending`. 409 surfacing preserved.
  - `saveDescription` → mutation hitting `PATCH /transactions/:id`; on success,
    update `current` (keep history), exit editing; on error, same message.
- **Why keep local state here instead of the query cache:** the detail's history
  is assembled client-side (the API returns the row without history on
  mutations), and tests assert the exact timeline/editing behavior. Rewriting
  that to cache-invalidation semantics would change behavior. So detail uses
  TanStack **mutations** for the writes while keeping the read/state model the
  tests already pin. This is honest about what "simpler" means: the mutation
  lifecycle (busy, error, reset) is what gets simpler; the local render state
  stays.

> Note: if, after building, the detail read is better expressed as a `useQuery`
> keyed on `id` seeded with `initialData`, that is a builder call — but only if it
> keeps all detail tests green and preserves the history-append behavior. Default
> plan is the mutation-only rewrite above.

### 5.5 Tests

- Add `apps/web/src/test/render.tsx` exporting `renderWithProviders(ui)` that
  wraps `ui` in `Providers` (fresh `QueryClient` per call, `retry: false`) and
  re-exports Testing Library's `render` result + helpers.
- Update only the test files that render a query-using component to use
  `renderWithProviders` instead of `render`:
  - `transactions/page.test.tsx`, `transactions/[id]/page.test.tsx`.
  - Others (primitives, Amount, login, register, new, dashboard) are unchanged
    because they don't use queries — unless a component now requires the
    provider, in which case that file's `render` call is wrapped the same way.
- **No assertions are rewritten.** Only the render call changes.

## 6. Files touched (expected)

New:
- `src/lib/query-client.tsx`
- `src/features/transactions/query-keys.ts`
- `src/test/render.tsx`

Edited:
- `src/app/layout.tsx` (mount provider)
- `src/features/transactions/use-transaction-list.ts` (useQuery + state adapter)
- `src/features/transactions/use-transaction-detail.ts` (useMutation for writes)
- `src/app/(app)/transactions/page.test.tsx` (use `renderWithProviders`)
- `src/app/(app)/transactions/[id]/page.test.tsx` (use `renderWithProviders`)
- `package.json` (add `@tanstack/react-query`)

Unchanged: dashboard, create form, auth forms, `apiFetch`, all primitives,
routes, `globals.css`, backend, schema.

## 7. Docs to update

- `README.md` — Stack: add TanStack Query; Architecture: note client data
  fetching uses TanStack Query (client) while the dashboard stays server-fetched.
- `STATUS.md` — record the adoption; note dashboard remains server-fetch.
- `docs/superpowers/plans/` — a short plan file for this change.
- `PRD.md` — only if §8/capability wording implies a fetch mechanism (it should
  not; likely no change). Builder confirms.

## 8. Verification

- `bun run --cwd apps/web test` → 53 pass (same count; render helper swap only).
- `bun run typecheck` → clean.
- `bun run --cwd apps/web build` → 8 routes; `/dashboard` still dynamic,
  `/transactions` still dynamic.
- Live smoke (optional): list loads, detail transition + edit work, dashboard
  still SSR-renders its figures.

## 9. Open questions for the human (none blocking)

None. Decisions taken with the user: list & detail via TanStack; dashboard stays
server-fetched; tests stay green (provider wrapper only).

## 10. Risks

- **Provider required in tests**: if any rendered component calls `useQuery`
  without a provider, TanStack throws. Mitigated by the shared
  `renderWithProviders` helper. Builder call: whether to instead inject a
  provider into a shared setup so *every* `render` gets one (cleaner, but touches
  all test files). Default: explicit helper, minimal blast radius.
- **Retry defaults**: with `retry: false`, an erroring query surfaces on the
  first failure (tests expect this). If defaults retried, the 500-test could
  hang. Builder must set `retry: false` (or assert against it).
- **Detail behavior drift**: the history-append and 409-passthrough must be
  preserved exactly; covered by existing tests.
