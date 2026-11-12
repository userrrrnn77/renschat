import { useEffect } from "react";
import { X } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

export function Lightbox() {
  const { lightbox, setLightbox } = useUIStore();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [setLightbox]);

  if (!lightbox) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={() => setLightbox(null)}>
      <button
        onClick={() => setLightbox(null)}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors">
        <X className="w-6 h-6" />
      </button>
      <img
        src={lightbox}
        alt="Preview"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
