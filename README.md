# GenUI Chat Frontend

Frontend chat AI generative UI — Vite + React 19 + TypeScript + Tailwind v4 + Zustand. Merender jawaban model sebagai blok (teks, kode, tabel, chart, kartu, file, gambar, video), dengan toolbar generate gambar/video, badge kredit, dan alur donasi Ko-fi yang **opsional**. Semua fitur inti tetap gratis; penegakan akses sepenuhnya di backend — UI hanya kosmetik.

## Prasyarat

- **Node.js** `>= 20` atau **Bun** `>= 1.1`
- **Backend GenUI** sudah jalan (default `http://localhost:3000`) — lihat README backend
- Browser modern (fetch streaming / ReadableStream untuk SSE)

## Setup cepat

```bash
bun install            # atau npm install
# buat .env (lihat tabel di bawah); saat dev boleh dikosongkan semua
bun run dev            # Vite dev server + proxy /api ke backend
bun run build          # tsc -b && vite build → dist/
bun run preview        # pratinjau hasil build
```

Saat dev, Vite mem-proxy `/api` ke `VITE_DEV_API_TARGET` (default `http://localhost:3000`), jadi tidak perlu set `VITE_API_BASE_URL` dan tidak ada masalah CORS/cookie di lokal.

## Environment variables

| Var | Default | Keterangan |
|---|---|---|
| `VITE_API_BASE_URL` | `""` (kosong) | Base URL backend untuk panggilan `/api`. Kosongkan saat dev (lewat proxy). Isi URL absolut bila FE & BE beda origin di produksi, mis. `https://api.domainmu.com` |
| `VITE_DEV_API_TARGET` | `http://localhost:3000` | Target proxy `/api` saat `vite dev` |
| `VITE_MAX_UPLOAD_MB` | `20` | Batas ukuran lampiran di UI. Samakan dengan `MAX_UPLOAD_MB` backend |

> Semua var `VITE_*` di-embed saat build. Ganti nilai → **build ulang**, bukan cuma restart.

## Scripts

| Script | Fungsi |
|---|---|
| `bun run dev` | Dev server Vite (HMR) + proxy `/api` |
| `bun run build` | Typecheck (`tsc -b`) + build produksi ke `dist/` |
| `bun run preview` | Serve hasil build secara lokal |

## Struktur folder

```
src/
├── components/
│   ├── blocks/      # Renderer per tipe Block: text, code, table, chart, card,
│   │                # choices, file, image, video (+ countdown & unduh media)
│   ├── chat/        # MessageList, AssistantMessage, ToolChip, ThinkingPanel,
│   │                # ClarificationCard, SourcesList, EmptyState
│   ├── composer/    # Composer, AttachmentChip, DropOverlay
│   ├── layout/      # AppShell, Sidebar, ChatHeader, UserMenu
│   ├── media/       # GenerationToolbar, ImageModelDropdown, VideoOptionsPopover,
│   │                # CreditBadge, DonateCard, ClaimDonationDialog
│   ├── preview/     # FilePreviewPanel, Lightbox
│   └── ui/          # Modal, Menu, Markdown, Toaster, Skeleton, Spinner, Icons
├── hooks/           # useMediaUrl (presigned), useAuthedBlobUrl, useFileDrop,
│                    # useHotkeys, useStickToBottom
├── lib/             # api (fetchApi + ApiError), sse (parseSse), upload,
│                    # cn, copy, files, highlight, time
├── pages/           # ChatPage, LoginPage, StaticPages (Terms/Privasi/FAQ/Kontak)
├── store/           # zustand: auth, chat, sessions, composer, media, ui,
│                    # toast, confirm
├── types.ts         # Block union, Entitlements, GenerationInput, MediaProgress, dll.
└── index.css        # Tailwind v4 + token tema (light / dark / system)
```

## Fitur utama

