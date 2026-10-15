# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the LedgerFlow Next.js frontend covering PRD §8 pages, wired to
the existing API, with complete loading/empty/error states.

**Architecture:** Next.js App Router with TypeScript in `apps/web`, added to the
existing Bun workspace. A single centralized API client owns all fetches and
sends credentials; a small component library carries the visual language.
Server Components fetch initial data, Client Components own forms and
interactions. Authorization stays on the API: the frontend mirrors rules for
feedback only.

**Tech Stack:** Next.js (App Router), TypeScript, Bun workspace, Vitest +
React Testing Library.

**Spec:** `PRD.md` (§8 pages, §12 frontend testing, §13 non-functional).

**Status:** Not started. Blocked on the two prerequisites below.

## Global Constraints

- Money is `DECIMAL(18,2)` on the API and serialized as a **string**. Never do
  arithmetic on amounts in the frontend.
- All API calls go to `/api/v1/*` with `credentials: "include"`.
- State-changing requests (POST, PATCH) must send an `Origin` header matching
  `FRONTEND_ORIGIN`; the browser sets this automatically for same-site requests.
- `POST /transactions` requires an `Idempotency-Key` header, unique per submit
  attempt, reused on retry of the same payload.
- Only `IDR`, `USD`, `SGD` are valid currencies.
- Only `PENDING -> PROCESSING|FAILED`, `PROCESSING -> COMPLETED|FAILED` are
  permitted; `COMPLETED` and `FAILED` are terminal.
- Never display a currency total that mixes currencies.
- No fabricated data anywhere in the UI (PRD §14: synthetic data only). Empty
  states say why they are empty and what to do next.

## Prerequisites (blocking)

Both must be resolved before Task 1. See `STATUS.md` for current state.

- **antislop usage mode.** Installed at `~/.agents/skills/antislop` (v3.2.20).
  No saved preference, so the mode question is asked each session until the user
  runs `npx antislop-ai --mode during` (or `after`).
- **Design direction (`DESIGN.md`).** antislop R-37 requires direction before
  building UI. Without it, output must be labelled *"draft without direction"*
  with dials ENERGY 1 / RHYTHM 1 / MOTION 1 and is not shippable. `DESIGN.md`
  must exist at the repo root. The user authors it; the agent only transcribes
  the user's answers.

## Review Focus

These are the failure modes most likely to bite, in order. Each gets a test in
the task that owns the code.

1. **Amount rendering.** The API returns `"1500000.00"` as a string. Parsing it
   into a JS number for display can lose precision on large IDR values; format
   the string directly.
2. **Currency mixing.** The dashboard groups totals by currency. Concatenating
   them into one number would imply conversion that does not exist.
3. **Idempotency on retry.** A user retrying a failed submit must reuse the same
   `Idempotency-Key`, or the API creates a duplicate transaction.
4. **Status rule drift.** Hiding a disallowed transition button is not
   authorization; the API rejects it. The UI must still surface the rejection
   clearly instead of silently ignoring it.
5. **Expired session.** A 401 from any endpoint mid-session must redirect to
   `/login` rather than leaving a half-broken page.

---

### Task 1: Web app foundation and API client

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`
- Create: `apps/web/src/lib/api-client.ts`
- Test: `apps/web/src/lib/api-client.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `apiFetch<T>(path: string, options?: ApiRequestOptions): Promise<T>`
  where `ApiRequestOptions` extends `RequestInit` with an optional
  `idempotencyKey?: string`. Throws `ApiError { status: number; code: string;
  message: string; details?: unknown }` on non-2xx. `ApiError` is exported for
  callers and tests.

- [ ] **Step 1: Scaffold the workspace app**

Add `apps/web` to the Bun workspace (root `package.json` already globs `apps/*`).
Set the `dev:web` root script to `bun run --cwd apps/web dev`.

- [ ] **Step 2: Write the failing test for the API client**

