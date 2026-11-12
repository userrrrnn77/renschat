import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { ChatHeader } from "./ChatHeader";
import { useUIStore } from "../../store/uiStore";
import { FilePreviewPanel } from "../preview/FilePreviewPanel";
import { Lightbox } from "../preview/Lightbox";
import { Toaster } from "../ui/Toaster";

export function AppShell() {
  const { preview } = useUIStore();

  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col h-full min-w-0">
          <ChatHeader />
          <Outlet />
        </div>
        {preview && (
          <div className="hidden md:block w-[45%] min-w-100 max-w-150 h-full shrink-0 relative">
            <FilePreviewPanel />
          </div>
        )}
      </div>
      <Lightbox />
      <Toaster />
    </div>
  );
}
