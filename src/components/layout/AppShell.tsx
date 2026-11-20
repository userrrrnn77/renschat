import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { ChatHeader } from "./ChatHeader";
import { useUIStore } from "../../store/uiStore";
import { FilePreviewPanel } from "../preview/FilePreviewPanel";
import { Lightbox } from "../preview/Lightbox";
import { DonateCard } from "../media/DonateCard";
import type { FileBlock } from "../../types";

function PreviewDock() {
  const preview = useUIStore((s) => s.preview);
  const closePreview = useUIStore((s) => s.closePreview);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [displayedFile, setDisplayedFile] = useState<FileBlock | null>(preview);
  const open = preview !== null;

  // Simpan isi panel selama animasi keluar. Kalau user membuka file lain
  // saat panel sudah tampil, cukup ganti isinya.
  useLayoutEffect(() => {
    if (preview) setDisplayedFile(preview);
  }, [preview]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const desktop = window.matchMedia("(min-width: 48rem)");

    function syncDialog() {
      if (!dialog) return;

      if (!open) {
        if (dialog.open) dialog.close();
        return;
      }

      const needsModal = !desktop.matches;

      if (dialog.open && dialog.matches(":modal") === needsModal) return;

      if (dialog.open) dialog.close();

      if (needsModal) dialog.showModal();
      else dialog.show();
    }

    syncDialog();
    desktop.addEventListener("change", syncDialog);

    return () => {
      desktop.removeEventListener("change", syncDialog);
    };
  }, [open]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (open || !displayedFile || !dialog) return;

    let cancelled = false;

    // Tunggu transisi CSS yang benar-benar berjalan. Jika reduced motion
    // aktif atau browser langsung menutup dialog, daftarnya kosong.
    const transitions = dialog.getAnimations();
    void Promise.allSettled(
      transitions.map((animation) => animation.finished),
    ).then(() => {
      if (!cancelled) setDisplayedFile(null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, displayedFile]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={displayedFile?.name}
      onCancel={(event) => {
        event.preventDefault();
        closePreview();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closePreview();
        }
      }}
      className={[
        "fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none",
        "overflow-hidden border-0 bg-surface p-0 text-ink",

        // Mobile: geser dari kanan. CSS mempertahankan dialog di top
        // layer sampai transisi keluar selesai.
        "translate-x-full opacity-0 open:translate-x-0 open:opacity-100",
        "transition-[translate,opacity,width,display,overlay]",
        "transition-discrete duration-200 ease-out",
        "starting:open:translate-x-full starting:open:opacity-0",

        // Desktop: chat ikut melebar atau mengecil bersama panel.
        "md:relative md:inset-auto md:h-full md:min-w-0 md:shrink-0",
        "md:w-0 md:max-w-150 md:translate-x-0",
        "md:open:w-[45%] md:starting:open:w-0",
        "md:starting:open:translate-x-0",

        "backdrop:bg-black/40 motion-reduce:transition-none",
      ].join(" ")}>
      {displayedFile && (
        <div className="h-full min-h-0 md:border-l md:border-line">
          <FilePreviewPanel
            key={`${displayedFile.fileId}:${displayedFile.version}`}
            file={displayedFile}
            onClose={closePreview}
          />
        </div>
      )}
    </dialog>
  );
}

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      <Sidebar />

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <ChatHeader />
          <Outlet />
        </div>

        <PreviewDock key={pathname} />
      </div>

      <Lightbox />
      <DonateCard />
    </div>
  );
}
