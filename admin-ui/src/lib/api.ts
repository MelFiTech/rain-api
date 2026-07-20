import { clearSession, getSession } from "./session";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function buildHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getSession()?.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: buildHeaders(init?.headers),
  });

  if (res.status === 401 && !path.includes("/platform/auth/login")) {
    clearSession();
    window.location.href = "/admin/login";
    throw new ApiRequestError("Session expired.", 401);
  }

  if (!res.ok) {
    throw new ApiRequestError(await parseError(res), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
