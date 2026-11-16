// src/pages/StaticPages.tsx
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { SparkleLogo } from "../components/ui/Icons";

// ─── Layout Wrapper ────────────────────────────────────────────────────────
function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg">
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/login"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <SparkleLogo className="w-5 h-5 text-accent" />
            <span className="font-semibold text-ink">GenUI</span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-4">
          {title}
        </h1>
        <p className="text-muted mb-10 pb-6 border-b border-line">
          Terakhir diperbarui:{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="prose-chat max-w-none text-muted">{children}</div>
      </main>
    </div>
  );
}

// ─── Halaman Terms ─────────────────────────────────────────────────────────
export function TermsPage() {
  return (
    <LegalLayout title="Syarat & Ketentuan">
      <h2>1. Penerimaan Syarat</h2>
      <p>
        Dengan mengakses dan menggunakan GenUI, kamu setuju untuk terikat dengan
        syarat dan ketentuan yang berlaku.
      </p>

      <h2>2. Penggunaan Layanan</h2>
      <p>
        GenUI adalah asisten AI generatif. Kamu dilarang menggunakan layanan ini
        untuk menghasilkan konten ilegal, melanggar hak cipta, atau merugikan
        pihak lain.
      </p>

      <h2>3. Batasan Tanggung Jawab</h2>
      <p>
        AI dapat membuat kesalahan. Selalu verifikasi informasi penting yang
        dihasilkan oleh sistem. Kami tidak bertanggung jawab atas kerugian yang
        timbul dari penggunaan hasil AI.
      </p>

      <h2>4. Media yang Dibuat AI</h2>
      <p>
        Gambar dan video yang dihasilkan oleh GenUI dibuat oleh model AI (FLUX.2
        Klein, FLUX.3 Image Klein, NVIDIA Cosmos3 Nano, atau animasi grafis yang
        dihasilkan dari kode Python). Semua media dibuat AI dan dapat mengandung
        ketidakakuratan visual. Kamu bertanggung jawab penuh atas penggunaan
        hasil generate, termasuk kepatuhan terhadap lisensi model terkait.
      </p>
      <p>
        <strong>Watermark SynthID</strong> pada output Cosmos3 Nano tidak boleh
        dihapus. Watermark tersebut adalah penanda bahwa media dihasilkan AI.
      </p>

      <h2>5. Masa Simpan Media (24 Jam)</h2>
      <p>
        Media hasil generate (gambar dan video) disimpan maksimal{" "}
        <strong>24 jam</strong> sejak dibuat, lalu dihapus otomatis dari
        storage. Unduh media yang kamu butuhkan sebelum kedaluwarsa. Setelah
        kedaluwarsa, media tidak dapat dipulihkan dan kamu perlu membuat ulang.
      </p>

      <h2>6. Donasi (Opsional)</h2>
      <p>
        Semua fitur inti GenUI <strong>tetap gratis</strong>. Donasi lewat Ko-fi
        bersifat <strong>opsional</strong> dan berfungsi membuka model yang
        lebih berat (FLUX.3 Image Klein untuk gambar, NVIDIA Cosmos3 Nano untuk
        video). Satu donasi (minimal USD 3) memberi{" "}
        <strong>+10 kredit gambar FLUX.3</strong> dan{" "}
        <strong>+4 kredit video Cosmos</strong> sekaligus. Kredit menumpuk dan
        tidak kedaluwarsa; generate yang gagal akan mengembalikan kredit. Donasi
        bukan pembelian; kredit bukan alat tukar dan tidak dapat diuangkan
        kembali.
      </p>

      <h2>7. Atribusi Model & Lisensi</h2>
      <p>
        Gambar FLUX dihasilkan via NVIDIA API. FLUX.3 Image Klein tunduk pada{" "}
        <a
          href="https://blackforestlabs.ai/flux-1-kommunity-license/"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline">
          FLUX Kommunity License v1.0
        </a>
        . Video Cosmos dihasilkan via NVIDIA API Trial Terms. Animasi video
        jalur gratis dihasilkan dari kode Python yang dijalankan di sandbox
        terisolasi dan dijahit via ffmpeg. Semua penggunaan tunduk pada syarat
        penyedia model masing-masing.
      </p>

      <h2>8. Perubahan Layanan</h2>
      <p>
        Kami berhak mengubah, menangguhkan, atau menghentikan layanan kapan saja
        tanpa pemberitahuan terlebih dahulu.
      </p>
    </LegalLayout>
  );
}

// ─── Halaman Privacy ───────────────────────────────────────────────────────
export function PrivacyPage() {
  return (
    <LegalLayout title="Kebijakan Privasi">
      <h2>1. Data yang Kami Kumpulkan</h2>
      <p>
        Kami mengumpulkan alamat email, nama, dan riwayat percakapan (termasuk
        file yang kamu unggah) untuk memberikan layanan yang lebih baik. Untuk
        media yang dihasilkan AI, kami menyimpan metadata teknis (model,
        dimensi, durasi) tanpa menyimpan prompt lengkap di log.
      </p>

      <h2>2. Penggunaan Data</h2>
      <p>
        Datamu digunakan secara eksklusif untuk memproses permintaan AI,
        menyimpan riwayat chat, dan meningkatkan kualitas model. Kami TIDAK
        menjual datamu ke pihak ketiga.
      </p>

      <h2>3. Data Donasi</h2>
      <p>
        Untuk memetakan donasi ke akun, kami menyimpan hash email donatur
        (SHA-256) dan ID transaksi Ko-fi. Email mentah dan token verifikasi
        webhook <strong>tidak</strong> disimpan maupun di-log. Kamu juga dapat
        memilih mencocokkan donasi lewat kode donasi <code>RC-XXXXXX</code> yang
        ditulis di pesan donasi.
      </p>

      <h2>4. Keamanan</h2>
      <p>
        Semua data dienkripsi saat transit (HTTPS) dan disimpan di infrastruktur
        cloud yang aman (MongoDB & Cloudflare R2).
      </p>

      <h2>5. Penghapusan Data</h2>
      <p>
        Kamu dapat menghapus sesi chat kapan saja melalui antarmuka. Menghapus
        sesi akan menghapus riwayat pesan dan file terkait secara permanen dari
        server. Media hasil generate dihapus otomatis 24 jam setelah dibuat.
      </p>
    </LegalLayout>
  );
}

