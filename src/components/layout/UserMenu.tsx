import { useRef, useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { LogOut, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "../../lib/cn";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
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
        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium truncate">{user.name}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-surface border border-line rounded-xl shadow-lg z-50 p-1 animate-in slide-in-from-bottom-2">
          <div className="px-3 py-2 border-b border-line mb-1">
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>

          <div className="px-1 py-1">
            <p className="text-[11px] font-semibold text-muted px-2 mb-1 uppercase tracking-wider">
              Tema
            </p>
            <div className="flex bg-surface2 rounded-lg p-0.5">
              {[
                { id: "light", icon: Sun, label: "Terang" },
                { id: "dark", icon: Moon, label: "Gelap" },
                { id: "system", icon: Monitor, label: "Sistem" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={cn(
                    "flex-1 flex justify-center py-1.5 rounded-md transition-colors",
                    theme === t.id
                      ? "bg-surface shadow-sm text-ink"
                      : "text-muted hover:text-ink",
                  )}
                  title={t.label}>
                  <t.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-danger/10 text-danger rounded-lg transition-colors mt-1">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
