import type {
  ClaimDonationResponse,
  Entitlements,
  FileMeta,
  IndexStatus,
  JobInfo,
  MediaUrlResponse,
  User,
  Preferences,
  Personality,
  SavedNote,
  ServerMessage,
  SessionItem,
  UsageReport,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const AUTH_NO_REFRESH_PATHS = new Set<string>([
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh",
]);

let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const run = (async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  })();
  refreshPromise = run;
  void run.then(
    () => {
      if (refreshPromise === run) refreshPromise = null;
    },
    () => {
      if (refreshPromise === run) refreshPromise = null;
    },
  );
  return run;
}

function isBodyReusable(body: BodyInit | null | undefined): boolean {
  if (body == null) return true;
  if (typeof body === "string") return true;
  if (typeof Blob !== "undefined" && body instanceof Blob) return true;
  if (typeof FormData !== "undefined" && body instanceof FormData) return true;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams)
    return true;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer)
    return true;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body))
    return true;
  return false;
}

function buildInit(init?: RequestInit): RequestInit {
  const headers: Record<string, string> = {};
  if (init?.headers) {
    const src = init.headers;
    if (typeof Headers !== "undefined" && src instanceof Headers) {
      src.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(src)) {
      for (const [key, value] of src) headers[key] = String(value);
    } else {
      for (const [key, value] of Object.entries(src)) {
        if (typeof value === "string") headers[key] = value;
      }
    }
  }
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type",
  );
  if (init?.body != null && !hasContentType && typeof init.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  return {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  };
}

async function parseApiError(res: Response): Promise<ApiError> {
  let errorData: unknown;
  try {
    errorData = await res.json();
  } catch {
    errorData = { error: { code: "UNKNOWN", message: res.statusText } };
  }
  const payload = errorData as {
    error?: { code?: unknown; message?: unknown; details?: unknown };
  } | null;
  const error = payload?.error;
  return new ApiError(
    res.status,
    typeof error?.code === "string" && error.code ? error.code : "UNKNOWN",
    typeof error?.message === "string" && error.message
      ? error.message
      : "Terjadi kesalahan",
    error?.details,
  );
}

async function drainBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // ignore — body may already be locked/consumed
  }
}

/**
 * Fetch ke API origin yang sama dengan single-flight auth refresh.
 * 401 → POST /api/auth/refresh sekali → retry sekali.
 * Refresh gagal atau retry tetap 401 → dispatch `unauthorized`.
 * Body non-reusable (ReadableStream) tidak di-retry.
 * Request yang di-abort tidak dikonversi menjadi error auth.
 * Tidak untuk presigned R2 PUT — helper ini selalu credentials: "include".
 */
export async function fetchApiResponse(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE}/api${path}`;
  const canRefresh = !AUTH_NO_REFRESH_PATHS.has(path);
  const reusable = isBodyReusable(init?.body);

  const doFetch = (): Promise<Response> => fetch(url, buildInit(init));

  let res = await doFetch();

  if (res.status === 401 && canRefresh && reusable) {
    const refreshed = await refreshSession();
    if (init?.signal?.aborted) {
      await drainBody(res);
      throw new DOMException("Aborted", "AbortError");
    }
    if (refreshed) {
      await drainBody(res);
      res = await doFetch();
    }
  }

  if (res.status === 401 && canRefresh) {
    window.dispatchEvent(new Event("unauthorized"));
  }

  return res;
}

export async function fetchApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetchApiResponse(path, init);
  if (!res.ok) throw await parseApiError(res);
  if (res.status === 204) return {} as T;
  return res.json();
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
  timezone: string;
}

export interface SessionsListResponse {
  items: SessionItem[];
  nextCursor: string | null;
}

export interface SessionDetailResponse {
  messages: ServerMessage[];
  nextCursor: string | null;
  session?: Pick<SessionItem, "id" | "title" | "titleAuto">;
}

export interface PresignRequest {
  sessionId: string;
  name: string;
  mime: string;
  size: number;
  sha256?: string;
}

export interface PresignResponse {
  fileId: string;
  key: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export type FileCompleteResponse = Pick<
  FileMeta,
  "mime" | "status" | "indexStatus"
>;

export interface UpdatePreferencesBody {
  personality: Personality;
}

export const api = {
  auth: {
    me: () => fetchApi<User>("/auth/me"),
    login: (body: LoginBody) =>
      fetchApi<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    register: (body: RegisterBody) =>
      fetchApi<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    logout: () => fetchApi<void>("/auth/logout", { method: "POST" }),
  },
  sessions: {
    list: (query = "") => fetchApi<SessionsListResponse>(`/sessions${query}`),
    create: (title?: string) =>
      fetchApi<SessionItem>("/sessions", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    get: (id: string, query = "") =>
      fetchApi<SessionDetailResponse>(`/sessions/${id}${query}`),
    patch: (id: string, body: Partial<SessionItem>) =>
      fetchApi<SessionItem>(`/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/sessions/${id}`, { method: "DELETE" }),
  },
  files: {
    presign: (body: PresignRequest, signal?: AbortSignal) =>
      fetchApi<PresignResponse>("/files/presign", {
        method: "POST",
        body: JSON.stringify(body),
        ...(signal !== undefined ? { signal } : {}),
      }),
    complete: (id: string, signal?: AbortSignal) =>
      fetchApi<FileCompleteResponse>(`/files/${id}/complete`, {
        method: "POST",
        ...(signal !== undefined ? { signal } : {}),
      }),
    get: (id: string, signal?: AbortSignal) =>
      fetchApi<FileMeta>(`/files/${id}`, signal ? { signal } : undefined),
    delete: (id: string) =>
      fetchApi<void>(`/files/${id}`, { method: "DELETE" }),
    /** Presigned GET URL untuk <img>/<video>. Key R2 tidak pernah ke FE. */
    url: (id: string) => fetchApi<MediaUrlResponse>(`/files/${id}/url`),
  },
  me: {
    entitlements: () => fetchApi<Entitlements>("/me/entitlements"),
    /**
     * NOT present in the current backend contract dump. Kept only for
     * type compatibility with the dormant DonateCard/ClaimDonationDialog
     * components. Do not build new UI that relies on this endpoint until
     * the backend exposes it in the documented routes.
     */
    claimDonation: (body: { email: string; kofiTransactionId: string }) =>
      fetchApi<ClaimDonationResponse>("/me/donations/claim", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getPreferences: () => fetchApi<Preferences>("/me/preferences"),
    updatePreferences: (body: UpdatePreferencesBody) =>
      fetchApi<Preferences>("/me/preferences", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    usage: () => fetchApi<UsageReport>("/me/usage"),
    /**
     * Legacy saved-notes routes only. The newer `/api/memory` router is
     * NOT wired in the backend route index, so it must not be called
     * from the frontend. Each PUT replaces the whole array.
     */
    memory: {
      get: () => fetchApi<{ notes: SavedNote[] }>("/me/memory"),
      save: (notes: SavedNote[]) =>
        fetchApi<void>("/me/memory", {
          method: "PUT",
          body: JSON.stringify({ notes }),
        }),
      clear: () => fetchApi<void>("/me/memory", { method: "DELETE" }),
    },
  },
  jobs: {
    get: (id: string) => fetchApi<JobInfo>(`/jobs/${id}`),
  },
};
