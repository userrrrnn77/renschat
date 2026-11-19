// src/components/layout/AppShell.tsx
import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { ChatHeader } from "./ChatHeader";
import { useUIStore } from "../../store/uiStore";
import { FilePreviewPanel } from "../preview/FilePreviewPanel";
import { Lightbox } from "../preview/Lightbox";
import { DonateCard } from "../media/DonateCard";

export function AppShell() {
  const preview = useUIStore((s) => s.preview);
  const closePreview = useUIStore((s) => s.closePreview);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewOpen = preview !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!previewOpen || !dialog) return;

    const desktop = window.matchMedia("(min-width: 48rem)");

    function syncMode() {
      if (!dialog) return;
      if (dialog.open) dialog.close();

      if (desktop.matches) dialog.show();
      else dialog.showModal();
    }

    syncMode();
    desktop.addEventListener("change", syncMode);

    return () => {
      desktop.removeEventListener("change", syncMode);
      if (dialog.open) dialog.close();
    };
  }, [previewOpen]);

  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col h-full min-w-0">
          <ChatHeader />
          <Outlet />
        </div>
        {preview && (
          <dialog
            ref={dialogRef}
            aria-label={preview.name}
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
            className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-surface p-0 text-ink backdrop:bg-black/50 md:relative md:inset-auto md:h-full md:w-[45%] md:min-w-0 md:max-w-150 md:shrink-0 md:border-l md:border-line">
            <FilePreviewPanel
              key={`${preview.fileId}:${preview.version}`}
              file={preview}
              onClose={closePreview}
            />
          </dialog>
        )}
      </div>
      <Lightbox />
      <DonateCard />
    </div>
  );
}
