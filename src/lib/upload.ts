import { pollFile } from "./filePolling";
// src/lib/upload.ts
import { api, ApiError } from "./api";
import i18n from "../i18n";
import type { AttachmentRef, FileMeta, IndexStatus } from "../types";

export type UploadState =
  | "queued"
  | "presigning"
  | "uploading"
  | "completing"
  | "processing"
  | "ready"
  | "failed";

export interface AttachmentUpload {
  localId: string;
  fileId: string | null;
  name: string;
  mime: string;
  size: number;
  localUrl?: string;
  file: File;
  progress: number;
  state: UploadState;
  error?: string;
  indexStatus?: IndexStatus | null;
  processingDeadline?: number;
}

export const resolveMime = (file: File): string => {
  const ext = file.name.split(".").pop()?.toLowerCase();

  // Sebagian OS memberi file source TypeScript MIME video/mp2t.
  // Backend tetap memeriksa isinya untuk membedakan source dan video.
  if (ext === "ts" || ext === "tsx") return "text/plain";

  return file.type || "application/octet-stream";
};

function describeUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "QUOTA_EXCEEDED":
        return i18n.t("upload.error.quotaExceeded");
      case "PAYLOAD_TOO_LARGE":
        return i18n.t("upload.error.payloadTooLarge");
      case "UPLOAD_MISSING":
        return i18n.t("upload.error.uploadMissing");
      case "SIZE_MISMATCH":
        return i18n.t("upload.error.sizeMismatch");
      case "HASH_MISMATCH":
        return i18n.t("upload.error.hashMismatch");
      case "UNSUPPORTED_MIME":
        return i18n.t("upload.error.unsupportedMime");
      default:
        // Contract: preserve backend code/message rather than flattening
        // every status into a generic toast.
        return err.message || i18n.t("upload.error.generic");
    }
  }
  if (err instanceof Error) {
    if (err.message.startsWith("Upload failed:")) {
      return i18n.t("upload.error.uploadFailed");
    }
    if (err.message === "Network error during upload") {
      return i18n.t("upload.error.networkError");
    }
    if (err.message.startsWith("File read failed")) {
      return i18n.t("upload.error.fileReadFailed");
    }
    if (err.message === "Timeout menunggu file siap") {
      return i18n.t("upload.error.processingTimeout");
    }
    return err.message;
  }
  return i18n.t("upload.error.generic");
}

export const uploadFile = async (
  sessionId: string,
  file: File,
  onState: (
    state: UploadState,
    progress: number,
    error?: string,
    indexStatus?: IndexStatus | null,
  ) => void,
  signal?: AbortSignal,
  onFileId?: (fileId: string, mime: string) => void,
): Promise<AttachmentRef> => {
  const throwIfAborted = (): void => {
    if (signal?.aborted) throw new Error("Aborted");
  };

  try {
    throwIfAborted();
    onState("presigning", 0);
    const mime = resolveMime(file);

    const { fileId, uploadUrl, requiredHeaders } = await api.files.presign(
      {
        sessionId,
        name: file.name,
        mime,
        size: file.size,
      },
      signal,
    );

    onFileId?.(fileId, mime);

    throwIfAborted();
    onState("uploading", 0);

    const payload = await file.arrayBuffer();
    throwIfAborted();

    if (payload.byteLength !== file.size) {
      throw new Error(
        `File read failed: expected ${file.size} bytes, read ${payload.byteLength}`,
      );
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      Object.entries(requiredHeaders).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v as string),
      );

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          onState("uploading", Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Aborted"));

      const onAbort = (): void => xhr.abort();
      if (signal) signal.addEventListener("abort", onAbort, { once: true });

      xhr.send(payload);
    });

    throwIfAborted();
    onState("completing", 100);
    const completed = (await api.files.complete(fileId, signal)) as Pick<
      FileMeta,
      "mime" | "status" | "indexStatus"
    >;

    const attachment: AttachmentRef = {
      id: fileId,
      name: file.name,
      mime: completed.mime,
      size: file.size,
    };

    if (completed.status === "ready") {
      onState("ready", 100, undefined, completed.indexStatus ?? null);
      return attachment;
    }

    throwIfAborted();
    onState("processing", 100);
    const meta = await pollFile(sessionId, fileId, signal);
    if (meta.status !== "ready") {
      throw new Error(meta.error || i18n.t("upload.error.processingFailed"));
    }
    onState("ready", 100, undefined, meta.indexStatus ?? null);
    return attachment;
  } catch (err: unknown) {
    if (
      signal?.aborted ||
      (err instanceof Error && err.message === "Aborted")
    ) {
      // User-initiated cancel: removeAttachment handles cleanup; keep the
      // attachment out of the "failed" state so the retry pill never flashes.
      throw err;
    }
    const message = describeUploadError(err);
    onState("failed", 0, message);
    throw err;
  }
};
