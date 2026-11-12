import { create } from "zustand";
import {
  uploadFile,
  type AttachmentUpload,
  type UploadState,
} from "../lib/upload";
import type { AttachmentRef } from "../types";

interface ComposerState {
  drafts: Record<string, { text: string; attachments: AttachmentUpload[] }>;
  setText: (key: string, text: string) => void;
  addFiles: (key: string, files: File[], sessionId: string) => void;
  removeAttachment: (key: string, id: string) => void;
  retryAttachment: (key: string, id: string, sessionId: string) => void;
  clear: (key: string) => void;
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  drafts: {},

  setText: (key, text) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [key]: { ...(s.drafts[key] || { attachments: [] }), text },
      },
    })),

  addFiles: (key, files, sessionId) => {
    const draft = get().drafts[key] || { text: "", attachments: [] };
    const newUploads = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      mime: file.type,
      size: file.size,
      file,
      progress: 0,
      state: "queued" as UploadState,
    }));

    set((s) => ({
      drafts: {
        ...s.drafts,
        [key]: { ...draft, attachments: [...draft.attachments, ...newUploads] },
      },
    }));

    newUploads.forEach((upload) => {
      uploadFile(sessionId, upload.file, (state, progress, error) => {
        set((s) => {
          const currentDraft = s.drafts[key];
          if (!currentDraft) return s;
          return {
            drafts: {
              ...s.drafts,
              [key]: {
                ...currentDraft,
                attachments: currentDraft.attachments.map((a) =>
                  a.id === upload.id ? { ...a, state, progress, error } : a,
                ),
              },
            },
          };
        });
      }).catch(() => {});
    });
  },

  removeAttachment: (key, id) =>
    set((s) => {
      const draft = s.drafts[key];
      if (!draft) return s;
      return {
        drafts: {
          ...s.drafts,
          [key]: {
            ...draft,
            attachments: draft.attachments.filter((a) => a.id !== id),
          },
        },
      };
    }),

  retryAttachment: (key, id, sessionId) => {
    const draft = get().drafts[key];
    const attachment = draft?.attachments.find((a) => a.id === id);
    if (!attachment) return;

    get().removeAttachment(key, id);
    get().addFiles(key, [attachment.file], sessionId);
  },

  clear: (key) =>
    set((s) => ({
      drafts: { ...s.drafts, [key]: { text: "", attachments: [] } },
    })),
}));
