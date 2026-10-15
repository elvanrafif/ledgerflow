# SOLID Refactor (level sedang) — Rencana Kerja

**Tujuan:** rapikan struktur BE + FE dengan prinsip SOLID, **tanpa mengubah perilaku**.
Level sedang: pisahkan tanggung jawab, jangan pecah per-fungsi.

**Batasan (behavior-preserving):**
- Semua test hijau tiap langkah (28 API + 53 web).
- Tidak ada perubahan URL/route/kontrak API, skema Prisma, atau visual.
- Tidak ada library baru.
- File 250+ baris dipecah. Test hanya boleh diubah import-nya bila perlu.

**Cara verifikasi tiap langkah:** `bun run test` + `bun run typecheck`. Di akhir:
`next build` + verifikasi live (2 server).

---

## Backend (`apps/api`) — SRP + DIP

- [ ] **BE-1: pecah `auth.ts`** → `auth/sessions.ts` (token/cookie/session),
      `auth/guards.ts` (requireAuth/currentUser/protectState/requireOrigin),
      `auth/rate-limit.ts`. Re-export via `auth/index.ts` supaya import lama tetap jalan.
- [ ] **BE-2: pecah `http.ts`** → `http/validation.ts` + `http/cors.ts`. Re-export `http/index.ts`.
- [ ] **BE-3: buat `transactions/repository.ts`** (akses Prisma) dan
      `transactions/service.ts` (aturan bisnis: idempotency, list, edit, changeStatus + lock).
- [ ] **BE-4: rampingkan `routes/transactions.ts` + `routes/transaction-detail.ts`**
      jadi tipis (parse → service → response).
- [ ] **BE-5: `dashboard`** → `dashboard/service.ts` + repository; route tipis.
- [ ] **BE-6: `auth` route** → `auth/service.ts` (register/login/logout) + repository (user/session).
- [ ] **BE-7:** `bun run test` + `typecheck` penuh; commit BE.

## Frontend (`apps/web`) — SRP, hooks dipisah per page

- [ ] **FE-1: `features/auth/use-auth-form.ts`** — logika form login/register;
      pages jadi tipis.
- [ ] **FE-2: `features/dashboard/use-dashboard-summary.ts`** (bila ada fetch klien) +
      pecah view jadi sub-komponen.
- [ ] **FE-3: `features/transactions/use-transaction-list.ts`** — fetch + filter + pagination;
      `TransactionList` pecah jadi sub-komponen (FilterBar/Tabel/Pagination).
- [ ] **FE-4: `features/transactions/use-transaction-detail.ts`** — fetch + transisi + edit + 409;
      `TransactionDetail` pecah jadi sub-komponen (Header/Actions/Description/History).
- [ ] **FE-5: `features/transactions/use-create-transaction.ts`** — form + idempotency key.
- [ ] **FE-6:** `bun run test` + `typecheck` + `next build` penuh; commit FE.

## Penutup

- [ ] Update STATUS.md + PRD bila perlu.
- [ ] Verifikasi live singkat (API + web nyala, dashboard & list render).
