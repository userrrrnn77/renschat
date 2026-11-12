import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useComposerStore } from "../../store/composerStore";
import { useChatStore } from "../../store/chatStore";
import { useSessionsStore } from "../../store/sessionsStore";
import { api } from "../../lib/api";
import { AttachmentChip } from "./AttachmentChip";
import { Plus, ArrowUp, Square } from "lucide-react";
import { cn } from "../../lib/cn";

export function Composer({
  sessionId,
  isNew = false,
}: {
  sessionId: string;
  isNew?: boolean;
}) {
  const key = isNew ? "new" : sessionId;
  const draft = useComposerStore((s) => s.drafts[key]) || {
    text: "",
    attachments: [],
  };
  const { setText, addFiles, removeAttachment, clear } = useComposerStore();
  const { send, stop, bySession } = useChatStore();

  const navigate = useNavigate();
  const upsertSession = useSessionsStore((s) => s.upsert);

  const isStreaming = bySession[sessionId]?.streaming;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isComposing, setIsComposing] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [draft.text]);

  const handleSend = async () => {
    if (!draft.text.trim() && draft.attachments.length === 0) return;
    if (
      draft.attachments.some(
        (a) =>
          a.state === "failed" ||
          a.state === "uploading" ||
          a.state === "queued",
      )
    )
      return;

    const text = draft.text;
    const attachments = draft.attachments
      .filter((a) => a.state === "ready")
      .map((a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        size: a.size,
        localUrl: a.localUrl,
      }));

    clear(key);

    let targetId = sessionId;

    if (isNew) {
      try {
        const newSession = await api.sessions.create();
        upsertSession(newSession);
        targetId = newSession.id;
        navigate(`/chat/${targetId}`, { replace: true });
      } catch (err) {
        console.error("Gagal membuat sesi baru", err);
        return; // Hentikan jika gagal buat sesi
      }
    }

    await send(targetId, text, attachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && !isNew) {
      addFiles(sessionId, Array.from(e.target.files), sessionId);
    }
    e.target.value = "";
  };

  const isUploading = draft.attachments.some(
    (a) => a.state !== "ready" && a.state !== "failed",
  );
  const isDisabled =
    isStreaming ||
    (!draft.text.trim() && draft.attachments.length === 0) ||
    isUploading;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6">
      {draft.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {draft.attachments.map((a) => (
            <AttachmentChip
              key={a.id}
              attachment={a}
              onRemove={() => removeAttachment(key, a.id)}
              onRetry={() => addFiles(sessionId, [a.file], sessionId)}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-surface border border-line rounded-3xl p-2 shadow-sm focus-within:border-accent/50 transition-colors">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming || isNew}
          className="p-2 mb-1 text-muted hover:text-ink hover:bg-surface2 rounded-xl transition-colors disabled:opacity-50"
          title="Lampirkan file">
          <Plus className="w-5 h-5" />
        </button>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={draft.text}
          onChange={(e) => setText(key, e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={
            isNew ? "Apa yang bisa dibantu hari ini?" : "Balas ke GenUI…"
          }
          className="flex-1 max-h-50 bg-transparent py-3 px-1 resize-none focus:outline-none text-[15px] leading-relaxed placeholder:text-muted/70"
          rows={1}
        />

        <button
          onClick={isStreaming ? () => stop(sessionId) : handleSend}
          disabled={!isStreaming && isDisabled}
          className={cn(
            "p-2 mb-1 rounded-xl transition-colors flex items-center justify-center shrink-0",
            isStreaming
              ? "bg-ink text-bg"
              : isDisabled
                ? "bg-surface2 text-muted"
                : "bg-accent text-accent-fg hover:bg-accent-hover",
          )}>
          {isStreaming ? (
            <Square className="w-4 h-4" fill="currentColor" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </div>
      <div className="text-center mt-2 text-[11px] text-muted">
        GenUI bisa salah. Periksa kembali informasi penting.
      </div>
    </div>
  );
}
