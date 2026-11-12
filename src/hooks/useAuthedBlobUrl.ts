import { useState, useEffect } from "react";

const cache = new Map<string, string>();

export function useAuthedBlobUrl(fileId: string) {
  const [url, setUrl] = useState<string | null>(cache.get(fileId) || null);
  const [loading, setLoading] = useState(!url);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url) return;
    let active = true;

    async function fetchBlob() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || ""}/api/files/${fileId}/download`,
          {
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        cache.set(fileId, objUrl);
        if (active) {
          setUrl(objUrl);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchBlob();
    return () => {
      active = false;
    };
  }, [fileId, url]);

  return { url, loading, error };
}
