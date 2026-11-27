import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { ChatHeader } from "./ChatHeader";
import { useUIStore } from "../../store/uiStore";
import { FilePreviewPanel } from "../preview/FilePreviewPanel";
import { Lightbox } from "../preview/Lightbox";
import { DonateCard } from "../media/DonateCard";
import type { FileBlock } from "../../types";
import { usePreviewStore } from "../../store/usePreviewStore";
import { cn } from "../../lib/cn";

const DESKTOP_QUERY = "(min-width: 48rem)";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function PreviewDock() {
  const activeFile = usePreviewStore((s) => s.activeFile);
  const clearActiveFile = usePreviewStore((s) => s.clearActiveFile);
  const expanded = usePreviewStore((s) => s.expanded);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const [displayedFile, setDisplayedFile] = useState<FileBlock | null>(
    activeFile,
  );
  const open = activeFile !== null;

  // Simpan isi panel selama animasi keluar. Bila user membuka file lain saat
  // panel sudah tampil, isi diganti tanpa memicu exit/enter baru.
  useLayoutEffect(() => {
    if (activeFile) setDisplayedFile(activeFile);
  }, [activeFile]);

  // Tangkap pemicu saat dibuka; kembalikan fokus hanya di mobile.
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    }
    wasOpen.current = open;
  }, [open]);

  // Kelola open/modal state dialog mengikuti breakpoint.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const mq = window.matchMedia(DESKTOP_QUERY);

    const sync = () => {
      if (mq.matches) {
        // Desktop: dialog non-modal tetap ter-mount agar width bisa bertransisi.
        if (dialog.matches(":modal")) dialog.close();
        if (!dialog.open) dialog.show();
        return;
      }
      // Mobile: modal hanya ketika terbuka; penutupan menunggu exit selesai.
      if (!open) return;
      if (!dialog.open || !dialog.matches(":modal")) {
        if (dialog.open) dialog.close();
        dialog.showModal();
      }
    };

    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [open]);

  const handleExitComplete = () => {
    if (usePreviewStore.getState().activeFile !== null) return;
    setDisplayedFile(null);
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isDesktop && dialog.open) dialog.close();
    if (!isDesktop) {
      const el = triggerRef.current;
      triggerRef.current = null;
      requestAnimationFrame(() => el?.focus());
    }
  };

  const renderFile = activeFile ?? displayedFile;
  const previewPct = expanded ? 100 : sidebarOpen ? 48 : 50;

  return (
    <dialog
      ref={dialogRef}
      aria-label={renderFile?.name}
      onCancel={(event) => {
        event.preventDefault();
        clearActiveFile();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          clearActiveFile();
        }
      }}
      style={
        isDesktop ? { width: `${open ? previewPct : 0}%` } : undefined
      }
      className={cn(
        "fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none",
        "overflow-hidden border-0 bg-surface p-0 text-ink",
        "backdrop:bg-black/40",
        // Desktop: flex sibling in-flow; lebar via inline style (satu pemilik).
        "md:relative md:inset-auto md:h-full md:min-w-0 md:flex-none md:shrink-0 md:max-w-none md:w-auto",
        "md:transition-[width] md:duration-200 md:ease-out md:motion-reduce:transition-none",
      )}>
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
        {open && renderFile && (
          <motion.div
            key="preview-panel"
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }
            }
            className="h-full min-h-0 md:border-l md:border-line">
            <FilePreviewPanel
              key={`${renderFile.fileId}:${renderFile.version}`}
              file={renderFile}
              onClose={clearActiveFile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}

export function AppShell() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      <Sidebar />

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <ChatHeader />
          <Outlet />
        </div>

        <PreviewDock />
      </div>

      <Lightbox />
      <DonateCard />
    </div>
  );
}
