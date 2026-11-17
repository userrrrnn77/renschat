// src/components/layout/ChatHeader.tsx
import { useParams, useNavigate } from "react-router";
import { useSessionsStore } from "../../store/sessionsStore";
import { useUIStore } from "../../store/uiStore";
import { useConfirmStore } from "../../store/confirmStore";
import { Menu as MenuIcon, ChevronDown } from "lucide-react";
import { Menu } from "../ui/Menu";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ChatHeader() {
  const { t } = useTranslation();

  const { id } = useParams();
  const navigate = useNavigate();
  const { items, patch, remove } = useSessionsStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const askConfirm = useConfirmStore((s) => s.request);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");

  const session = items.find((s) => s.id === id);

  const handleRename = () => {
    if (id && title.trim()) patch(id, { title: title.trim() });
    setIsEditing(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!session) return;
    const ok = await askConfirm({
      title: t("sidebar.deleteTitle"),
      description: t("sidebar.deleteDesc"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
    });
    if (!ok) return;
    void remove(session.id);
    navigate("/");
  };

  return (
    <header className="h-12 border-b border-line flex items-center px-4 shrink-0 bg-bg/80 backdrop-blur-sm sticky top-0 z-10 gap-2">
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-muted hover:text-ink rounded-md hover:bg-surface2 transition-colors">
          <MenuIcon className="w-5 h-5" />
        </button>
      )}

      {session ? (
        isEditing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="bg-transparent border-none outline-none font-medium text-sm text-ink w-full max-w-xs"
          />
        ) : (
          <Menu
            align="left"
            trigger={
              <button className="flex items-center gap-1 text-sm font-medium text-ink hover:text-muted transition-colors truncate max-w-50 md:max-w-xs">
                <span className="truncate">
                  {session.title || t("sidebar.newChat")}
                </span>
                <ChevronDown className="w-4 h-4 text-muted" />
              </button>
            }>
            <button
              onClick={() => {
                setIsEditing(true);
                setTitle(session.title);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface2">
              {t("menu.rename")}
            </button>
            <button
              onClick={() => patch(session.id, { pinned: !session.pinned })}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface2">
              {session.pinned ? t("menu.unpin") : t("menu.pin")}
            </button>
            <button
              onClick={() => {
                void handleDelete();
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-danger/10 text-danger">
              {t("menu.delete")}
            </button>
          </Menu>
        )
      ) : (
        <span className="font-medium text-sm text-ink">
          {t("sidebar.newChat")}
        </span>
      )}
    </header>
  );
}
