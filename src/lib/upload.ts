// src/lib/upload.ts
import { api } from "./api";
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
}

export const resolveMime = (file: File): string => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "pdf"].includes(ext)
  ) {
    return file.type || (ext === "pdf" ? "application/pdf" : `image/${ext}`);
  }
  if (["docx", "xlsx", "pptx", "odt", "odp"].includes(ext)) {
    return file.type || `application/vnd.openxmlformats-officedocument.${ext}`;
  }
  if (ext === "md" || ext === "markdown") return "text/markdown";
  if (ext === "csv") return "text/csv";
  if (ext === "json") return "application/json";
  return "text/plain";
};

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

    throwIfAborted();
    onState("uploading", 0);
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

      xhr.send(file);
    });

    throwIfAborted();
    onState("completing", 100);
    await api.files.complete(fileId, signal);

    throwIfAborted();
    onState("processing", 100);
    let ready = false;
    let failed = false;
    let errorMsg = "";
    let finalIndexStatus: IndexStatus | null = null;
    let attempts = 0;

    while (!ready && !failed && attempts < 80) {
      throwIfAborted();
      await new Promise((r) => setTimeout(r, 1500));
      throwIfAborted();
      const meta = (await api.files.get(fileId)) as FileMeta;
      if (meta.status === "ready") {
        ready = true;
        finalIndexStatus = meta.indexStatus ?? null;
      } else if (meta.status === "failed") {
        failed = true;
        errorMsg = meta.error || "Proses file gagal";
      }
      attempts++;
    }

    if (!ready) {
      throw new Error(failed ? errorMsg : "Timeout menunggu file siap");
    }

    onState("ready", 100, undefined, finalIndexStatus);
    return { id: fileId, name: file.name, mime, size: file.size };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload gagal";
    onState("failed", 0, message);
    throw err;
  }
};
