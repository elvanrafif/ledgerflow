# TanStack Query Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-rolled client-side data fetching in the transaction list and detail with TanStack Query, behavior-preserving.

**Architecture:** A `QueryClient` provided at the root layout. The list uses `useQuery` (cache + loading/error) mapped back onto the existing `loading | error | ready` state so the presentational components do not change. The detail keeps its local render state (the timeline is assembled client-side) and switches its two writes to `useMutation`. Tests get a `renderWithProviders` helper; no assertions change.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, `@tanstack/react-query` v5, Vitest + Testing Library + MSW v3, Bun.

**Spec:** `docs/superpowers/specs/2026-10-16-tanstack-query-design.md`

## Global Constraints

- **Behavior-preserving.** Same screens, same API calls, same user-visible states. 53 web tests pass; typecheck clean; `next build` serves all 8 routes.
- **New dependency:** `@tanstack/react-query` only (`^5.104.3`, supports React 18/19). No other new libraries.
- **Money stays a string** end-to-end; TanStack must not parse amounts.
- **Do not touch:** the dashboard (`serverFetch`, stays server-rendered), `use-create-transaction`, `use-auth-form`, `lib/api-client.ts`, all `components/` primitives, routes/URLs, `globals.css`, the backend, the Prisma schema.
- **Queries use `retry: false`** so a failing request surfaces on the first attempt (the 500-leak test asserts an immediate error; retries would make it hang).
- **`apiFetch` stays the single source of request behavior** (credentials, 401 redirect, error envelope, `ApiError.message`). Query/mutation functions call it; they do not call `fetch` directly.
- **No assertion rewrites.** Only the render call changes in affected tests.

## Review Focus

- **A query throws without a provider.** Any test or component rendering a `useQuery`/`useMutation` hook must be inside `QueryClientProvider`, or React throws. → pinned by the list and detail test suites running through `renderWithProviders`.
- **Error surfaces on the first failure.** A query with retries would leave the error test pending. → pinned by the existing "surfaces a load failure" (list) and "surfaces a 409" (detail) tests, under `retry: false`.
- **Detail timeline stays client-assembled.** A transition must append exactly one history entry and keep prior history (the API returns the row without history on mutations). → pinned by the detail transition tests (`→ PROCESSING`, terminal confirm, 409).
- **Editing gate preserved.** `editable` and the save flow must still key off the current status (`PENDING` only). → pinned by the detail editing tests.
- **Reload/refetch still wired.** The list error state's "Try again" must still trigger a refetch. → pinned by mapping `reload` onto `refetch` (list test for error state renders the retry; manual live check).

---

## File Structure

**Create:**
- `apps/web/src/lib/query-client.tsx` — `Providers` client component: one `QueryClient`, `QueryClientProvider`. Single responsibility: own the client.
- `apps/web/src/features/transactions/query-keys.ts` — query key factory for transactions (single source of key shape).
- `apps/web/src/test/render.tsx` — `renderWithProviders` test helper (fresh client per call).

**Modify:**
- `apps/web/src/app/layout.tsx` — mount `Providers` around `children`.
- `apps/web/src/features/transactions/use-transaction-list.ts` — `useQuery` + state adapter; same return shape.
- `apps/web/src/features/transactions/use-transaction-detail.ts` — `useMutation` for the two writes; same return shape.
- `apps/web/src/app/(app)/transactions/page.test.tsx` — use `renderWithProviders`.
- `apps/web/src/app/(app)/transactions/[id]/page.test.tsx` — use `renderWithProviders`.
- `apps/web/package.json` — add `@tanstack/react-query`.
- `README.md`, `STATUS.md` — docs.

