export type OfficeKind = "docx" | "xlsx" | "pptx" | "ppt";

export function officeKind(name: string): OfficeKind | null {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "docx" ||
    extension === "xlsx" ||
    extension === "pptx" ||
    extension === "ppt"
    ? extension
    : null;
}

/** docx/pptx/ppt dirender lewat GET /api/files/:id/office-preview.pdf. */
export function isPdfRenderableOffice(
  kind: OfficeKind | null,
): kind is "docx" | "pptx" | "ppt" {
  return kind === "docx" || kind === "pptx" || kind === "ppt";
}