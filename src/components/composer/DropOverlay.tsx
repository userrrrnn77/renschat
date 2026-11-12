import { UploadCloud } from "lucide-react";

export function DropOverlay({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md h-64 border-2 border-dashed border-accent rounded-3xl flex flex-col items-center justify-center gap-4 bg-accent/5">
        <div className="p-4 bg-accent/20 rounded-full text-accent">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-ink">
            Lepas file untuk melampirkan
          </p>
          <p className="text-sm text-muted mt-1">
            PDF, gambar, dokumen, atau kode · maks{" "}
            {import.meta.env.VITE_MAX_UPLOAD_MB || 20} MB
          </p>
        </div>
      </div>
    </div>
  );
}
