// src/components/layout/UserMenu.tsx
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useMediaStore } from "../../store/mediaStore";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  BookOpen,
  Shield,
  MessageCircle,
  Coffee,
  FileText,
  Settings, // <--- Icon Baru
} from "lucide-react";
import { SettingsDialog } from "./SettingsDialog"; // <--- Import Dialog Baru
import { cn } from "../../lib/cn";

export function UserMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setDonateOpen = useMediaStore((s) => s.setDonateOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full p-2 hover:bg-surface2 rounded-lg transition-colors text-left">
        {/* ... Kode Avatar & Nama lu tetep sama ... */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium truncate">{user.name}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-surface border border-line rounded-xl shadow-lg z-50 p-1 animate-in slide-in-from-bottom-2">
          <div className="px-3 py-2 border-b border-line mb-1 flex items-center justify-between">
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>

          <div className="px-1 py-1 border-t border-line mt-1 pt-1">
            {/* TOMBOL SETTINGS BARU */}
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 text-ink rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-muted" />{" "}
              {t("settings.menuLabel")}
            </button>

            {/* TOMBOL DONASI & LINKS */}
            <button
              type="button"
              onClick={() => {
                setDonateOpen(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 text-ink rounded-lg transition-colors">
              <Coffee className="w-4 h-4 text-muted" />{" "}
              {t("donation.donateOptional")}
            </button>
            <Link
              to="/faq"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 text-ink rounded-lg transition-colors">
              <BookOpen className="w-4 h-4 text-muted" /> {t("menu.faq")}
            </Link>
            <Link
              to="/terms"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 text-ink rounded-lg transition-colors">
              <FileText className="w-4 h-4 text-muted" /> {t("menu.terms")}
            </Link>
            <Link
              to="/privacy"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 text-ink rounded-lg transition-colors">
              <Shield className="w-4 h-4 text-muted" /> {t("menu.privacy")}
            </Link>
            <Link
              to="/contact"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 text-ink rounded-lg transition-colors">
              <MessageCircle className="w-4 h-4 text-muted" /> {t("menu.help")}
            </Link>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-danger/10 text-danger rounded-lg transition-colors mt-1">
            <LogOut className="w-4 h-4" /> {t("menu.logout")}
          </button>
        </div>
      )}

      {/* Panggil SettingsDialog di sini */}
      <SettingsDialog />
    </div>
  );
}
