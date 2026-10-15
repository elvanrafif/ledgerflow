# LedgerFlow — Security review (Milestone 5)

Audit terhadap PRD §11. Ditulis dari kode dan konfigurasi yang ada di repo pada
commit `acc818c`; tanggal 2026-10-16. **Tidak ada rahasia** yang dikutip di sini.

## 1. Ringkasan

Kontrol keamanan inti sudah ada dan terverifikasi lewat test. Dua temuan sisa
keduanya **dependency advisory** dengan eksposur produksi rendah; tidak ada
kerentanan kode aplikasi yang ditemukan.

| Area | Status | Catatan |
| --- | --- | --- |
| CORS | OK | Origin di-whitelist; hanya `FRONTEND_ORIGIN` yang diizinkan |
| CSRF / Origin | OK | Setiap request yang mengubah state wajib `Origin` cocok |
| Session cookie | OK | `HttpOnly`, `SameSite=Lax`, `Secure` di produksi, `Path=/` |
| Password | OK | bcryptjs cost 12; pesan login generik (tidak membocorkan akun) |
| Rate limiting | OK (dengan catatan) | In-memory, key per-IP; lihat §4 |
| Validasi input | OK | Semua body/query lewat Zod; error konsisten |
| Kebocoran internal | OK | 500 tidak menampilkan detail di produksi |
| Secrets | OK | `.env` di-*gitignore*; tidak ada secret di repo |
| Dependency | 1 advisory (dev-only) | postcss diperbaiki; sisa deepmerge-ts (dev-only). Lihat §3 |

## 2. Kontrol yang terverifikasi

- **CSRF/Origin** — `requireFrontendOrigin` menolak request dengan `Origin` yang
  tidak sama, termasuk request tanpa `Origin` (403 `ORIGIN_FORBIDDEN`). Terpasang
  di `app.ts` untuk semua method non-GET/HEAD, dan ulang di route auth.
- **Cookie sesi** — `HttpOnly` + `SameSite=Lax`; `Secure` aktif bila
  `NODE_ENV=production`. Token sesi di-hash `HMAC-SHA256` sebelum disimpan, jadi
  DB tidak menyimpan token mentah.
- **Otorisasi** — semua query transaksi ter-scope `userId`; kepemilikan adalah
  bagian dari query (bukan cek terpisah), sehingga tidak ada jalur IDOR.
- **Idempotency** — dijaga `@@unique([userId, idempotencyKey])` di level DB; race
  paralel diselesaikan lewat fallback P2002, bukan asumsi aplikasi.
- **Uang** — `Decimal(18,2)`; jumlah tidak pernah diparse ke float untuk
  formatting; mata uang tidak pernah dicampur (ditotal per mata uang).
- **Error** — bentuk konsisten `{ error: { code, message, details? } }`; pada
  produksi pesan 500 diganti generik, detail hanya di-log server-side.
- **Validasi** — `parseBody`/`parseQuery` memakai Zod; input non-numerik pada
  `amount` → 400 `VALIDATION_ERROR` (bukan 500).

## 3. Dependency advisory (`bun audit`)

Saat audit awal: **5 advisory (3 high, 2 moderate)** dari 2 paket. Setelah
tindakan di bawah: **1 advisory (1 high, dev-only)**.

1. **postcss ≤8.5.x** (via `next@15.5.28` → `postcss@8.4.31`). **Sudah diperbaiki.**
   - Sifat: PostCSS, hanya dipakai **saat build**. Advisory butuh input CSS yang
     dikendalikan penyerang (`sourceMappingURL`, `</style>`).
   - Eksposur di sini: **rendah** — CSS kita sendiri, bukan input pengguna; tidak
     ada PostCSS saat runtime.
   - Tindakan: menambahkan `overrides: { "postcss": "^8.5.30" }` di root
     `package.json`; `bun audit` tidak lagi melaporkan postcss. Test, typecheck,
     dan `next build` tetap hijau.

2. **deepmerge-ts 7.1.5** (via `prisma` CLI → `@prisma/config`). **Eksposur nol di produksi.**
   - Sifat: stack exhaustion saat merge objek rekursif.
   - Eksposur di sini: tidak ada di runtime — `prisma` adalah **devDependency**
     (CLI/generate/migrate), bukan bagian runtime API. Yang dikirim ke produksi
     hanya `@prisma/client`.
   - Tindakan: bump saat keluar versi aman (≥8); dampak produksi nihil, jadi
     prioritas rendah.

## 4. Catatan / batasan yang diakui

- **Rate limit in-memory** hanya berlaku per-proses. Bila API di-scale ke banyak
  instance, limit tidak terkoordinasi; untuk produksi multi-instance gunakan store
  bersama (Redis). Sudah didokumentasikan di `auth/rate-limit.ts`.
- **Origin tunggal** — desain mengasumsikan web dan API di satu origin yang
  dikenal (atau satu origin frontend). Deploy multi-origin butuh skema token CSRF.
- Rate limit default auth: 10 percobaan / 15 menit per IP; write transaksi: 60 /
  menit.

## 5. Tindakan yang direkomendasikan (belum dikerjakan)

- [x] Bump `postcss` ke ≥8.5.30 (selesai lewat override; audit bersih).
- [ ] Bump `deepmerge-ts` bila keluar versi ≥8 (dev-only, prioritas rendah).
- [x] Hapus direktori sisa `node_modules/.old_modules-*` (selesai).
- [ ] Sebelum deploy: pastikan `NODE_ENV=production` dan `SESSION_SECRET` acak
      ≥32 karakter di environment platform (bukan dari repo).