```ts
it("sends credentials and surfaces the API error shape", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await expect(apiFetch("/auth/me")).rejects.toMatchObject({
    status: 401,
    code: "UNAUTHENTICATED",
  });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/v1/auth/me"),
    expect.objectContaining({ credentials: "include" }),
  );
});

it("attaches the idempotency key only when given one", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await apiFetch("/transactions", { method: "POST", idempotencyKey: "key-1", body: "{}" });
  const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
  expect(headers["Idempotency-Key"]).toBe("key-1");
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `apiFetch` is not defined.

- [ ] **Step 4: Implement the API client**

Wrap `fetch` with `credentials: "include"`, base URL from
`NEXT_PUBLIC_API_URL` defaulting to `http://localhost:4000/api/v1`, JSON content
type on bodied requests, and `Idempotency-Key` only when the caller passes it.
On non-2xx, parse the `{ error: { code, message, details } }` envelope into
`ApiError`. Redirect to `/login` on 401 from any path except the auth endpoints.

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js app with a centralized API client"
```

---

### Task 2: Visual foundation

**Files:**
- Create: `apps/web/src/app/globals.css` (or the chosen styling layer)
- Create: `apps/web/src/components/` (design primitives)
- Test: `apps/web/src/components/*.test.tsx`

**Interfaces:**
- Consumes: `DESIGN.md` (palette, typography, dials).
- Produces: `<StatusBadge status=.../>`, `<Amount value=... currency=.../>`,
  `<Button/>`, `<Field/>` (label + input + error), `<EmptyState/>`,
  `<LoadingState/>`, `<ErrorState/>`.

**Note:** this task cannot start until `DESIGN.md` exists. Every visual decision
must trace to it (antislop R-31).

- [x] **Step 1: Write the failing test for `Amount`**

```tsx
it("formats a string amount without parsing it into a float", () => {
  render(<Amount value="1500000.00" currency="IDR" />);
  expect(screen.getByText(/1\.500\.000,00/)).toBeInTheDocument();
});

it("never adds two different currencies together", () => {
  render(<Amount value="25.50" currency="USD" />);
  expect(screen.getByText(/\$25\.50|USD\s*25\.50/)).toBeInTheDocument();
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `Amount` is not defined.

- [x] **Step 3: Implement the primitives**

Format amounts from the string, splitting integer and fraction parts before
localization so precision is never lost. Every primitive has a visible focus
state and keyboard support (antislop R-32).

- [x] **Step 4: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add design primitives including precise amount formatting"
```

---

### Task 3: Authentication pages

**Files:**
- Create: `apps/web/src/app/login/page.tsx`, `apps/web/src/app/register/page.tsx`
- Test: `apps/web/src/app/login/page.test.tsx`, `register/page.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, primitives.
- Produces: working `/login` and `/register` that establish the session cookie
  and redirect to `/dashboard`.

- [x] **Step 1: Write the failing test**

```tsx
it("shows field-level validation errors returned by the API", async () => {
  server.use(http.post("*/api/v1/auth/register", () =>
    HttpResponse.json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: { email: ["Invalid email"] } } }, { status: 400 })));

  render(<RegisterPage />);
  await userEvent.type(screen.getByLabelText(/email/i), "bad");
  await userEvent.click(screen.getByRole("button", { name: /create account/i }));

  expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `RegisterPage` is not defined.

- [x] **Step 3: Implement both pages**

Client Components. Labels are real `<label>` elements tied to inputs (antislop
R-32). Errors come from the API's `details` field. Successful auth redirects to
`/dashboard`; an already-authenticated visitor is redirected away from these
pages.

