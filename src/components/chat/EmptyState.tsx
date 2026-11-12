import { SparkleLogo } from "../ui/Icons";
import { useAuthStore } from "../../store/authStore";
import { useComposerStore } from "../../store/composerStore";

export function EmptyState({ sessionId = "new" }: { sessionId?: string }) {
  const user = useAuthStore((s) => s.user);
  const setText = useComposerStore((s) => s.setText);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return "Selamat pagi";
    if (h >= 11 && h < 15) return "Selamat siang";
    if (h >= 15 && h < 18) return "Selamat sore";
    return "Selamat malam";
  };

  const firstName = user?.name?.split(" ")[0] || "Kamu";

  const suggestions = [
    {
      label: "Buat tabel perbandingan",
      prompt:
        "Tolong buatkan tabel perbandingan antara React, Vue, dan Angular beserta kelebihan dan kekurangannya.",
    },
    {
      label: "Buat grafik dari data",
      prompt:
        "Tolong buatkan grafik batang dari data jumlah penduduk Indonesia 5 tahun terakhir.",
    },
    {
      label: "Tulis kode",
      prompt:
        "Tulis kode fungsi TypeScript untuk mencari bilangan prima dari 1 sampai 100.",
    },
    {
      label: "Buat laporan PDF",
      prompt:
        "Tolong buatkan laporan PDF singkat tentang pentingnya tidur yang cukup.",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 md:px-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-6 flex flex-col items-center gap-4">
        <SparkleLogo className="w-10 h-10 text-accent" />
        <h1 className="text-3xl md:text-4xl font-serif font-medium text-ink">
          {getGreeting()}, {firstName}
        </h1>
      </div>
      <p className="text-muted text-sm max-w-md mb-8">
        GenUI adalah asisten AI generatif yang dapat membuat teks, kode, tabel,
        grafik, dan file langsung di chat.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setText(sessionId, s.prompt)}
            className="p-3 text-left border border-line rounded-xl bg-surface hover:bg-surface2 hover:border-accent/30 transition-all text-sm font-medium text-ink">
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
