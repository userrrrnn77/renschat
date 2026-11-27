# Acceptance Checklist — Phase 8

Checklist manual. Jalankan terhadap backend yang sedang aktif. Centang
hanya setelah behavior terverifikasi. Item otomatis ditandai `[auto]` bila
sudah dicakup tes di `tests/`.

## Auth
- [ ] Login email/password benar → `authed`, redirect.
- [ ] Login password salah → `401`, pesan "Email atau password salah".
- [ ] Register email baru → akun dibuat, redirect.
- [ ] Register email sudah terdaftar → `409`, pesan "Email sudah terdaftar".
- [ ] Google OAuth: `Continue with Google` → `/api/auth/google`.
- [ ] Access cookie kadaluwarsa (15 menit) → request berikut auto-refresh + retry sekali. `[auto]`
- [ ] Refresh gagal (401) → `unauthorized` event → store clear → redirect login. `[auto]`
- [ ] Beberapa request paralel saat access expired → satu refresh (single-flight). `[auto]`
- [ ] Body non-reusable (streaming POST) tidak di-retry; 401 dibiarkan. `[auto]`
- [ ] Logout → cookie dihapus, kembali ke login.
- [ ] `logout-all` → sesi lain ter-logout.

## Chat & streaming (SSE)
- [ ] Kirim pesan baru di sesi kosong → `message.start`, blok text delta streaming, `message.end` status `done`.
- [ ] Kirim pesan dengan lampiran → `attachmentIds` terkirim, pesan user tampil dengan chip.
- [ ] Duplicate `requestId` → HTTP `202` receipt JSON, FE recover via `GET /turns/:requestId`.
- [ ] Stream terputus sebelum `message.end` → FE recover via `GET /turns/:requestId` dan menampilkan status sesuai snapshot. 
- [ ] Stop saat streaming → `POST /turns/:requestId/stop`, status aborted (atau fallback AbortError).
- [ ] Edit pesan user → `editOfMessageId` dikirim, tidak ada `requestId`.
- [ ] Regenerate assistant → `POST /messages/:msgId/regenerate`, `message.start` baru.
- [ ] Clarification: card muncul, jawaban via `POST /respond` (bukan pesan baru), card hilang setelah resolved.
- [ ] Keep-alive `: ping` di SSE tidak menghasilkan event. `[auto]`

## Files & upload
- [ ] Upload PDF kecil → presign 201, PUT, complete ready, indexStatus sesuai.
- [ ] Upload `.ts` → MIME `text/plain` (bukan `video/mp2t`). `[auto]`
- [ ] Upload > `MAX_UPLOAD_MB` → error `PAYLOAD_TOO_LARGE` dengan i18n.
- [ ] Upload melebihi kuota total → `QUOTA_EXCEEDED` (413) dengan i18n.
- [ ] Upload dengan SHA256 mismatch → `HASH_MISMATCH` dengan i18n.
- [ ] Upload tipe tidak didukung → `UNSUPPORTED_MIME` dengan i18n.
- [ ] Cancel upload di tengah jalan → xhr abort, state dibersihkan, tidak memicu retry pill.
- [ ] Retry upload setelah network blip → reuse reservation bila `pending`.
- [ ] Preview file (image/PDF/code/CSV/Office) → load, download, tab switch jalan.

## Media & jobs
- [ ] `GET /me/entitlements` 200 → `GenerationToolbar` tampil (hanya jika `mediaEnabled`).
- [ ] `mediaEnabled: false` → toolbar hilang.
- [ ] Pilih `image` + `flux2-klein` → payload `{ mode: "image" }`. `[auto]`
- [ ] Pilih `video` (legacy) → payload tidak pernah berisi `mode: "video"`. `[auto]`
- [ ] Model `flux3-klein` locked → tidak pernah dikirim. `[auto]`
- [ ] Model `flux3-klein` unlocked → payload `{ imageModel: "flux3-klein" }`. `[auto]`
- [ ] SSE `media.progress` dengan `jobId` kosong → poller tidak start.
- [ ] SSE `media.progress` dengan `jobId` valid → `GET /jobs/:id` tiap ~3 dtk sampai terminal.
- [ ] Blok image history lama tampil; klik gambar → lightbox; countdown 24 jam berjalan.
- [ ] Blok video history lama tampil; `410 ASSET_EXPIRED` → pesan expired + tombol regenerate.

## Preferences, memory, usage
- [ ] Settings → Personality: `GET /me/preferences`, simpan → `PUT` → toast success.
- [ ] Validasi note 300 karakter di client.
- [ ] Settings → Memory: `GET /me/memory`, tambah/edit/hapus → `PUT /me/memory` (full array). `[auto serialization]`
- [ ] Clear all → `DELETE /me/memory` 204, daftar kosong.
- [ ] Batas 24 catatan; topik 2–64, teks 1–240 divalidasi FE.
- [ ] Catatan dengan `expiresAt`/field ekstra backend tidak hilang saat PUT ulang. `[auto serialization]`
- [ ] Settings → Usage: `GET /me/usage` 200, tampilkan total + daily.

## Errors & UX
- [ ] Error envelope `{ error: { code, message } }` dipetakan ke i18n yang tepat. `[auto]`
- [ ] Error permanen (media disabled, quota, asset expired, auth, validation) → tanpa tombol retry. `[auto]`
- [ ] Error transient (network/rate/timeout/provider) → tombol retry tampil. `[auto]`

## Session lifecycle
- [ ] Sidebar list `GET /sessions?limit=30`, loadMore via cursor.
- [ ] Rename sesi → PATCH, `titleAuto` flip ke `false` di state.
- [ ] Pin/unpin → PATCH, urutan berubah.
- [ ] Delete sesi → optimistic, state chat + draft sesi tsb di-evict, backend DELETE sukses.
- [ ] Delete gagal → state restore + toast error.
- [ ] `unauthorized` global → semua store client (chat/composer) di-reset.

## Build & i18n
- [ ] `bun run build` lolos (tsc -b + vite build).
- [ ] `bun run check:i18n` lolos.
- [ ] `bun test` lolos (tests/).