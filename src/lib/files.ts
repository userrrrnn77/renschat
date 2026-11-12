export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getExt = (name: string) =>
  name.split(".").pop()?.toLowerCase() || "";

export const isImage = (mime: string) => mime.startsWith("image/");
export const isPdf = (mime: string) => mime === "application/pdf";
export const isCode = (ext: string) =>
  [
    "ts",
    "tsx",
    "js",
    "jsx",
    "py",
    "rb",
    "go",
    "rs",
    "java",
    "kt",
    "swift",
    "c",
    "h",
    "cpp",
    "hpp",
    "cc",
    "sh",
    "sql",
    "css",
    "html",
    "xml",
    "yaml",
    "yml",
    "json",
    "toml",
    "ini",
  ].includes(ext);
