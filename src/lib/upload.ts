import { api } from "./api";
import type { AttachmentRef } from "../types";

export type UploadState =
  | "queued"
  | "presigning"
  | "uploading"
  | "completing"
  | "processing"
  | "ready"
  | "failed";

export interface AttachmentUpload extends AttachmentRef {
  file: File;
  progress: number;
  state: UploadState;
  error?: string;
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
  onState: (state: UploadState, progress: number, error?: string) => void,
  signal?: AbortSignal,
): Promise<AttachmentRef> => {
  try {
    onState("presigning", 0);
    const mime = resolveMime(file);
    const { fileId, uploadUrl, requiredHeaders } = await api.files.presign({
      sessionId,
      name: file.name,
      mime,
      size: file.size,
    });

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

      if (signal) {
        signal.addEventListener("abort", () => xhr.abort());
      }

      xhr.send(file);
    });

    onState("completing", 100);
    await api.files.complete(fileId);

    onState("processing", 100);
    let ready = false;
    let failed = false;
    let errorMsg = "";
    let attempts = 0;

    while (!ready && !failed && attempts < 80) {
      if (signal?.aborted) throw new Error("Aborted");
      await new Promise((r) => setTimeout(r, 1500));
      const meta = await api.files.get(fileId);
      if (meta.status === "ready") ready = true;
      else if (meta.status === "failed") {
        failed = true;
        errorMsg = meta.error || "Proses file gagal";
      }
      attempts++;
    }

    if (!ready) throw new Error("Timeout menunggu file siap");

    onState("ready", 100);
    return { id: fileId, name: file.name, mime, size: file.size };
  } catch (err: any) {
    onState("failed", 0, err.message || "Upload gagal");
    throw err;
  }
};