- **Generative UI** — jawaban model dirender sebagai urutan `Block` (discriminated union). Blok atomik (table/chart/card/file/image/video) tampil utuh; text/code streaming via delta.
- **Dokumen & RAG** — upload lampiran (presign → PUT R2 → complete → poll), sumber `[n]` inline + daftar sumber, preview teks/PDF/gambar.
- **Klarifikasi hold-and-resume** — `ClarificationCard` dengan countdown; jawaban dikirim via `POST /sessions/:id/respond`, bukan pesan baru.
- **Media generation** — toolbar Gambar/Video di composer, progress via SSE `media.progress`, hasil tampil sebagai blok image/video.
- **Donasi opsional** — gembok model berbayar, badge kredit, DonateCard + klaim donasi.
- **Tema** — light / dark / system, persist di `localStorage`.
- **Aksesibilitas & mobile** — gembok `aria-disabled` + `aria-label`, countdown tidak mengumumkan tiap detik, popover jadi bottom sheet di layar sempit.

## Media generation

### Alur

1. User pilih lewat **GenerationToolbar** (Gambar / Video) → pilihan disimpan di `mediaStore.selection`.
2. `chatStore.send(sessionId, text, attachments, generation?)` — parameter ke-4 **opsional**; pemanggil lama (ChoicesBlockView, CardBlockView) tetap valid. Setelah satu pesan dengan pilihan eksplisit, selection kembali ke `auto` (tidak lengket).
3. Backend menghitung plan di server (entitlement, kill switch, budget) → model memanggil tool media → SSE `media.progress` selama job berjalan.
4. Hasil tiba sebagai blok `image` / `video` atomik (berisi `fileId`, bukan base64).
5. FE mengambil URL tayang lewat `GET /api/files/:id/url` (presigned R2, TTL default 1 jam) via `useMediaUrl`, dan me-refresh URL saat kedaluwarsa.

Bentuk payload `generation`:

```json
{
  "mode": "auto",
  "imageModel": "flux2-klein",
  "video": { "aspect": "16:9", "engine": "auto" }
}
```

- `mode`: `auto` (default) | `image` | `video`
- `imageModel`: `flux2-klein` (gratis) | `flux3-klein` (donatur)
- `video.engine`: `auto` | `cosmos` (donatur) | `python` (gratis)
- Tidak memilih apa pun → `auto` (atau omit).

### Entitlements & kredit

- `GET /api/me/entitlements` dimuat ke `mediaStore` (`fetchEntitlements()`).
- **FLUX.2 Klein 4B**: default, badge **Gratis** (20 gambar/hari).
- **FLUX.3 Image Klein**: bila `locked` → ikon gembok + tooltip *"Terbuka setelah traktir kopi di Ko-fi (opsional)"*; klik membuka **DonateCard**. Bila terbuka → badge **"N kredit"**.
- **Video**: rasio 16:9 / 9:16 dengan pratinjau, engine **Otomatis** (berlabel *"Cosmos3 (kredit)"* bila donor berkredit) atau **Python (gratis)** (5 video/hari), plus chip contoh prompt yang mengisi composer.
- 1 donasi ≥ minimum (default USD 3) = **+10 kredit gambar flux-3 dan +4 kredit video cosmos** sekaligus. Kredit menumpuk, tidak kedaluwarsa.

### Donasi & klaim

- **DonateCard**: kode donasi `RC-XXXXXX` (tombol salin), teks *"Tulis kode ini di pesan donasi supaya kredit masuk otomatis"*, tombol **Buka Ko-fi**, dan link klaim.
- **ClaimDonationDialog**: form email + ID transaksi Ko-fi → `POST /api/me/donations/claim`.
- Transparansi: *"Semua fitur tetap gratis. Donasi bersifat opsional."*

### Penyajian media & kedaluwarsa

- Media generated **dihapus 24 jam** setelah dibuat. Blok media menampilkan countdown *"Hilang dalam 23j 12m"* (update tiap menit), info *"Disimpan 24 jam"*, dan tombol **Unduh**.
- `410 ASSET_EXPIRED` → *"Media sudah kedaluwarsa, buat ulang?"* + tombol salin prompt / buat ulang.
- Presigned URL di-refresh otomatis saat kedaluwarsa; key R2 tidak pernah dikirim ke FE.

### Error UX

