import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, PanelLeftClose } from "lucide-react";
import {
  useSessionsStore,
  selectGroupedSessions,
} from "../../store/sessionsStore";
import { useUIStore } from "../../store/uiStore";
import { useConfirmStore } from "../../store/confirmStore";
import { SessionItem } from "./SessionItem";
import { UserMenu } from "./UserMenu";
import { SparkleLogo } from "../ui/Icons";
import { Skeleton } from "../ui/Skeleton";

export function Sidebar() {
  const { t } = useTranslation();
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
  const askConfirm = useConfirmStore((s) => s.request);
  const groups = selectGroupedSessions();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const handleScroll = () => {
    if (!scrollRef.current || !nextCursor) return;

    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadMore();
    }
  };

  const handleNewChat = () => {
    navigate("/chat");
    if (window.innerWidth < 768) toggleSidebar();
  };

  const handleDelete = async (id: string): Promise<void> => {
    const ok = await askConfirm({
      title: t("sidebar.deleteTitle"),
      description: t("sidebar.deleteDesc"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
    });

    if (!ok) return;
    void remove(id);
    if (id === currentSessionId) navigate("/chat");
  };

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={toggleSidebar}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        inert={!sidebarOpen}
        aria-hidden={!sidebarOpen}
        initial={false}
        animate={{
          x: isDesktop ? 0 : sidebarOpen ? 0 : "-100%",
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]",
          "md:relative md:inset-auto md:h-full md:shrink-0",
          "md:transition-[width] md:duration-200 md:ease-out",
          "md:motion-reduce:transition-none",
          sidebarOpen ? "md:w-72" : "pointer-events-none md:w-0",
        ].join(" ")}>
        <aside
          className={[
            "absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col",
            "border-r border-line bg-sidebar",
          ].join(" ")}>
          <div className="p-4 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleNewChat}>
              <SparkleLogo className="w-5 h-5 text-accent" />
              <span className="font-serif font-semibold text-lg text-ink">
                RensChat
              </span>
            </button>

            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={t("common.close")}
              className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-ink">
              <PanelLeftClose className="size-4" />
            </button>
          </div>

          <div className="px-3 mb-2">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              {t("sidebar.newChat")}
            </button>
          </div>

          <div className="px-3 mb-4 relative">
            <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={t("sidebar.searchPlaceholder")}
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
                          void handleDelete(s.id);
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
      </motion.div>
    </>
  );
}
