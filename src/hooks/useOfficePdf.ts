// src/hooks/useOfficePdf.ts
import { useEffect, useState } from "react";
import type { FileBlock } from "../types";
import { fetchApiResponse } from "../lib/api";

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export type OfficePdfErrorReason =
  | "expired"
  | "missing"
  | "unsupported"
  | "converter"
  | "load";

export type OfficePdfState =
  | { kind: "loading" }
  | { kind: "ready"; url: string }
  | { kind: "waiting-upload" }
  | { kind: "error"; reason: OfficePdfErrorReason };

export function isValidServerFileId(id: string): boolean {
  return OBJECT_ID_RE.test(id);
}

/**
 * Mengambil /office-preview.pdf untuk file Word/PowerPoint yang sudah tersimpan.
 * Identitas request = fileId + version; abort saat berpindah file. Object URL
 * dicabut saat url berubah atau unmount.
 */
export function useOfficePdf(file: FileBlock): OfficePdfState {
  const { fileId, version } = file;
  const requestKey = `${fileId}:${version ?? 1}`;
  const [result, setResult] = useState<{
    key: string;
    state: OfficePdfState;
  } | null>(null);

  useEffect(() => {
    if (!isValidServerFileId(fileId)) {
      setResult({ key: requestKey, state: { kind: "waiting-upload" } });
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | undefined;

    async function load() {
      try {
        const response = await fetchApiResponse(
          `/files/${encodeURIComponent(fileId)}/office-preview.pdf`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        if (!response.ok) {
          const reason: OfficePdfErrorReason =
            response.status === 410
              ? "expired"
              : response.status === 404
                ? "missing"
                : response.status === 415
                  ? "unsupported"
                  : response.status === 503
                    ? "converter"
                    : "load";
          setResult({ key: requestKey, state: { kind: "error", reason } });
          return;
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        setResult({
          key: requestKey,
          state: { kind: "ready", url: objectUrl },
        });
      } catch (err) {
        const aborted =
          (err as { name?: string } | null)?.name === "AbortError" ||
          controller.signal.aborted;
        if (aborted) return;
        setResult({
          key: requestKey,
          state: { kind: "error", reason: "load" },
        });
      }
    }

    void load();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, version, requestKey]);

  if (result?.key !== requestKey) return { kind: "loading" };
  return result.state;
}
