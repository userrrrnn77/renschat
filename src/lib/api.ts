import type { User } from "../types";

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

export async function fetchApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...init?.headers,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("unauthorized"));
    }
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { error: { code: "UNKNOWN", message: res.statusText } };
    }
    throw new ApiError(
      res.status,
      errorData?.error?.code || "UNKNOWN",
      errorData?.error?.message || "Terjadi kesalahan",
      errorData?.error?.details,
    );
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  auth: {
    me: () => fetchApi<User>("/auth/me"),
    login: (body: any) =>
      fetchApi<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    register: (body: any) =>
      fetchApi<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    logout: () => fetchApi<void>("/auth/logout", { method: "POST" }),
  },
  sessions: {
    list: (query = "") => fetchApi<any>(`/sessions${query}`),
    create: (title?: string) =>
      fetchApi<any>("/sessions", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    get: (id: string, query = "") => fetchApi<any>(`/sessions/${id}${query}`),
    patch: (id: string, body: any) =>
      fetchApi<any>(`/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/sessions/${id}`, { method: "DELETE" }),
  },
  files: {
    presign: (body: any) =>
      fetchApi<any>("/files/presign", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    complete: (id: string) =>
      fetchApi<any>(`/files/${id}/complete`, { method: "POST" }),
    get: (id: string) => fetchApi<any>(`/files/${id}`),
    delete: (id: string) =>
      fetchApi<void>(`/files/${id}`, { method: "DELETE" }),
  },
};
