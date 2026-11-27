import { useEffect, useState } from "react";
import type { FileBlock } from "../types";

import { fetchApiResponse } from "../lib/api";
import { isPdfRenderableOffice, officeKind } from "../lib/officeKind";
import type { OfficePreview } from "../lib/officePreview";

type PreviewState =
  | { kind: "office"; data: OfficePreview }
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "text"; text: string; truncated: boolean }
  | { kind: "blob"; url: string }
  | { kind: "error"; reason: "expired" | "missing" | "binary" | "load" };

export function useFilePreview(file: FileBlock): PreviewState {
  const { fileId, preview, localFile } = file;
  const office = officeKind(file.name);
  const pdfOffice = isPdfRenderableOffice(office);
  const csv = file.name.split(".").pop()?.toLowerCase() === "csv";
  const textLike = preview === "text" || preview === "code" || csv;
  const requestKey = `${localFile ? "draft" : "saved"}:${fileId}:${preview}:${office ?? ""}:${textLike ? "text" : ""}`;

  const [result, setResult] = useState<{
    key: string;
    state: PreviewState;
  } | null>(null);

  useEffect(() => {
    // docx/pptx/ppt dirender sebagai PDF oleh OfficePdfViewer.
    if (pdfOffice) return;
    if (!office && preview === "none" && !textLike) return;

    const controller = new AbortController();
    let objectUrl: string | undefined;

    function publish(state: PreviewState) {
      if (!controller.signal.aborted) {
        setResult({ key: requestKey, state });
      }
    }

    async function load() {
      const isText = !office && textLike;
      const endpoint = isText ? "content" : "download";

      try {
        if (office === "xlsx") {
          let blob: Blob;
          if (localFile) blob = localFile;
          else {
            const response = await fetchApiResponse(
              `/files/${encodeURIComponent(fileId)}/download`,
              { signal: controller.signal },
            );
            if (!response.ok) {
              publish({
                kind: "error",
                reason:
                  response.status === 410
                    ? "expired"
                    : response.status === 404
                      ? "missing"
                      : "load",
              });
              return;
            }
            blob = await response.blob();
          }
          if (controller.signal.aborted) return;
          const { parseOffice } = await import("../lib/officePreview");
          publish({ kind: "office", data: await parseOffice(blob, office) });
          // Argument of type 'OfficeKind' is not assignable to parameter of type '"docx" | "xlsx" | "pptx"'.
          // Type '"ppt"' is not assignable to type '"docx" | "xlsx" | "pptx"'. Did you mean '"pptx"'?
          return;
        }
        if (localFile) {
          if (isText) {
            const limit = 200 * 1024;
            const text = await localFile.slice(0, limit).text();

            publish({
              kind: "text",
              text,
              truncated: localFile.size > limit,
            });
          } else {
            const blob =
              preview === "pdf"
                ? localFile.slice(0, localFile.size, "application/pdf")
                : localFile;

            objectUrl = URL.createObjectURL(blob);
            publish({ kind: "blob", url: objectUrl });
          }

          return;
        }

        const response = await fetchApiResponse(
          `/files/${encodeURIComponent(fileId)}/${endpoint}`,
          { signal: controller.signal },
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
  }, [fileId, preview, requestKey, localFile, office, pdfOffice]);

  if (pdfOffice) return { kind: "none" };
  if (!office && preview === "none" && !textLike) return { kind: "none" };
  if (result?.key !== requestKey) return { kind: "loading" };
  return result.state;
}