| Kode | Perilaku UI |
|---|---|
| `INSUFFICIENT_CREDITS` | Tombol menuju DonateCard |
| `ENTITLEMENT_REQUIRED` | Gembok + DonateCard |
| `RATE_LIMITED` | "Coba lagi nanti" |
| `GENERATION_BUSY` | Tunggu job selesai |
| `MEDIA_DISABLED` | "Fitur media sedang dinonaktifkan sementara" |

## Integrasi backend

Auth memakai cookie JWT `httpOnly` — semua fetch `credentials: "include"`. `401` memicu event `unauthorized` → store dibersihkan → redirect login.

Endpoint yang dipakai:

| Area | Endpoint |
|---|---|
| Auth | `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me` |
| Sesi | `GET/POST /api/sessions`, `GET/PATCH/DELETE /api/sessions/:id` |
| Chat (SSE) | `POST /api/sessions/:id/messages`, `POST /api/sessions/:id/respond` |
| File | `POST /api/files/presign`, `POST /api/files/:id/complete`, `GET /api/files/:id` · `/url` · `/download` · `/content`, `DELETE /api/files/:id` |
| Media | `GET /api/me/entitlements`, `POST /api/me/donations/claim` |

Event SSE yang ditangani `chatStore.handleEvent`:
`message.start`, `status`, `clarification.needed` / `clarification.resolved`, `sources`, `thinking.delta` / `thinking.end`, `block.start` / `block.delta` / `block.end`, `tool.start` / `tool.end`, `media.progress`, `title`, `error`, `message.end`.

Catatan: saat user menekan Stop, koneksi diputus dan backend menyimpan status `aborted` **tanpa** `message.end` — FE menandai pesan dari fallback stream. Judul sesi di-poll terpisah (`pollTitle`) karena event `title` sering tiba setelah stream tutup.

## Deployment

```bash
bun run build   # hasil: dist/ (statis)
```

**Opsi A — satu domain (disarankan):** serve `dist/` di belakang reverse proxy yang meneruskan `/api` ke backend. `VITE_API_BASE_URL` kosong. Cookie auth aman, tanpa CORS.

**Opsi B — FE & BE beda origin:** set `VITE_API_BASE_URL` absolut saat build. Backend harus mengizinkan origin FE lewat `CLIENT_ORIGIN` (CORS + credentials). Cookie auth `SameSite=Lax` + `Secure` di produksi → **wajib HTTPS**; lintas-site penuh dapat memblokir cookie — gunakan subdomain yang same-site atau proxy.

Jangan menaruh secret apa pun di frontend (key NVIDIA/R2, token Ko-fi, JWT secret) — semuanya milik backend.

## Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| Layar "Tidak bisa terhubung ke server" | Backend belum jalan, `VITE_DEV_API_TARGET` salah, atau CORS menolak |
| `401` terus / mental ke login | Cookie tidak terkirim: cek `credentials: include`, `CLIENT_ORIGIN`, HTTPS, dan same-site |
| Upload gagal `SIZE_MISMATCH` / `UNSUPPORTED_MIME` | `VITE_MAX_UPLOAD_MB` beda dengan backend, atau tipe file tidak didukung |
| Media `410` | Memang sudah lewat 24 jam — buat ulang |
| Video tidak terputar | Presigned URL kedaluwarsa (auto-refresh), atau codec; Cosmos di-transcode H.264 oleh backend bila ffmpeg tersedia |
| Tombol FLUX.3 / Cosmos terkunci | Belum donasi (opsional). Sudah donasi tapi kredit belum masuk → pakai **Klaim donasi** |

## Catatan

- Semua media dibuat oleh AI; output Cosmos berwatermark **SynthID** dan tidak dihapus.
- Media generated dihapus otomatis 24 jam setelah dibuat.
- Donasi bersifat opsional; seluruh fitur inti tetap gratis.
- Atribusi model & lisensi (FLUX Kommunity License, NVIDIA API Trial Terms) tercantum di halaman Terms/About.
```

Tinggal tempel bre. Kalau mau gw tambahin bagian screenshot atau badge repo, bilang aja.