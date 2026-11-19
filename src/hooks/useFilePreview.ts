import { useEffect, useState } from "react";
import type { FileBlock } from "../types";

type PreviewState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "text"; text: string; truncated: boolean }
  | { kind: "blob"; url: string }
  | { kind: "error"; reason: "expired" | "missing" | "binary" | "load" };

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function useFilePreview(file: FileBlock): PreviewState {
  const { fileId, preview } = file;
  const requestKey = `${fileId}:${preview}`;

  const [result, setResult] = useState<{
    key: string;
    state: PreviewState;
  } | null>(null);

  useEffect(() => {
    if (preview === "none") return;

    const controller = new AbortController();
    let objectUrl: string | undefined;

    function publish(state: PreviewState) {
      if (!controller.signal.aborted) {
        setResult({ key: requestKey, state });
      }
    }

    async function load() {
      const isText = preview === "text" || preview === "code";
      const endpoint = isText ? "content" : "download";

      try {
        const response = await fetch(
          `${API_BASE}/api/files/${encodeURIComponent(fileId)}/${endpoint}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const reason =
            response.status === 410
              ? "expired"
              : response.status === 404
                ? "missing"
                : response.status === 415
                  ? "binary"
                  : "load";

          publish({ kind: "error", reason });
          return;
        }

        if (isText) {
          const data = await response.json();

          if (typeof data?.text !== "string") {
            publish({ kind: "error", reason: "load" });
            return;
          }

          publish({
            kind: "text",
            text: data.text,
            truncated: data.truncated === true,
          });
          return;
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        publish({ kind: "blob", url: objectUrl });
      } catch {
        if (!controller.signal.aborted) {
          publish({ kind: "error", reason: "load" });
        }
      }
    }

    void load();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, preview, requestKey]);

  if (preview === "none") return { kind: "none" };
  if (result?.key !== requestKey) return { kind: "loading" };
  return result.state;
}