// ─── Halaman FAQ ───────────────────────────────────────────────────────────
export function FaqPage() {
  return (
    <LegalLayout title="Frequently Asked Questions (FAQ)">
      <h2>Apa itu GenUI?</h2>
      <p>
        GenUI (Generative User Interface) adalah asisten AI yang tidak hanya
        membalas dengan teks, tapi juga bisa merender tabel interaktif, grafik,
        kartu, membuat file, serta <strong>membuat gambar dan video</strong>{" "}
        secara langsung di dalam chat.
      </p>

      <h2>Apakah dataku aman?</h2>
      <p>
        Ya. Kami menggunakan otentikasi JWT yang aman dan file disimpan di
        storage pribadi (Cloudflare R2). Baca selengkapnya di{" "}
        <Link to="/privacy" className="text-accent hover:underline">
          Kebijakan Privasi
        </Link>
        .
      </p>

      <h2>Format file apa saja yang didukung?</h2>
      <p>
        Saat ini kami mendukung PDF, DOCX, XLSX, CSV, TXT, Markdown, JSON, serta
        gambar (PNG, JPG). Untuk <strong>media yang dibuat</strong>, output
        berupa gambar (PNG/JPEG/WebP) dan video MP4.
      </p>

      <h2>Apakah gambar dan video yang dibuat AI itu gratis?</h2>
      <p>
        Gambar <strong>FLUX.2 Klein 4B</strong> dan{" "}
        <strong>video Python</strong> (animasi grafis yang dihasilkan dari kode)
        sepenuhnya gratis dengan limit harian. Gambar{" "}
        <strong>FLUX.3 Image Klein</strong> dan video{" "}
        <strong>NVIDIA Cosmos3 Nano</strong> membutuhkan kredit yang diperoleh
        lewat donasi Ko-fi <em>opsional</em>. Semua fitur inti tetap gratis
        tanpa donasi.
      </p>

      <h2>Berapa lama media saya disimpan?</h2>
      <p>
        Semua media hasil generate disimpan maksimal <strong>24 jam</strong>{" "}
        sejak dibuat, lalu dihapus otomatis. Unduh media yang kamu butuhkan
        sebelum kedaluwarsa. Setelah kedaluwarsa, media tidak dapat dipulihkan
        dan perlu dibuat ulang.
      </p>

      <h2>Apakah media buatan AI ini legal untuk dipakai?</h2>
      <p>
        Model gambar FLUX.3 tunduk pada FLUX Kommunity License v1.0, sedangkan
        video Cosmos tunduk pada NVIDIA API Trial Terms. Output video Cosmos
        menyertakan watermark <strong>SynthID</strong> yang tidak boleh dihapus.
        Selalu periksa lisensi model sebelum pemakaian komersial. Detail di{" "}
        <Link to="/terms" className="text-accent hover:underline">
          Syarat & Ketentuan
        </Link>
        .
      </p>

      <h2>Bagaimana cara klaim kredit donasi?</h2>
      <p>
        Setelah donasi, tulis kode donasi <code>RC-XXXXXX</code> (tersedia di
        menu akun) di pesan donasi Ko-fi — kredit masuk otomatis. Kalau lupa
        menulis kode, buka menu akun → <em>Donasi (opsional)</em> →{" "}
        <em>Klaim donasi</em> dan masukkan email + ID transaksi Ko-fi.
      </p>

      <h2>Kenapa AI terkadang salah?</h2>
      <p>
        Model bahasa besar (LLM) dapat berhalusinasi. Kami sudah menambahkan
        fitur RAG (Retrieval-Augmented Generation) untuk meminimalisir hal ini,
        tapi selalu cek ulang informasi kritis.
      </p>
    </LegalLayout>
  );
}

// ─── Halaman Contact ───────────────────────────────────────────────────────
export function ContactPage() {
  return (
    <LegalLayout title="Hubungi Kami">
      <p className="mb-6">
        Punya pertanyaan, masukan, atau menemukan bug? Kami siap membantu.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
        <div className="p-6 bg-surface border border-line rounded-xl">
          <h3 className="font-semibold text-ink mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              ✉️
            </span>
            Email Support
          </h3>
          <p className="text-sm text-muted mb-4">
            Respon dalam 1x24 jam kerja.
          </p>
          <a
            href="mailto:support@genui.app"
            className="text-sm font-medium text-accent hover:underline">
            support@genui.app
          </a>
        </div>

        <div className="p-6 bg-surface border border-line rounded-xl">
          <h3 className="font-semibold text-ink mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              🐛
            </span>
            Laporan Bug
          </h3>
          <p className="text-sm text-muted mb-4">
            Laporkan error atau feedback UI.
          </p>
          <a
            href="mailto:bugs@genui.app"
            className="text-sm font-medium text-accent hover:underline">
            bugs@genui.app
          </a>
        </div>
      </div>
    </LegalLayout>
  );
}
