# RensChat Frontend

Frontend chat AI generatif. Vite + React 19 + TypeScript + Tailwind v4 + Zustand.

Jawaban model dirender sebagai blok: teks, kode, tabel, chart, kartu, file, gambar, dan video. Penegakan akses sepenuhnya ada di backend. UI hanya kosmetik, tidak pernah jadi penentu izin.

Sesuai kontrak backend terbaru, generation media saat ini hanya tersedia untuk model image `flux2-klein`. Mode `video` dan model `flux3-klein` ditolak backend dengan `MEDIA_DISABLED`. Blok image dan video dari history lama tetap dirender.

## Prasyarat

- Node.js `>= 20` atau Bun `>= 1.1`
- Backend RensChat sudah jalan, default `http://localhost:3000`
- Browser modern yang mendukung fetch streaming dan ReadableStream untuk SSE

## Setup cepat

```bash
bun install            # atau npm install
bun run dev            # Vite dev server + proxy /api ke backend
bun run build          # tsc -b && vite build, hasil di dist/
bun run preview        # pratinjau hasil build
```

Saat dev, Vite mem-proxy `/api` ke `VITE_DEV_API_TARGET`. Jadi tidak perlu set `VITE_API_BASE_URL` dan tidak ada masalah CORS atau cookie di lokal.

## Environment variables

| Var | Default | Keterangan |
|---|---|---|
| `VITE_API_BASE_URL` | `""` (kosong) | Base URL backend untuk panggilan `/api`. Kosongkan saat dev (lewat proxy). Isi URL absolut bila FE dan BE beda origin di produksi, contoh `https://api.domainmu.com` |
| `VITE_DEV_API_TARGET` | `http://localhost:3000` | Target proxy `/api` saat `vite dev` |
| `VITE_MAX_UPLOAD_MB` | `20` | Batas ukuran lampiran di UI. Samakan dengan `MAX_UPLOAD_MB` backend |

Semua var `VITE_*` di-embed saat build. Ganti nilai berarti build ulang, bukan cuma restart.

## Scripts

| Script | Fungsi |
|---|---|
| `bun run dev` | Dev server Vite (HMR) + proxy `/api` |
| `bun run build` | Typecheck (`tsc -b`) + build produksi ke `dist/` |
| `bun run preview` | Serve hasil build secara lokal |
| `bun run check:i18n` | Cek kelengkapan key i18n |

## Struktur folder

```
src/
├── components/
│   ├── blocks/      # Renderer per tipe Block: text, code, table, chart, card,
│   │                # choices, file, image, video, termasuk countdown dan unduh media
│   ├── chat/        # MessageList, AssistantMessage, ToolChip, ThinkingPanel,
│   │                # ClarificationCard, SourcesList, EmptyState
│   ├── composer/    # Composer, AttachmentChip, DropOverlay
│   ├── layout/      # AppShell, Sidebar, ChatHeader, UserMenu
│   ├── media/       # GenerationToolbar, ImageModelDropdown, VideoOptionsPopover,
│   │                # CreditBadge, DonateCard, ClaimDonationDialog
│   ├── preview/     # FilePreviewPanel, Lightbox
│   └── ui/          # Modal, Menu, Markdown, Toaster, Skeleton, Spinner, Icons
├── hooks/           # useMediaUrl (presigned), useFileDrop, useHotkeys,
│                    # useStickToBottom, dan hook preview lain
├── lib/             # api (fetchApi + ApiError), sse (parseSse), upload,
│                    # cn, copy, files, highlight, time
├── pages/           # ChatPage, LoginPage, StaticPages (Terms, Privasi, FAQ, Kontak)
├── store/           # Zustand: auth, chat, sessions, composer, media, ui,
│                    # toast, confirm
├── types.ts         # Block union, Entitlements, GenerationInput, MediaProgress, dll.
└── index.css        # Tailwind v4 + token tema (light, dark, system)
```

## Fitur utama

- **Generative UI.** Jawaban model dirender sebagai urutan `Block` (discriminated union). Blok atomik (table, chart, card, file, image, video) tampil utuh. Text dan code streaming lewat delta.
- **Dokumen dan RAG.** Upload lampiran dengan alur presign, PUT ke R2, complete, lalu poll. Sumber inline `[n]` plus daftar sumber. Preview teks, PDF, dan gambar.
- **Klarifikasi hold-and-resume.** `ClarificationCard` dengan countdown. Jawaban dikirim lewat `POST /sessions/:id/respond`, bukan sebagai pesan baru.
- **Media generation.** Toolbar gambar (`flux2-klein`) di composer. Progress lewat SSE `media.progress`. Hasil tampil sebagai blok image.
- **Renderer media legacy.** Blok image dan video dari history lama tetap dirender. Countdown kedaluwarsa asset dan tombol unduh tetap berfungsi.
- **Tema.** Light, dark, dan system. Disimpan di `localStorage`.
- **Aksesibilitas dan mobile.** Tombol memakai `aria-disabled` dan `aria-label`. Countdown tidak mengumumkan tiap detik. Popover jadi bottom sheet di layar sempit.

## Media generation

### Status kontrak

Berdasarkan kontrak backend terbaru:

