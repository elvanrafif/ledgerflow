# Milestone 5 — Release (Rencana Kerja)

Tujuan: siapkan LedgerFlow untuk rilis — audit keamanan, dokumentasi, bukti
kualitas, dan aset deployment. Dikerjakan bertahap, **tanpa mengubah perilaku
aplikasi**.

## A. Security pass (PRD §11) — tanpa kredensial

- [x] Audit CORS / CSRF / Origin, cookies, rate limiting, secrets, logging.
- [x] Periksa dependency advisory (`bun audit`) dan nilai eksposurnya.
- [x] Tulis temuan ke `docs/security-review.md` (status + risiko + tindakan).

## B. Dokumentasi — tanpa kredensial

- [x] Tambah `.env.example` (API + web) agar setup jelas dan tidak menaruh secret.
- [x] Perbarui `README.md`: arsitektur, fitur, setup, batasan, contoh API,
      status frontend (bukan lagi "planned").
- [x] Tulis `docs/api.md`: contoh request/response tiap endpoint.

## C. Bukti kualitas — tanpa kredensial

- [x] Jalankan ulang test + typecheck + `next build` di kondisi bersih.
- [ ] (Opsional) CI: workflow GitHub Actions menjalankan test + typecheck.

## D. Deployment + aset (butuh keputusan/kredensial user)

- [ ] Pilih platform; siapkan config (Dockerfile/`vercel.json`/env produksi).
- [ ] Deploy dengan **data sintetis saja**; tulis demo URL.

## E. Rilis visual (butuh user)

- [ ] Screenshot halaman kunci + demo walkthrough.
- [ ] Visual pass manual mobile + desktop di browser nyata.

## Catatan

- Bagian A–C selesai tanpa kredensial. D menunggu keputusan platform, E menunggu
  akses browser user.
