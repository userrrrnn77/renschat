import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Edit2, Pin, Trash2 } from "lucide-react";
import { cn } from "../../lib/cn";
import type { SessionItem as SessionType } from "../../types";
import { useUIStore } from "../../store/uiStore";
import { useTranslation } from "react-i18next";

export function SessionItem({
  session,
  isActive,
  onClick,
  onRename,
  onPin,
  onDelete,
}: {
  session: SessionType;
  isActive: boolean;
  onClick: () => void;
  onRename: (title: string) => void;
  onPin: (pinned: boolean) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleRename = () => {
    if (editValue.trim() && editValue !== session.title) {
      onRename(editValue.trim());
    } else {
      setEditValue(session.title);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="px-2 py-1">
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditValue(session.title);
              }
            }}
            className="w-full bg-surface border border-accent rounded px-2 py-1 text-sm outline-none text-ink"
          />
        </div>
      ) : (
        <button
          onClick={onClick}
          title={session.title || t("sidebar.newChat")}
          onDoubleClick={() => setIsEditing(true)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
            isActive
              ? "bg-surface2 text-ink font-medium"
              : "text-muted hover:bg-surface2 hover:text-ink",
          )}>
          <span className="min-w-0 truncate pr-8">
            {session.title || t("sidebar.newChat")}
          </span>
        </button>
      )}

      {!isEditing && (
        <div
          className={cn(
            "renschat-actions absolute right-2 top-1.5 transition-opacity",
            (isActive || menuOpen) && "renschat-actions-open",
          )}
          ref={menuRef}>
          <button
            type="button"
            aria-label={t("menu.sessionActions")}
            title={t("menu.sessionActions")}
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="p-1 rounded text-muted hover:text-ink hover:bg-line transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-line rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface2 text-left">
                <Edit2 className="w-3.5 h-3.5" /> {t("menu.rename")}
              </button>
              <button
                onClick={() => {
                  onPin(!session.pinned);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface2 text-left">
                <Pin className="w-3.5 h-3.5" />{" "}
                {session.pinned ? t("menu.unpin") : t("menu.pin")}
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-danger/10 text-danger text-left">
                <Trash2 className="w-3.5 h-3.5" /> {t("menu.delete")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
