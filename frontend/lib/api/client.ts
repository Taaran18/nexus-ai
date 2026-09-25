import { site } from "@/lib/config";
import type { AuthResponse, StreamEvent, User } from "@/lib/types";

const REFRESH_KEY = "nexus.refresh";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Listener = (user: User | null) => void;

let accessToken: string | null = null;
let accessExpiresAt = 0;
let refreshPromise: Promise<User | null> | null = null;
const listeners = new Set<Listener>();

function readRefresh() {
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeRefresh(value: string | null) {
  try {
    if (value) window.localStorage.setItem(REFRESH_KEY, value);
    else window.localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export function onAuthChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(user: User | null) {
  listeners.forEach((listener) => listener(user));
}

export function storeSession(response: AuthResponse) {
  accessToken = response.access_token;
  accessExpiresAt = Date.now() + response.expires_in * 1000;
  writeRefresh(response.refresh_token);
  emit(response.user);
}

export function clearSession(notify = true) {
  accessToken = null;
  accessExpiresAt = 0;
  writeRefresh(null);
  if (notify) emit(null);
}

export function hasStoredSession() {
  return Boolean(readRefresh());
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    const error = data?.error;
    if (error?.message) return new ApiError(response.status, error.code ?? "error", error.message);
  } catch {}
  if (response.status >= 500)
    return new ApiError(
      response.status,
      "server_error",
      "Nexus is having trouble right now. Try again in a moment.",
    );
  return new ApiError(response.status, "error", "That request didn't work. Try again.");
}

const networkError = () =>
  new ApiError(
    0,
    "network",
    "We couldn't reach Nexus. Check your internet connection and try again.",
  );

export function refreshSession(): Promise<User | null> {
  if (refreshPromise) return refreshPromise;
  const token = readRefresh();
  if (!token) return Promise.resolve(null);
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${site.apiUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token }),
      });
      if (response.status === 401) {
        clearSession();
        return null;
      }
      if (!response.ok) throw await parseError(response);
      const data = (await response.json()) as AuthResponse;
      storeSession(data);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw networkError();
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!accessToken || Date.now() > accessExpiresAt - 30_000) await refreshSession();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions, retry = true): Promise<Response> {
  const headers: Record<string, string> = options.auth === false ? {} : await authHeader();
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`${site.apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw networkError();
  }
  if (response.status === 401 && options.auth !== false && retry && readRefresh()) {
    accessToken = null;
    const user = await refreshSession();
    if (user) return send(path, options, false);
  }
  if (response.status === 401 && options.auth !== false) clearSession();
  return response;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function download(path: string) {
  const response = await send(path, {});
  if (!response.ok) throw await parseError(response);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "nexus-export";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function* streamEvents(
  path: string,
  body: unknown,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await send(path, { method: "POST", body, signal });
  if (!response.ok) throw await parseError(response);
  if (!response.body) throw networkError();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(6)) as StreamEvent;
      } catch {}
    }
  }
}
