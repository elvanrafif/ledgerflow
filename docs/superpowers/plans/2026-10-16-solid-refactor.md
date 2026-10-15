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

- [x] **BE-1: pecah `auth.ts`** → `auth/sessions.ts` (token/cookie/session),
      `auth/guards.ts` (requireAuth/currentUser/protectState/requireOrigin),
      `auth/rate-limit.ts`. Re-export via `auth/index.ts` supaya import lama tetap jalan.
- [x] **BE-2: pecah `http.ts`** → `http/validation.ts` + `http/cors.ts`. Re-export `http/index.ts`.
- [x] **BE-3: buat `transactions/repository.ts`** (akses Prisma) dan
      `transactions/service.ts` (aturan bisnis: idempotency, list, edit, changeStatus + lock).
- [x] **BE-4: rampingkan `routes/transactions.ts` + `routes/transaction-detail.ts`**
      jadi tipis (parse → service → response).
- [x] **BE-5: `dashboard`** → `dashboard/service.ts` + repository; route tipis.
- [x] **BE-6: `auth` route** → `auth/service.ts` (register/login/logout) + repository (user/session).
- [x] **BE-7:** `bun run test` + `typecheck` penuh; commit BE.

## Frontend (`apps/web`) — SRP, hooks dipisah per page

- [x] **FE-1: `features/auth/use-auth-form.ts`** — logika form login/register;
      pages jadi tipis.
- [x] **FE-2: `features/dashboard/use-dashboard-summary.ts`** (bila ada fetch klien) +
      pecah view jadi sub-komponen.
- [x] **FE-3: `features/transactions/use-transaction-list.ts`** — fetch + filter + pagination;
      `TransactionList` pecah jadi sub-komponen (FilterBar/Tabel/Pagination).
- [x] **FE-4: `features/transactions/use-transaction-detail.ts`** — fetch + transisi + edit + 409;
      `TransactionDetail` pecah jadi sub-komponen (Header/Actions/Description/History).
- [x] **FE-5: `features/transactions/use-create-transaction.ts`** — form + idempotency key.
- [x] **FE-6:** `bun run test` + `typecheck` + `next build` penuh; commit FE.

## Penutup

- [x] Update STATUS.md + PRD bila perlu.
- [x] Verifikasi live singkat (API + web nyala, dashboard & list render).

## Hasil

**Backend** — `auth.ts` (126 baris) → `auth/{sessions,guards,rate-limit}.ts` +
`auth/{service,user-repository}.ts`; `http.ts` → `http/{validation,cors}.ts`;
`transactions/` baru berisi `repository.ts`, `service.ts`, `amount.ts` (aturan
idempotency, edit, dan lock status pindah dari route ke service). Route tinggal
transport tipis dan **tidak ada lagi yang impor Prisma**.

**Frontend** — `features/` baru: `auth/use-auth-form.ts`,
`dashboard/{DashboardHeading,CurrencyTotalsCard,StatusBreakdown}`,
`transactions/` berisi 5 hook + 9 komponen presentasional. Halaman jadi komposisi
tipis; `transaction-list.tsx` 286 → ~45 baris, `transaction-detail.tsx`
256 → ~45. Tak ada file > ~104 baris.

**Verifikasi** — 81 test hijau (28 API + 53 web), typecheck bersih,
`next build` 8 route, dan smoke test live (register → create → replay idempotent
→ list/detail → transisi → dashboard) semua benar. Perilaku tak berubah.

