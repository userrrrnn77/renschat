// src/hooks/useMediaUrl.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { MediaUrlResponse } from "../types";

const REFRESH_STALE_MS = 30 * 60_000;

export interface MediaUrlState {
  url: string | null;
  loading: boolean;
  expired: boolean;
  error: { code: string; message: string } | null;
  meta: MediaUrlResponse | null;
}

/**
 * Presigned GET URL untuk <img>/<video> (§7.4). Refetch saat:
 *   - mount
 *   - window focus bila hasil fetch terakhir > 30 menit
 *   - onError element media (retry sekali)
 * 410 ASSET_EXPIRED → `expired: true` (block menampilkan UI kedaluwarsa).
 */
export function useMediaUrl(fileId: string) {
  const [state, setState] = useState<MediaUrlState>({
    url: null,
    loading: true,
    expired: false,
    error: null,
    meta: null,
  });
  const lastFetchAtRef = useRef<number>(0);
  const retriedRef = useRef<boolean>(false);

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: prev.url === null }));
    try {
      const data = await api.files.url(fileId);
      lastFetchAtRef.current = Date.now();
      retriedRef.current = false;
      setState({
        url: data.url,
        loading: false,
        expired: false,
        error: null,
        meta: data,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setState({
          url: null,
          loading: false,
          expired: true,
          error: null,
          meta: null,
        });
        return;
      }
      setState({
        url: null,
        loading: false,
        expired: false,
        error:
          err instanceof ApiError
            ? { code: err.code, message: err.message }
            : {
                code: "UNKNOWN",
                message:
                  err instanceof Error ? err.message : "Gagal memuat media",
              },
        meta: null,
      });
    }
  }, [fileId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const onFocus = (): void => {
      if (lastFetchAtRef.current === 0) return;
      if (Date.now() - lastFetchAtRef.current > REFRESH_STALE_MS) {
        void refetch();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  /** Dipakai <img>/<video> onError: retry sekali sebelum menyerah. */
  const onError = useCallback(() => {
    if (retriedRef.current) return;
    retriedRef.current = true;
    void refetch();
  }, [refetch]);

  return { ...state, refetch, onError };
}

/** Format sisa waktu singkat: "Hilang dalam 23j 12m" / "Kedaluwarsa". */
export function formatRemaining(
  expiresAt: string | null | undefined,
): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Kedaluwarsa";
  const totalMin = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `Hilang dalam ${hours}j ${mins}m`;
  return `Hilang dalam ${mins}m`;
}
