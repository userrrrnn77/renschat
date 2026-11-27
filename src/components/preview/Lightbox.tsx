import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/uiStore";

export function Lightbox() {
  const { t } = useTranslation();
  const { lightbox, setLightbox } = useUIStore();

  // Simpan url terakhir selama exit animation.
  const [displayedUrl, setDisplayedUrl] = useState<string | null>(lightbox);

  useEffect(() => {
    if (lightbox) setDisplayedUrl(lightbox);
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [lightbox, setLightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

  const open = lightbox !== null;

  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const filesBase = new URL(`${apiBase}/api/files/`, window.location.href);

  const resolvedUrl = displayedUrl ?? "";
  const imageUrl = resolvedUrl
    ? new URL(resolvedUrl, window.location.href)
    : null;

  const isFileDownload =
    imageUrl !== null &&
    imageUrl.origin === filesBase.origin &&
    imageUrl.pathname.startsWith(filesBase.pathname) &&
    imageUrl.pathname.endsWith("/download");

  return createPortal(
    <AnimatePresence onExitComplete={() => setDisplayedUrl(null)}>
      {open && displayedUrl && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
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
          <motion.img
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            crossOrigin={isFileDownload ? "use-credentials" : undefined}
            src={displayedUrl}
            alt={t("preview.imageAlt")}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
