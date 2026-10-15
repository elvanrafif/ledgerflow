# LedgerFlow — Deployment guide

Aset deploy siap pakai. Kamu hanya perlu menyambungkannya ke akun platform dan
mengisi environment. **Data yang dipakai untuk demo harus sintetis** — jangan
data nyata.

Repositori ini monorepo (Bun workspaces): API di `apps/api`, web di `apps/web`.

---

## 1. Environment variables

### API (`apps/api`)

| Variabel | Wajib | Contoh produksi | Catatan |
| --- | --- | --- | --- |
| `DATABASE_URL` | ya | `postgresql://user:pass@host:5432/db` | Disediakan platform DB |
| `SESSION_SECRET` | ya | string acak ≥32 karakter | **Jangan** dari repo; generate acak |
| `FRONTEND_ORIGIN` | ya | `https://app-kamu.vercel.app` | Origin web; dipakai untuk CORS + CSRF |
| `COOKIE_CROSS_SITE` | tidak | `true` | Set `true` **hanya** bila web dan API beda origin (mis. `app.example.com` + `api.example.com`); membuat cookie `SameSite=None; Secure`. Biarkan kosong/`false` untuk same-origin. |
| `PORT` | tidak | `4000` | Default 4000 |
| `NODE_ENV` | ya | `production` | Mengaktifkan cookie `Secure` + pesan 500 generik |
| `SEED_USER_PASSWORD` | tidak | — | Hanya bila menjalankan seed demo |

Generate `SESSION_SECRET`:
```sh
openssl rand -base64 48
```

### Web (`apps/web`)

| Variabel | Wajib | Contoh produksi |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | ya | `https://api-kamu.fly.dev/api/v1` |

> `NEXT_PUBLIC_*` di-*inline* saat build, jadi harus diisi **sebelum** build web.

**Penting:** `FRONTEND_ORIGIN` (API) harus sama persis dengan origin web, dan
`NEXT_PUBLIC_API_URL` harus menunjuk ke API. Kalau web di `app.example.com` dan
API di `api.example.com`, request yang mengubah state dari web akan ditolak 403
bila `FRONTEND_ORIGIN` tidak cocok.

**Cross-site (beda origin):** bila web dan API berada di origin berbeda (mis.
`ledgerflow.example.com` + `api-ledgerflow.example.com`), cookie sesi default
(`SameSite=Lax`) **tidak** dikirim pada request lintas-situs, sehingga request
server-side ke API gagal dengan 401. Set `COOKIE_CROSS_SITE=true` di service API
supaya cookie menjadi `SameSite=None; Secure`. Ini hanya aman di atas HTTPS; model
CSRF tetap dijaga oleh pemeriksaan `Origin` (`FRONTEND_ORIGIN`).

Alternatif tanpa ubah kode: sajikan web dan API pada **satu origin** (mis.
`https://app.example.com` untuk web dan `https://app.example.com/api/v1` untuk
API lewat path routing), sehingga `SameSite=Lax` sudah cukup.

---

## 2. Opsi A — API di Docker (Fly.io, Railway, Render, VPS)

`apps/api/Dockerfile` membangun image dari root repo:

```sh
docker build -f apps/api/Dockerfile -t ledgerflow-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://…" \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  -e FRONTEND_ORIGIN="http://localhost:3000" \
  -e NODE_ENV=production \
  ledgerflow-api
```

Image akan menjalankan `prisma migrate deploy` (idempoten) lalu start server.
Seed demo **tidak** dijalankan otomatis.

- **Fly.io** — `fly launch` (deteksi Dockerfile), set secrets via
  `fly secrets set DATABASE_URL=… SESSION_SECRET=… FRONTEND_ORIGIN=…`.
- **Railway/Render** — buat service dari Dockerfile, tambahkan PostgreSQL
  add-on, isi env di dashboard.

## 3. Opsi B — Web di Vercel

`vercel.json` sudah mengatur install/build untuk monorepo:

- Root Directory: **repo root** (bukan `apps/web`).
- Install: `bun install --frozen-lockfile`
- Build: `bun run --cwd apps/web build`
- Output: `apps/web/.next`
- Env: `NEXT_PUBLIC_API_URL` → URL API produksi.

## 4. Migrasi & seed

Sebelum (atau saat) rilis, terapkan migrasi ke DB produksi:

```sh
DATABASE_URL="postgresql://…" bun run db:deploy
```

Seed **demo** (opsional, data sintetis saja):

```sh
DATABASE_URL="postgresql://…" SEED_USER_PASSWORD="demo-password-123" bun run db:seed
```

`db:deploy` memakai `prisma migrate deploy` (aman untuk produksi); `db:migrate`
memakai `migrate dev` dan **hanya** untuk lokal.

---

## 5. Checklist pra-rilis

- [ ] `NODE_ENV=production` di API (cookie `Secure` + error generik aktif).
- [ ] `SESSION_SECRET` acak ≥32 karakter, disimpan di secret manager platform.
- [ ] `FRONTEND_ORIGIN` = origin web produksi (harus persis, termasuk https).
- [ ] `NEXT_PUBLIC_API_URL` = URL API produksi, diisi sebelum build web.
- [ ] DB produksi hanya berisi **data sintetis**.
- [ ] Smoke test pasca-deploy: register → login → create → list → transisi →
      dashboard (lihat `docs/api.md` untuk alur curl).
- [ ] Konfirmasi CORS: request dari origin web berhasil, dari origin lain 403.

## 6. Catatan skala

- **Rate limit in-memory** hanya per-proses. Untuk banyak instance API, ganti
  store ke Redis (lihat `docs/security-review.md` §4).
- **Satu origin** — model CSRF mengandalkan `FRONTEND_ORIGIN` tunggal.
