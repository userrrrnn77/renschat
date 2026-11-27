import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, ArrowUp, Square, X, Pencil } from "lucide-react";
import { useComposerStore } from "../../store/composerStore";
import { useChatStore } from "../../store/chatStore";
import { useSessionsStore } from "../../store/sessionsStore";

import { api } from "../../lib/api";
import { AttachmentChip } from "./AttachmentChip";
import { Spinner } from "../ui/Spinner";
import { PastedTextBubble } from "../chat/PastedTextBubble";
import { encodeUserTurn } from "../../lib/userTurn";
import { cn } from "../../lib/cn";

const MAX_MESSAGE_CHARS = 100_000;

function waitForUploadsReady(
  key: string,
  localIds: string[],
): Promise<boolean> {
  if (localIds.length === 0) return Promise.resolve(true);
  const ids = new Set(localIds);
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      const draft = useComposerStore.getState().drafts[key];
      if (!draft) {
        resolve(false);
        return;
      }
      const attachments = draft.attachments.filter((a) => ids.has(a.localId));
      if (attachments.length < ids.size) {
        resolve(false);
        return;
      }
      if (attachments.some((a) => a.state === "failed")) {
        resolve(false);
        return;
      }
      if (attachments.every((a) => a.state === "ready" && a.fileId !== null)) {
        resolve(true);
        return;
      }
      if (Date.now() - startedAt > 120_000) {
        resolve(false);
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

export function Composer({
  sessionId,
  isNew = false,
}: {
  sessionId: string;
  isNew?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const messageLimitLabel = MAX_MESSAGE_CHARS.toLocaleString(
    i18n.language === "en" ? "en-US" : "id-ID",
  );
  const key = isNew ? "new" : sessionId;

  const userId = useComposerStore((s) => s.userId);
  const open = useComposerStore((s) => s.open);
  useEffect(() => {
    if (userId) return open(key);
  }, [userId, key, open]);

  const savedDraft = useComposerStore((s) => s.drafts[key]);
  const reply = savedDraft?.reply;
  const setReply = useComposerStore((s) => s.setReply);

  const draft = savedDraft ?? {
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
  const upsertSession = useSessionsStore((s) => s.upsert);
  const navigate = useNavigate();

  const isStreaming = bySession[sessionId]?.streaming;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [draft.text]);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setError(null);
    setStatus(null);
    let targetId = sessionId;

    if (isNew) {
      try {
        const newSession = await api.sessions.create();
        upsertSession(newSession);
        targetId = newSession.id;
        useComposerStore.getState().moveDraft("new", targetId);
        navigate(`/chat/${targetId}`, { replace: true });
      } catch (err) {
        console.error("Gagal membuat sesi baru", err);
        setError(t("composer.errors.newSessionWithAttachments"));
        return;
      }
    }

    addFiles(targetId, files, targetId);
  };

  const handleCancelEdit = () => {
    if (isNew) return;
    cancelEdit(sessionId);
  };

  const handleSend = async () => {
    if (isStreaming || isPreparing) return;

    if (
      !draft.text.trim() &&
      draft.pastedTexts.length === 0 &&
      draft.attachments.length === 0
    ) {
      return;
    }

    const snapshot = useComposerStore.getState().drafts[key] ?? draft;
    const blockedByFailure = snapshot.attachments.find(
      (a) => a.state === "failed",
    );
    if (blockedByFailure) {
      setError(
        blockedByFailure.error || t("composer.errors.failedAttachment"),
      );
      return;
    }
    if (snapshot.attachments.some((a) => a.state !== "ready")) {
      setError(t("composer.errors.waitForUploads"));
      return;
    }

    setError(null);
    setStatus(null);
    setIsPreparing(true);

    try {
      const baseText = encodeUserTurn({
        text: draft.text,
        pastes: [],
        ...(reply ? { reply } : {}),
      });

      if (baseText.length > MAX_MESSAGE_CHARS) {
        setError(
          t("composer.errors.messageTooLong", {
            limit: messageLimitLabel,
          }),
        );
        return;
      }

      const initialCombinedText = encodeUserTurn({
        text: draft.text,
        pastes: draft.pastedTexts.map((p) => p.text),
        ...(reply ? { reply } : {}),
      });

      let targetId = sessionId;
      let activeKey = key;

      if (isNew) {
        try {
          const newSession = await api.sessions.create();
          upsertSession(newSession);
          targetId = newSession.id;
          activeKey = targetId;
          useComposerStore.getState().moveDraft("new", targetId);
          navigate(`/chat/${targetId}`, { replace: true });
        } catch (err) {
          console.error("Gagal membuat sesi baru", err);
          setError(t("composer.errors.newSessionWithMessage"));
          return;
        }
      }

      let combinedText = initialCombinedText;

      if (initialCombinedText.length > MAX_MESSAGE_CHARS) {
        if (draft.pastedTexts.length === 0) {
          setError(
            t("composer.errors.totalTooLong", {
              limit: messageLimitLabel,
            }),
          );
          return;
        }

        setStatus(t("composer.uploadingPastes"));
        const pasteFiles = draft.pastedTexts.map(
          (paste, index) =>
            new File(
              [paste.text],
              draft.pastedTexts.length === 1
                ? "paste.txt"
                : `paste-${index + 1}.txt`,
              { type: "text/plain" },
            ),
        );
        const uploads = addFiles(activeKey, pasteFiles, targetId);

        useComposerStore
          .getState()
          .setMessageContext(activeKey, [], reply ?? undefined);

        const uploadsReady = await waitForUploadsReady(
          activeKey,
          uploads.map((u) => u.localId),
        );

        if (!uploadsReady) {
          const current = useComposerStore.getState().drafts[activeKey];
          const failed = current?.attachments.find(
            (a) =>
              uploads.some((u) => u.localId === a.localId) &&
              a.state === "failed",
          );
          setError(
            failed?.error || t("composer.errors.uploadPastesFailed"),
          );
          return;
        }

        const current = useComposerStore.getState().drafts[activeKey] ?? draft;
        combinedText = encodeUserTurn({
          text: current.text,
          pastes: [],
          ...(current.reply ? { reply: current.reply } : {}),
        });

        if (combinedText.length > MAX_MESSAGE_CHARS) {
          setError(
            t("composer.errors.messageTooLong", {
              limit: messageLimitLabel,
            }),
          );
          return;
        }

        setStatus(null);
      }

      const currentDraft =
        useComposerStore.getState().drafts[activeKey] ?? draft;
      const failedAttachment = currentDraft.attachments.find(
        (a) => a.state === "failed",
      );

      if (failedAttachment) {
        setError(
          failedAttachment.error || t("composer.errors.failedAttachment"),
        );
        return;
      }

      if (
        currentDraft.attachments.some(
          (a) => a.state !== "ready" && a.state !== "failed",
        )
      ) {
        setError(t("composer.errors.waitForUploads"));
        return;
      }

      const readyAttachments = currentDraft.attachments.filter(
        (a) => a.state === "ready" && a.fileId !== null,
      );

      const attachments = readyAttachments.map((a) => ({
        id: a.fileId as string,
        name: a.name,
        mime: a.mime,
        size: a.size,
        localUrl: a.localUrl,
      }));

      const editOfMessageId = editing?.messageId;

      clear(activeKey, { keepServerFiles: true });
      await send(
        targetId,
        combinedText,
        attachments,
        undefined,
        editOfMessageId,
      );

      if (editOfMessageId) cancelEdit(targetId);
    } finally {
      setIsPreparing(false);
      setStatus(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const extension = file.type.split("/")[1] || "png";
          const renamedFile = new File(
            [file],
            `pasted-image-${Date.now()}.${extension}`,
            { type: file.type },
          );
          imageFiles.push(renamedFile);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      void processFiles(imageFiles);
      return;
    }

    const text = e.clipboardData.getData("text");
    if (text.length > 500 || text.split("\n").length > 10) {
      e.preventDefault();
      addPastedText(key, text);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    if (
      val.length > 800 &&
      val.split("\n").length > 15 &&
      !val.includes(draft.text)
    ) {
      setText(key, "");
      addPastedText(key, val);
      return;
    }

    setText(key, val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const isUploading = draft.attachments.some(
    (a) => a.state !== "ready" && a.state !== "failed",
  );
  const hasFailedAttachment = draft.attachments.some(
    (a) => a.state === "failed",
  );

  const isDisabled =
    isStreaming ||
    isPreparing ||
    (!draft.text.trim() &&
      draft.pastedTexts.length === 0 &&
      draft.attachments.length === 0) ||
    isUploading ||
    hasFailedAttachment;

  return (
    <div className="w-full max-w-3xl mx-auto min-w-0">
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

      {reply && (
        <div className="mb-2 flex items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-3">
            <p className="text-xs font-medium text-accent">
              {t("chat.replyingToAssistant")}
            </p>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap wrap-break-word text-sm text-muted">
              {reply.text}
            </p>
          </div>
          <button
            type="button"
            aria-label="Batalkan kutipan"
            onClick={() => setReply(key, null)}
            className="rounded p-1 text-muted hover:bg-surface2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {draft.pastedTexts.length > 0 && (
        <div className="mb-2 flex flex-col items-start gap-2">
          {draft.pastedTexts.map((paste, index) => (
            <PastedTextBubble
              key={paste.localId}
              index={index}
              text={paste.text}
              onRemove={() => removePastedText(key, paste.localId)}
            />
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

      <div className="rounded-3xl border border-line bg-surface p-3 shadow-sm transition-colors focus-within:border-accent/50 sm:p-4">
        <textarea
          id={`composer-${key}`}
          ref={textareaRef}
          value={draft.text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onPaste={handlePaste}
          placeholder={
            isNew
              ? t("composer.placeholderNew")
              : t("composer.placeholderReply")
          }
          className="block w-full min-h-14 max-h-50 bg-transparent py-1 px-1 resize-none focus:outline-none text-[15px] leading-relaxed placeholder:text-muted/70"
          rows={1}
        />

        <div className="mt-2 flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isNew}
            className="p-2 text-muted hover:text-ink hover:bg-surface2 rounded-xl transition-colors disabled:opacity-50"
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

          <div className="flex-1" aria-hidden="true" />

          <button
            onClick={isStreaming ? () => stop(sessionId) : handleSend}
            aria-label={
              isStreaming ? t("common.cancel") : t("clarification.send")
            }
            disabled={!isStreaming && isDisabled}
            className={cn(
              "p-2 rounded-xl transition-colors flex items-center justify-center shrink-0",
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
      </div>

      {status && (
        <div className="text-center mt-2 text-[11px] text-muted">{status}</div>
      )}
      {error && (
        <div className="text-center mt-2 text-xs text-red-500" role="alert">
          {error}
        </div>
      )}

      <div className="text-center mt-2 text-[11px] text-muted">
        {t("composer.disclaimer")}
      </div>
    </div>
  );
}
