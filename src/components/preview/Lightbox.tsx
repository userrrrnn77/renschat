import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/uiStore";

export function Lightbox() {
  const { t } = useTranslation();
  const { lightbox, setLightbox } = useUIStore();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [setLightbox]);

  if (!lightbox) return null;

  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const filesBase = new URL(`${apiBase}/api/files/`, window.location.href);
  const imageUrl = new URL(lightbox, window.location.href);

  const isFileDownload =
    imageUrl.origin === filesBase.origin &&
    imageUrl.pathname.startsWith(filesBase.pathname) &&
    imageUrl.pathname.endsWith("/download");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={() => setLightbox(null)}>
      <button
        type="button"
        aria-label={t("common.close")}
        title={t("common.close")}
        onClick={() => setLightbox(null)}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors">
        <X className="w-6 h-6" />
      </button>
      <img
        crossOrigin={isFileDownload ? "use-credentials" : undefined}
        src={lightbox}
        alt={t("preview.imageAlt")}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