**Interfaces produced (later tasks rely on these exact names):**
- `Providers({ children }: { children: React.ReactNode })` from `@/lib/query-client`.
- `transactionKeys.list(query: string): readonly ["transactions", "list", string]` and `transactionKeys.detail(id: string): readonly ["transactions", "detail", string]` from `@/features/transactions/query-keys`.
- `renderWithProviders(ui: React.ReactElement): ReturnType<typeof render>` from `@/test/render`.
- `useTransactionList(filters: ListFilters): { state: ListState; reload: () => void }` — **unchanged shape**.
- `useTransactionDetail(initial: TransactionDetailData): { …unchanged fields… }` — **unchanged shape**.

---

### Task 1: Add the library and mount the provider

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/query-client.tsx`
- Modify: `apps/web/src/app/layout.tsx:38-43`

**Interfaces:**
- Consumes: nothing.
- Produces: `Providers({ children })` from `@/lib/query-client`; a root layout that wraps `children` in it.

- [ ] **Step 1: Install the dependency**

Run (from repo root):
```bash
bun add --cwd apps/web @tanstack/react-query@^5.104.3
```
Expected: `@tanstack/react-query` appears under `dependencies` in `apps/web/package.json`; `bun.lock` updated.

- [ ] **Step 2: Create the provider component**

Create `apps/web/src/lib/query-client.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Owns the app's single QueryClient. Created lazily in state so a client is not
 * shared across requests during SSR. Defaults are conservative:
 * - retry: false — a failing request surfaces immediately (the UI shows API
 *   errors directly; no silent retries).
 * - refetchOnWindowFocus: false — no surprise refetch while a demo is on screen.
 * - staleTime: 5s — a short window so navigating back is instant without serving
 *   data that is obviously stale.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5000 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Mount it in the root layout**

Edit `apps/web/src/app/layout.tsx`: import `Providers` and wrap `<body>`'s children.

```tsx
import { Providers } from "@/lib/query-client";
```

```tsx
  return (
    <html lang="en" className={`${uiSans.variable} ${uiMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
```

- [ ] **Step 4: Verify typecheck and build still pass**

Run:
```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web build
```
Expected: typecheck exits 0; build lists all 8 routes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json bun.lock apps/web/src/lib/query-client.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): add TanStack Query and mount a root provider"
```

---

### Task 2: Add the query-key factory and the test render helper

**Files:**
- Create: `apps/web/src/features/transactions/query-keys.ts`
- Create: `apps/web/src/test/render.tsx`

**Interfaces:**
- Consumes: `Providers` from Task 1 (`@/lib/query-client`).
- Produces: `transactionKeys` from `@/features/transactions/query-keys`; `renderWithProviders` from `@/test/render`.

- [ ] **Step 1: Create the query-key factory**

Create `apps/web/src/features/transactions/query-keys.ts`:

```ts
/**
 * Query keys for transactions. Centralized so every hook that reads or
 * invalidates the same data composes the same key. `list` keys include the
 * serialized query string, so each filter combination caches separately.
 */
export const transactionKeys = {
  all: ["transactions"] as const,
  list: (query: string) => ["transactions", "list", query] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
};
```

- [ ] **Step 2: Create the test render helper**

Create `apps/web/src/test/render.tsx`:

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

/**
 * Render a component inside a fresh QueryClient, so tests do not share cache
 * between cases. `retry: false` matches the app default: a failing request
 * surfaces on the first attempt.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
```

Note: `export * from "@testing-library/react"` re-exports `render`, `screen`, etc., so a test can import everything from `@/test/render`. Tests that need only primitives keep importing from `@testing-library/react` unchanged.

- [ ] **Step 3: Verify typecheck**

Run:
```bash
bun run --cwd apps/web typecheck
```
Expected: exits 0 (both `tsconfig.json` and `tsconfig.test.json`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/transactions/query-keys.ts apps/web/src/test/render.tsx
git commit -m "feat(web): add transaction query keys and a query-aware test render helper"
```

---

### Task 3: Rewrite the list hook on `useQuery` (same return shape)

**Files:**
- Modify: `apps/web/src/features/transactions/use-transaction-list.ts`
- Modify: `apps/web/src/app/(app)/transactions/page.test.tsx:1-14` (render import + calls)

**Interfaces:**
- Consumes: `apiFetch` (`@/lib/api-client`), `buildQuery`/`ListFilters` (`@/lib/list-filters`), `TransactionListResponse` (`@/lib/types`), `transactionKeys` (Task 2), `renderWithProviders` (Task 2).
- Produces: `ListState` and `useTransactionList(filters): { state: ListState; reload: () => void }` — **same names and shape as before**.

- [ ] **Step 1: Run the existing list test to see it pass first (baseline)**

Run:
```bash
bun run --cwd apps/web test src/app/\(app\)/transactions/page.test.tsx
```
Expected: 6 tests PASS. (This is the behavior we must preserve.)

- [ ] **Step 2: Rewrite the hook**

Replace `apps/web/src/features/transactions/use-transaction-list.ts` with:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { buildQuery, type ListFilters } from "@/lib/list-filters";
import { transactionKeys } from "./query-keys";
import type { TransactionListResponse } from "@/lib/types";

/** The list's view state as a small state machine (no half-loaded screens). */
export type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: TransactionListResponse };

