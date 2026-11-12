import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useSessionsStore } from "../store/sessionsStore";
import { useChatStore } from "../store/chatStore";
import { MessageList } from "../components/chat/MessageList";
import { Composer } from "../components/composer/Composer";
import { EmptyState } from "../components/chat/EmptyState";
import { useFileDrop } from "../hooks/useFileDrop";
import { useComposerStore } from "../store/composerStore";
import { DropOverlay } from "../components/composer/DropOverlay";
import { api } from "../lib/api";

export function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { open, bySession } = useChatStore();
  const { upsert } = useSessionsStore();
  const addFiles = useComposerStore((s) => s.addFiles);

  const session = bySession[id || ""];
  const isNew = !id;
  const isEmpty = !isNew && session?.loaded && session.messages.length === 0;

  useEffect(() => {
    if (id) open(id);
  }, [id, open]);

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

  return (
    <div className="flex flex-col h-full relative">
      <DropOverlay isVisible={isDragging} />

      {isNew ? (
        <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-4">
          <EmptyState />
          <div className="mt-8">
            <Composer sessionId="new" isNew />
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-4">
          <EmptyState sessionId={id} />
          <div className="mt-8">
            <Composer sessionId={id} />
          </div>
        </div>
      ) : (
        <>
          <MessageList sessionId={id || ""} />
          <Composer sessionId={id || ""} />
        </>
      )}
    </div>
  );
}