- [x] **Step 4: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add login and register pages"
```

---

### Task 4: Dashboard summary

**Files:**
- Create: `apps/web/src/app/dashboard/page.tsx`
- Test: `apps/web/src/app/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/dashboard/summary` returning
  `{ total, byStatus, totalsByCurrency }`.
- Produces: a dashboard where the primary focus is the per-currency totals,
  since mixing them is the failure the API prevents.

- [x] **Step 1: Write the failing test**

```tsx
it("lists each currency total separately and never sums them", async () => {
  render(await DashboardPage());
  expect(screen.getByText(/IDR/)).toBeInTheDocument();
  expect(screen.getByText(/USD/)).toBeInTheDocument();
  expect(screen.queryByText(/1\.500\.025/)).not.toBeInTheDocument();
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `DashboardPage` is not defined.

- [x] **Step 3: Implement the dashboard**

Leading with totals per currency, counts by status secondary. Empty state names
the action that fills it.

- [x] **Step 4: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add dashboard summary"
```

---

### Task 5: Transaction list

**Files:**
- Create: `apps/web/src/app/transactions/page.tsx`
- Test: `apps/web/src/app/transactions/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/transactions?page&pageSize&status&search&sort`.
- Produces: a filterable, sortable, paginated list with real URL state.

- [x] **Step 1: Write the failing test**

```tsx
it("keeps filters in the URL so the view is shareable and reloadable", async () => {
  render(<TransactionList searchParams={{ status: "FAILED", page: "2" }} />);
  expect(await screen.findByRole("combobox", { name: /status/i })).toHaveValue("FAILED");
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `TransactionList` is not defined.

- [x] **Step 3: Implement the list**

Filters, search, sort and page live in the URL. Columns come from the decision
the reader makes here: status, amount, currency, description, created. Loading,
empty (no rows vs. no matches, which read differently), and error states.

- [x] **Step 4: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add transaction list with URL-driven filters"
```

---

### Task 6: Create transaction

**Files:**
- Create: `apps/web/src/app/transactions/new/page.tsx`
- Test: `apps/web/src/app/transactions/new/page.test.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/transactions` with `Idempotency-Key`.
- Produces: a create form that reuses one idempotency key across retries.

- [x] **Step 1: Write the failing test**

```tsx
it("reuses the same idempotency key when a submit is retried", async () => {
  // First submit fails at the network layer, the retry succeeds.
  render(<NewTransactionPage />);
  await fillValidForm();
  await submit();          // network error
  await submit();          // retry

  const keys = capturedKeys();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `NewTransactionPage` is not defined.

- [x] **Step 3: Implement the form**

Generate one idempotency key per payload; regenerate only when the payload
changes. Client-side validation is for feedback only, amounts are sent as
strings.

- [x] **Step 4: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add transaction creation form with idempotent retries"
```

---

### Task 7: Transaction detail, edit, and transitions

**Files:**
- Create: `apps/web/src/app/transactions/[id]/page.tsx`
- Test: `apps/web/src/app/transactions/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `GET /:id`, `PATCH /:id`, `POST /:id/status`.
- Produces: detail view with status history timeline, description editing while
  PENDING, and transition controls for permitted moves only.

- [ ] **Step 1: Write the failing test**

```tsx
it("offers only permitted transitions and confirms before a terminal move", async () => {
  render(<TransactionDetail transaction={pendingTransaction()} />);
  expect(screen.getByRole("button", { name: /processing/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /failed/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /completed/i })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /failed/i }));
  expect(screen.getByRole("dialog")).toHaveTextContent(/cannot be undone/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run --cwd apps/web test`
Expected: FAIL, `TransactionDetail` is not defined.

- [ ] **Step 3: Implement the detail view**

History timeline shows previous status, new status, and when. Terminal moves
require confirmation. A 409 from the API is surfaced, not swallowed, since the
status may have changed in another tab.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run --cwd apps/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add transaction detail, editing, and transitions"
```

---

### Task 8: Run the app and verify every control

Per antislop R-35 and PRD §14. A design that has never been run is not finished.

- [ ] **Step 1: Run both apps against real PostgreSQL**

```sh
docker compose up -d
bun run db:generate && bun run db:migrate && bun run db:seed
bun run dev:api & bun run dev:web
```

- [ ] **Step 2: Click through every interactive element, one at a time**

Record the result for each: register, login, logout, dashboard load, list
filter/search/sort/paginate, create, edit, each transition, confirmation dialog
(Escape closes), mobile menu, keyboard-only pass, and each theme if a toggle
ships. Note any console error.

- [ ] **Step 3: Verify at mobile and desktop widths**

Confirm no horizontal overflow and that tap targets are at least 44px
(antislop R-03).

- [ ] **Step 4: Commit the recorded click-through**

```bash
git add apps/web
git commit -m "test(web): record click-through verification for all controls"
```

---

## Self-Review

- **Spec coverage:** PRD §8 pages map to Tasks 3 (login/register), 4 (dashboard),
  5 (list), 6 (new), 7 (detail). The API client and primitives are Tasks 1-2;
  the click-through is Task 8.
- **Type consistency:** `apiFetch` and `ApiError` are defined in Task 1 and used
  unchanged in Tasks 3-7. `Amount` takes `value: string`, matching the API's
  string serialization.
- **Review Focus coverage:** amount precision (Task 2), currency mixing (Task 4),
  idempotent retry (Task 6), transition drift (Task 7), expired session (Task 1).
