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
      {/* Navbar Simple */}
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

      {/* Content */}
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

      <h2>4. Perubahan Layanan</h2>
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
        file yang kamu unggah) untuk memberikan layanan yang lebih baik.
      </p>

      <h2>2. Penggunaan Data</h2>
      <p>
        Datamu digunakan secara eksklusif untuk memproses permintaan AI,
        menyimpan riwayat chat, dan meningkatkan kualitas model. Kami TIDAK
        menjual datamu ke pihak ketiga.
      </p>

      <h2>3. Keamanan</h2>
      <p>
        Semua data dienkripsi saat transit (HTTPS) dan disimpan di infrastruktur
        cloud yang aman (MongoDB & Cloudflare R2).
      </p>

      <h2>4. Penghapusan Data</h2>
      <p>
        Kamu dapat menghapus sesi chat kapan saja melalui antarmuka. Menghapus
        sesi akan menghapus riwayat pesan dan file terkait secara permanen dari
        server.
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
        kartu, dan membuat file secara langsung di dalam chat.
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
        gambar (PNG, JPG).
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