/**
 * Fetch the transaction page described by `filters`. TanStack Query owns the
 * request lifecycle and cache; this hook maps its state onto the same
 * `loading | error | ready` shape the list UI already renders, so no
 * presentational component changes.
 */
export function useTransactionList(filters: ListFilters): { state: ListState; reload: () => void } {
  const query = buildQuery(filters);
  const result = useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => apiFetch<TransactionListResponse>(`/transactions?${query}`),
  });

  const state: ListState = result.isPending
    ? { kind: "loading" }
    : result.isError
      ? {
          kind: "error",
          message: result.error instanceof ApiError ? result.error.message : "Could not load transactions",
        }
      : { kind: "ready", data: result.data };

  return { state, reload: () => void result.refetch() };
}
```

- [ ] **Step 3: Point the list test at the provider-aware render**

In `apps/web/src/app/(app)/transactions/page.test.tsx`:
- Replace `import { render, screen } from "@testing-library/react";` with
  `import { renderWithProviders as render, screen } from "@/test/render";`
- Leave every `render(...)` call and every assertion unchanged.

- [ ] **Step 4: Run the list test**

Run:
```bash
bun run --cwd apps/web test src/app/\(app\)/transactions/page.test.tsx
```
Expected: 6 tests PASS (unchanged behavior).

- [ ] **Step 5: Typecheck**

Run:
```bash
bun run --cwd apps/web typecheck
```
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/transactions/use-transaction-list.ts apps/web/src/app/\(app\)/transactions/page.test.tsx
git commit -m "refactor(web): fetch the transaction list with useQuery"
```

---

### Task 4: Move the detail's writes to `useMutation` (same return shape)

**Files:**
- Modify: `apps/web/src/features/transactions/use-transaction-detail.ts`
- Modify: `apps/web/src/app/(app)/transactions/[id]/page.test.tsx:1-14` (render import)

**Interfaces:**
- Consumes: `apiFetch`/`ApiError` (`@/lib/api-client`), `isConsequential`/`isEditable`/`permittedTransitions` (`@/lib/transitions`), `TransactionDetailData`/`TransactionStatus` (`@/lib/types`), `transactionKeys` (Task 2), `renderWithProviders` (Task 2).
- Produces: `useTransactionDetail(initial)` — **same returned fields** as before: `current`, `error`, `moves`, `editable`, `pending`, `busy`, `description`, `setDescription`, `editing`, `setEditing`, `saveBusy`, `requestTransition`, `confirmTransition`, `cancelTransition`, `saveDescription`, `cancelEdit`.

- [ ] **Step 1: Run the existing detail test (baseline)**

Run:
```bash
bun run --cwd apps/web test src/app/\(app\)/transactions/\[id\]/page.test.tsx
```
Expected: all PASS.

- [ ] **Step 2: Rewrite the hook**

