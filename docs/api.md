# LedgerFlow API

Base URL: `/api/v1`. Semua endpoint mengembalikan JSON. **Uang selalu berupa
string** (mis. `"1500000.00"`), tidak pernah angka float.

Autentikasi memakai cookie sesi (`ledgerflow.sid`, `HttpOnly`). Semua request yang
**mengubah state** (POST/PATCH) wajib mengirim header `Origin` yang sama dengan
`FRONTEND_ORIGIN`; tanpa itu respons `403 ORIGIN_FORBIDDEN`.

Bentuk error konsisten:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { "field": ["..."] } } }
```

`details` hanya ada untuk error validasi.

---

## Health

### `GET /health`
Cek liveness + koneksi DB.

```json
{ "status": "ok" }
```

---

## Auth

### `POST /auth/register`
Buat akun + sesi. `email` dinormalisasi (lowercase) dan unik.

Request:
```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "at-least-12-chars" }
```
- `password`: minimal 12, maksimal 72 byte UTF-8.

Respons `201`:
```json
{ "user": { "id": "…", "name": "Ada Lovelace", "email": "ada@example.com", "createdAt": "2026-10-16T…Z" } }
```
Error: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`, `429 AUTH_RATE_LIMITED`.

### `POST /auth/login`
Buat sesi. Pesan error generik supaya tidak membocorkan apakah email terdaftar.

Request:
```json
{ "email": "ada@example.com", "password": "at-least-12-chars" }
```
Respons `200`: `{ "user": { … } }`. Error: `401 INVALID_CREDENTIALS`, `429`.

### `GET /auth/me`
Profil publik user saat ini. Respons `200`: `{ "user": { … } }`. Error: `401 UNAUTHENTICATED`.

### `POST /auth/logout`
Hapus sesi. Respons `200`: `{ "status": "ok" }`.

---

## Transactions

### `POST /transactions`
Buat transaksi (mulai `PENDING`). Wajib header **`Idempotency-Key`**.

Request:
```json
{ "description": "Invoice #1", "amount": "1500000.00", "currency": "IDR" }
```
- `amount`: string atau number, > 0, maksimal 2 desimal.
- `currency`: `IDR` | `USD` | `SGD`.
- `description`: 1–500 karakter.

Respons:
- `201` — transaksi baru dibuat.
- `200` — **replay**: `(userId, idempotencyKey)` sama dan payload sama → mengembalikan transaksi yang sudah ada.

```json
{ "transaction": { "id": "…", "reference": "TXN-XXXX-YYYY", "description": "Invoice #1",
  "amount": "1500000.00", "currency": "IDR", "status": "PENDING",
  "createdAt": "…", "updatedAt": "…" } }
```
Error: `400 VALIDATION_ERROR` (termasuk `Idempotency-Key` hilang), `409 IDEMPOTENCY_CONFLICT` (key sama, payload beda), `403` (Origin), `429`.

### `GET /transactions`
Daftar milik user, ter-paginasi.

Query: `page` (≥1, default 1), `pageSize` (1–100, default 20), `status`,
`search` (cocok ke `reference`/`description`), `sort` (`createdAt:asc` | `createdAt:desc`, default desc).

```json
{ "transactions": [ { … } ], "page": 1, "pageSize": 20, "total": 1 }
```

### `GET /transactions/:id`
Detail transaksi + riwayat status. Hanya milik sendiri (`404` bila bukan).

```json
{ "transaction": { "…": "…", "history": [
  { "previousStatus": null, "status": "PENDING", "note": null, "changedById": "…", "createdAt": "…" }
] } }
```

### `PATCH /transactions/:id`
Ubah **description saja**, hanya saat `PENDING`. Field terproteksi ditolak (`.strict()`).

Request: `{ "description": "Revisi" }`
Respons `200`: `{ "transaction": { … } }`.
Error: `404`, `409 INVALID_STATUS_FOR_EDIT`.

### `POST /transactions/:id/status`
Ubah status. Transisi yang diizinkan:

- `PENDING → PROCESSING | FAILED`
- `PROCESSING → COMPLETED | FAILED`
- `COMPLETED` / `FAILED` = terminal.

Request: `{ "status": "PROCESSING", "note": "opsional" }` (`status` hanya boleh
`PROCESSING` | `COMPLETED` | `FAILED`).

Perubahan atomik: baris dikunci (`SELECT … FOR UPDATE`), status terbaru dibaca
ulang, satu baris riwayat ditambahkan — aman terhadap request paralel.

Respons `200`: `{ "transaction": { … } }`.
Error: `404`, `409 INVALID_TRANSITION` (mis. `PENDING → COMPLETED`).

---

## Dashboard

### `GET /dashboard/summary`
Total, jumlah per status, dan total per mata uang. **Mata uang tidak pernah dicampur.**

```json
{ "total": 3,
  "byStatus": { "PENDING": 1, "PROCESSING": 1, "COMPLETED": 1, "FAILED": 0 },
  "totalsByCurrency": [ { "currency": "IDR", "total": "1500000.00" },
                        { "currency": "USD", "total": "250.00" } ] }
```

---

## Contoh alur (curl)

```sh
API=http://localhost:4000/api/v1
J=/tmp/lf-cookies.txt

# register (menyimpan cookie sesi)
curl -s -c $J -X POST $API/auth/register -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"name":"Demo","email":"demo@example.com","password":"correct-horse-battery"}'

# create (idempotent)
curl -s -b $J -X POST $API/transactions -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" -H "Idempotency-Key: demo-1" \
  -d '{"description":"Demo tx","amount":"1234.50","currency":"IDR"}'

curl -s -b $J "$API/transactions?page=1&pageSize=5"
curl -s -b $J $API/dashboard/summary
```
