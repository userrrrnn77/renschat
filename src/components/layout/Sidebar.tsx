import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  useSessionsStore,
  selectGroupedSessions,
} from "../../store/sessionsStore";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { SessionItem } from "./SessionItem";
import { UserMenu } from "./UserMenu";
import { SparkleLogo } from "../ui/Icons";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

export function Sidebar() {
  const navigate = useNavigate();
  const { id: currentSessionId } = useParams();
  const {
    items,
    loading,
    query,
    setQuery,
    loadFirst,
    loadMore,
    nextCursor,
    patch,
    remove,
  } = useSessionsStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const groups = selectGroupedSessions();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFirst();
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current || !nextCursor) return;
    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadMore();
    }
  };

  const handleNewChat = () => {
    navigate("/");
    if (window.innerWidth < 768) toggleSidebar();
  };

  if (!sidebarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={toggleSidebar}
      />
      <aside className="w-64 h-full bg-sidebar border-r border-line flex flex-col shrink-0 z-50 absolute md:relative animate-in slide-in-from-left-4 md:slide-in-from-left-0">
        <div className="p-4 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}>
            <SparkleLogo className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-lg text-ink">
              GenUI
            </span>
          </div>
        </div>

        <div className="px-3 mb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Chat baru
          </button>
        </div>

        <div className="px-3 mb-4 relative">
          <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari chat..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface2 border-none rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted/70 text-ink"
          />
        </div>

        <div
          className="flex-1 overflow-y-auto px-2 space-y-6"
          ref={scrollRef}
          onScroll={handleScroll}>
          {loading && items.length === 0 ? (
            <div className="space-y-2 px-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.title}>
                <h3 className="px-2 text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={s.id === currentSessionId}
                      onClick={() => {
                        navigate(`/chat/${s.id}`);
                        if (window.innerWidth < 768) toggleSidebar();
                      }}
                      onRename={(title) => patch(s.id, { title })}
                      onPin={(pinned) => patch(s.id, { pinned })}
                      onDelete={() => {
                        if (confirm("Hapus chat ini?")) {
                          remove(s.id);
                          if (s.id === currentSessionId) navigate("/");
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-line mt-auto">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
