import { useEffect, useLayoutEffect } from "react";
import { useUIStore } from "../store/uiStore";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSessionsStore } from "../store/sessionsStore";
import { useChatStore } from "../store/chatStore";
import { MessageList } from "../components/chat/MessageList";
import { Composer } from "../components/composer/Composer";
import { EmptyState, StarterPrompts } from "../components/chat/EmptyState";
import { useFileDrop } from "../hooks/useFileDrop";
import { useComposerStore } from "../store/composerStore";
import { DropOverlay } from "../components/composer/DropOverlay";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";

export function ChatPage() {
  const { id } = useParams();
  const closePreview = useUIStore((s) => s.closePreview);

  useLayoutEffect(() => {
    return () => {
      closePreview();
    };
  }, [id, closePreview]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const open = useChatStore((s) => s.open);
  const upsert = useSessionsStore((s) => s.upsert);
  const stopPollTitle = useSessionsStore((s) => s.stopPollTitle);
  const addFiles = useComposerStore((s) => s.addFiles);

  const sessionId = id ?? "new";

  const showWelcome = useChatStore((s) => {
    if (!id) return true;
    const session = s.bySession[id];
    return Boolean(session?.loaded && session.messages.length === 0);
  });

  useSeo({
    title: "RensChat",
    description: t("landing.seo.description"),
    path: id ? `/chat/${id}` : "/chat",
    noindex: true,
  });

  useEffect(() => {
    if (id) open(id);
    return () => {
      if (id) stopPollTitle(id);
    };
  }, [id, open, stopPollTitle]);

  const handleFiles = async (files: File[]) => {
    let targetId = id;

    if (!targetId) {
      try {
        const newSession = await api.sessions.create();
        upsert(newSession);
        navigate(`/chat/${newSession.id}`, { replace: true });
        targetId = newSession.id;
      } catch {
        return;
      }
    }

    if (targetId) addFiles(targetId, files, targetId);
  };

  const isDragging = useFileDrop(handleFiles);
  const composer = <Composer sessionId={sessionId} isNew={!id} />;

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <DropOverlay isVisible={isDragging} />

      {showWelcome ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-6">
          <section className="mx-auto my-auto grid w-full max-w-3xl gap-5 py-8 md:gap-6 md:py-14">
            <EmptyState />
            {composer}
            <StarterPrompts sessionId={sessionId} />
          </section>
        </div>
      ) : (
        <>
          <MessageList key={sessionId} sessionId={sessionId} />
          <div className="shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {composer}
          </div>
        </>
      )}
    </main>
  );
}