Replace `apps/web/src/features/transactions/use-transaction-detail.ts` with:

```ts
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { isConsequential, isEditable, permittedTransitions } from "@/lib/transitions";
import { transactionKeys } from "./query-keys";
import type { TransactionDetail as TransactionDetailData, TransactionStatus } from "@/lib/types";

/**
 * Detail state machine. TanStack Query owns the two write lifecycles
 * (transition, description edit) as mutations; the rendered copy stays in local
 * state because the status history is assembled client-side (the API returns the
 * row without history on mutations). Surfaces API errors — notably a 409 when the
 * status changed in another tab — instead of swallowing them.
 */
export function useTransactionDetail(initial: TransactionDetailData) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<TransactionStatus | null>(null);

  const [description, setDescription] = useState(initial.description);
  const [editing, setEditing] = useState(false);

  const moves = permittedTransitions(current.status);

  const transition = useMutation({
    mutationFn: (next: TransactionStatus) =>
      apiFetch<{ transaction: TransactionDetailData }>(`/transactions/${current.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: (response, next) => {
      // The API returns the row without history; keep existing history and append.
      setCurrent((prev) => ({
        ...prev,
        ...response.transaction,
        history: [
          ...prev.history,
          { previousStatus: prev.status, status: next, note: null, changedById: "", createdAt: new Date().toISOString() },
        ],
      }));
      setPending(null);
      // The list may now show a different status for this row.
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (caught) => {
      // A 409 means the status changed elsewhere; surface it, do not swallow it.
      setError(caught instanceof ApiError ? caught.message : "Could not change the status");
      setPending(null);
    },
    onMutate: () => setError(null),
  });

  const save = useMutation({
    mutationFn: (nextDescription: string) =>
      apiFetch<{ transaction: TransactionDetailData }>(`/transactions/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: nextDescription.trim() }),
      }),
    onSuccess: (response) => {
      setCurrent((prev) => ({ ...prev, ...response.transaction, history: prev.history }));
      setEditing(false);
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not save the description");
    },
    onMutate: () => setError(null),
  });

  /** Terminal moves ask for confirmation first; others apply immediately. */
  function requestTransition(next: TransactionStatus) {
    setError(null);
    if (isConsequential(next)) {
      setPending(next);
      return;
    }
    transition.mutate(next);
  }

  function saveDescription(event: React.FormEvent) {
    event.preventDefault();
    save.mutate(description);
  }

  function cancelEdit() {
    setDescription(current.description);
    setEditing(false);
  }

  return {
    current,
    error,
    moves,
    editable: isEditable(current.status),
    pending,
    busy: transition.isPending,
    description,
    setDescription,
    editing,
    setEditing,
    saveBusy: save.isPending,
    requestTransition,
    confirmTransition: () => pending !== null && transition.mutate(pending),
    cancelTransition: () => setPending(null),
    saveDescription,
    cancelEdit,
  };
}
```

- [ ] **Step 3: Point the detail test at the provider-aware render**

In `apps/web/src/app/(app)/transactions/[id]/page.test.tsx`:
- Replace `import { render, screen, within } from "@testing-library/react";` with
  `import { renderWithProviders as render, screen, within } from "@/test/render";`
- Leave every `render(...)` call and every assertion unchanged.

- [ ] **Step 4: Run the detail test**

Run:
```bash
bun run --cwd apps/web test src/app/\(app\)/transactions/\[id\]/page.test.tsx
```
Expected: all PASS (unchanged behavior, including the 409 and terminal-confirm cases).

- [ ] **Step 5: Typecheck**

Run:
```bash
bun run --cwd apps/web typecheck
```
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/transactions/use-transaction-detail.ts apps/web/src/app/\(app\)/transactions/\[id\]/page.test.tsx
git commit -m "refactor(web): run detail writes through useMutation"
```

---

### Task 5: Full verification and docs

**Files:**
- Modify: `README.md` (Stack + Architecture)
- Modify: `STATUS.md` (record adoption)

**Interfaces:**
- Consumes: everything above.
- Produces: a green workspace and updated docs.

- [ ] **Step 1: Full web suite**

Run:
```bash
bun run --cwd apps/web test
```
Expected: **10 files / 53 tests PASS** (same counts as before the change).

- [ ] **Step 2: Whole-workspace test + typecheck**

Run (from repo root):
```bash
bun run test
bun run typecheck
```
Expected: API 28 + web 53 pass; both typechecks exit 0.

- [ ] **Step 3: Production build**

Run:
```bash
bun run --cwd apps/web build
```
Expected: 8 routes; `/dashboard` still **ƒ (Dynamic)**, `/transactions` still **ƒ (Dynamic)**.

- [ ] **Step 4: Update README**

In `README.md`:
- Stack list: add a line `- TanStack Query for client-side data fetching (list & detail)`.
- Architecture section (Web bullets): add a sentence — the transaction list and detail fetch client-side via **TanStack Query** (`useQuery` / `useMutation`), while the **dashboard stays server-rendered** through `serverFetch`.

- [ ] **Step 5: Update STATUS.md**

In `STATUS.md`:
- Add a short entry under the current situation: the web app's client data fetching now uses TanStack Query (list `useQuery`, detail `useMutation`); the dashboard remains server-fetched; 53 web tests still pass.
- If a "Stack"/"Repo map" line lists web libs, note `@tanstack/react-query` there.

- [ ] **Step 6: Commit**

```bash
git add README.md STATUS.md
git commit -m "docs: record TanStack Query adoption for client data fetching"
```

---

### Task 6: Commit the spec and plan

**Files:**
- The spec and this plan.

- [ ] **Step 1: Commit the documents**

```bash
git add docs/superpowers/specs/2026-10-16-tanstack-query-design.md docs/superpowers/plans/2026-10-16-tanstack-query.md
git commit -m "docs: add TanStack Query design and implementation plan"
```

---

## Self-Review

**1. Spec coverage** (spec §5):
- §5.1 Provider → Task 1. ✓
- §5.2 Query keys + query function → Task 2 (keys) + Task 3 (`apiFetch` in `queryFn`). ✓
- §5.3 List via `useQuery` + state adapter, same surface → Task 3. ✓
- §5.4 Detail via `useMutation`, same surface, history-append + 409 preserved → Task 4. ✓
- §5.5 Tests via `renderWithProviders`, no assertion rewrites → Task 2 (helper) + Tasks 3,4 (swap). ✓
- §7 Docs → Task 5. ✓
- §8 Verification → Task 5 steps 1-3. ✓
- Non-goals (§3): dashboard untouched (no task touches it), create/auth forms untouched (no task touches them). ✓

**2. Step scan:** Each step is one action with a checkable result. Code steps give the exact file and either the full body (where the interface alone would not determine it — e.g. the state adapter mapping, the mutation `onSuccess` history append) or the exact signature with the spec's pinned values (the query-key factory, the helper shell). No "handle edge cases" style lines.

**3. Type consistency:** `ListState` and `useTransactionList` keep the same names/shape (Task 3 ↔ Task 3 consumers). `useTransactionDetail`'s returned field names match the original hook exactly (Task 4). `transactionKeys.list(query)` / `.detail(id)` are used identically in Task 3 and Task 4. `renderWithProviders` used identically in Tasks 3 and 4.

**4. Review Focus:** Each of the five lines has an owning test: provider-throw → Task 3/Task 4 suites via helper; first-failure error → list "surfaces a load failure" (Task 3) + detail "409" (Task 4); timeline append → Task 4 transition tests; editing gate → Task 4 editing tests; reload wiring → Task 3 error-state render (manual live check noted in spec §8). ✓

**5. Proportion:** Plan is comparable in length to the spec; code blocks are the two hook rewrites (whose bodies the interfaces do not determine) plus small factories. No transcript of the presentational components, which do not change.