- `GET /api/me/entitlements` mengembalikan `mediaEnabled`, `image.models` (saat ini hanya `flux2-klein`), `video` (engines saat ini hanya `auto`), `isDonor: false`, `credits` bernilai `0`, `donationCode: null`, `koFiUrl: null`.
- `resolveGenerationPlan()` menolak `generation.mode === "video"` dengan `MEDIA_DISABLED`.
- Tool `generate_image` hanya jalan ketika `MEDIA_ENABLED` aktif. Model gambar yang dipakai adalah `flux2-klein`.

Konsekuensi untuk UI:

- `mediaStore.buildGeneration()` tidak pernah mengirim `mode: "video"`.
- `mediaStore.buildGeneration()` hanya mengirim `imageModel` yang tidak `locked` di entitlements. Dengan kontrak saat ini, hanya `flux2-klein` yang bisa terkirim.
- `VideoOptionsPopover` tetap ada sebagai komponen legacy, tapi tidak di-mount di `GenerationToolbar`. Renderer blok `image` dan `video` tetap dipertahankan untuk membaca history lama.

### Alur image generation

1. User memilih lewat **GenerationToolbar**. Pilihan disimpan di `mediaStore.selection`.
2. `chatStore.send(sessionId, text, attachments, generation?)` dipanggil. Parameter ke-4 opsional, jadi pemanggil lama seperti `ChoicesBlockView` dan `CardBlockView` tetap valid. Setelah satu pesan dengan pilihan eksplisit, selection kembali ke `auto`.
3. Backend menghitung plan di server (entitlement, kill switch, budget). Model memanggil tool `generate_image`. Progress dikirim lewat SSE `media.progress` selama job berjalan.
4. Hasil tiba sebagai blok `image` atomik yang berisi `fileId`, bukan base64.
5. FE mengambil URL tayang lewat `GET /api/files/:id/url` (presigned R2) via `useMediaUrl`, dan me-refresh URL saat kedaluwarsa.

Payload `generation` yang saat ini bisa dikirim:

```json
{ "mode": "image", "imageModel": "flux2-klein" }
```

### Event SSE yang ditangani

`chatStore.handleEvent` menangani:

`message.start`, `status`, `clarification.needed`, `clarification.resolved`, `sources`, `thinking.delta`, `thinking.end`, `block.start`, `block.delta`, `block.end`, `tool.start`, `tool.end`, `media.progress`, `title`, `error`, `message.end`.

Catatan:

- `message.end` bisa berstatus `done`, `aborted`, atau `error`.
- Saat user menekan Stop, backend bisa mengakhiri turn sebagai `aborted` lewat lifecycle. FE juga punya fallback `AbortError` pada stream bila `message.end` tidak terkirim.
- Judul sesi di-poll terpisah (`pollTitle`) karena event `title` sering tiba setelah stream tutup.

## Deployment

```bash
bun run build   # hasil: dist/ (statis)
```

**Opsi A, satu domain (disarankan).** Serve `dist/` di belakang reverse proxy yang meneruskan `/api` ke backend. `VITE_API_BASE_URL` kosong. Cookie auth aman, tanpa CORS.

**Opsi B, FE dan BE beda origin.** Set `VITE_API_BASE_URL` absolut saat build. Backend harus mengizinkan origin FE lewat `CLIENT_ORIGIN` (CORS + credentials). Cookie auth `SameSite=Lax` + `Secure` di produksi, jadi wajib HTTPS. Lintas-site penuh bisa memblokir cookie. Gunakan subdomain yang same-site atau proxy.

Jangan menaruh secret apa pun di frontend. Key NVIDIA, R2, token Ko-fi, dan JWT secret adalah milik backend.

## Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| Layar "Tidak bisa terhubung ke server" | Backend belum jalan, `VITE_DEV_API_TARGET` salah, atau CORS menolak |
| `401` terus, mental ke login | Cookie tidak terkirim. Cek `credentials: include`, `CLIENT_ORIGIN`, HTTPS, dan same-site |
| Upload gagal `SIZE_MISMATCH` atau `UNSUPPORTED_MIME` | `VITE_MAX_UPLOAD_MB` beda dengan backend, atau tipe file tidak didukung |
| Media `410` | Sudah lewat 24 jam. Buat ulang |
| Blok video history tidak terputar | Presigned URL kedaluwarsa (auto-refresh), atau codec asli. Backend tidak men-transcode ulang media legacy |
| Model image tampil locked | Entitlement backend sedang menonaktifkan model tersebut. Tidak ada fallback client-side |

## Catatan

- Semua media dibuat oleh AI.
- Media generated dihapus otomatis 24 jam setelah dibuat.
- Generation media dibatasi kontrak backend. Saat ini hanya image `flux2-klein` yang tersedia. Mode video dan model FLUX.3 dinonaktifkan (`MEDIA_DISABLED`).
- Alur donasi dan klaim kredit tidak diiklankan sebagai fitur aktif selama backend mengembalikan `isDonor: false` dan `credits: 0`.
- Renderer blok image dan video serta countdown kedaluwarsa tetap ada agar history lama tetap terbaca.
- Atribusi model dan lisensi (FLUX Kommunity License, NVIDIA API Trial Terms) tercantum di halaman Terms dan About.
