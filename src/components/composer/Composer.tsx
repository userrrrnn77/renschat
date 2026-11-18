// src/components/composer/Composer.tsx

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useComposerStore } from "../../store/composerStore";
import { useChatStore } from "../../store/chatStore";
import { useSessionsStore } from "../../store/sessionsStore";
import { useMediaStore, buildGeneration } from "../../store/mediaStore";
import { GenerationToolbar } from "../media/GenerationToolbar";
import { api } from "../../lib/api";
import { AttachmentChip } from "./AttachmentChip";
import { Spinner } from "../ui/Spinner";
import { Plus, ArrowUp, Square, FileText, X, Pencil } from "lucide-react";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";

export function Composer({
  sessionId,
  isNew = false,
}: {
  sessionId: string;
  isNew?: boolean;
}) {
  const { t } = useTranslation();

  const key = isNew ? "new" : sessionId;

  const draft = useComposerStore((s) => s.drafts[key]) || {
    text: "",
    attachments: [],
    pastedTexts: [],
  };

  const {
    setText,
    addFiles,
    addPastedText,
    removeAttachment,
    removePastedText,
    retryAttachment,
    clear,
  } = useComposerStore();

  const { send, stop, bySession } = useChatStore();
  const editing = useChatStore((s) =>
    isNew ? undefined : s.editingBySession[sessionId],
  );
  const cancelEdit = useChatStore((s) => s.cancelEdit);
  const selection = useMediaStore((s) => s.selection);
  const resetSelection = useMediaStore((s) => s.resetSelection);

  const navigate = useNavigate();
  const upsertSession = useSessionsStore((s) => s.upsert);

  const isStreaming = bySession[sessionId]?.streaming;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [draft.text]);

  const handleCancelEdit = () => {
    if (isNew) return;
    cancelEdit(sessionId);
  };

  const handleSend = async () => {
    const combinedText = [...draft.pastedTexts.map((p) => p.text), draft.text]
      .filter((t) => t.trim().length > 0)
      .join("\n\n");

    if (!combinedText && draft.attachments.length === 0) return;

    if (
      draft.attachments.some(
        (a) =>
          a.state === "failed" ||
          a.state === "uploading" ||
          a.state === "queued" ||
          a.state === "presigning" ||
          a.state === "completing" ||
          a.state === "processing",
      )
    )
      return;

    const text = combinedText;

    const readyAttachments = draft.attachments.filter(
      (a) => a.state === "ready" && a.fileId !== null,
    );

    const attachments = readyAttachments.map((a) => ({
      id: a.fileId as string,
      name: a.name,
      mime: a.mime,
      size: a.size,
      localUrl: a.localUrl,
    }));

    const generation = buildGeneration(selection);
    const editOfMessageId = editing?.messageId;

    // File sudah "dipindahkan" ke message — jangan hapus dari server.
    clear(key, { keepServerFiles: true });

    let targetId = sessionId;

    if (isNew) {
      try {
        const newSession = await api.sessions.create();
        upsertSession(newSession);
        targetId = newSession.id;
        navigate(`/chat/${targetId}`, { replace: true });
      } catch (err) {
        console.error("Gagal membuat sesi baru", err);
        return;
      }
    }

    await send(targetId, text, attachments, generation, editOfMessageId);
    // §15.2: pilihan eksplisit tidak lengket — reset ke auto setelah kirim.
    if (generation !== undefined) resetSelection();
    if (editOfMessageId) cancelEdit(targetId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.length > 1000 || text.split("\n").length > 15) {
      e.preventDefault();
      addPastedText(key, text);
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
    (!draft.text.trim() &&
      draft.pastedTexts.length === 0 &&
      draft.attachments.length === 0) ||
    isUploading;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6">
      <GenerationToolbar
        composerKey={key}
        disabled={isStreaming || isUploading}
      />

      {editing && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-lg text-xs text-ink">
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{t("composer.editingMessage")}</span>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="p-1 hover:bg-surface2 rounded-md"
            title={t("common.cancel")}>
            <X className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
      )}

      {draft.pastedTexts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {draft.pastedTexts.map((p) => (
            <div
              key={p.localId}
              className="flex items-center gap-2 border border-line rounded-lg px-3 py-1.5 text-xs bg-surface">
              <FileText className="w-4 h-4 text-muted" />
              <div className="flex flex-col">
                <span className="font-medium">{t("composer.pastedText")}</span>
                <span className="text-muted">
                  {t("composer.chars", { count: p.text.length })}
                </span>
              </div>
              <button
                onClick={() => removePastedText(key, p.localId)}
                className="p-1 hover:bg-surface2 rounded-md ml-1"
                title={t("common.delete")}>
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {draft.attachments.map((a) => (
            <AttachmentChip
              key={a.localId}
              attachment={a}
              onRemove={() => removeAttachment(key, a.localId)}
              onRetry={() => retryAttachment(key, a.localId, sessionId)}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-surface border border-line rounded-3xl p-2 shadow-sm focus-within:border-accent/50 transition-colors">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming || isNew}
          className="p-2 mb-1 text-muted hover:text-ink hover:bg-surface2 rounded-xl transition-colors disabled:opacity-50"
          title={t("composer.attachFile")}>
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
          onPaste={handlePaste}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={
            isNew
              ? t("composer.placeholderNew")
              : t("composer.placeholderReply")
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
          ) : isUploading ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </div>
      <div className="text-center mt-2 text-[11px] text-muted">
        {t("composer.disclaimer")}
      </div>
    </div>
  );
}
