import { site } from "@/lib/config";
import type { StreamEvent } from "@/lib/types";

const VISITOR_KEY = "nexus.visitor";
let memoryVisitor: string | null = null;

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createId() {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b: number) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function visitorId() {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = createId();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    memoryVisitor ||= createId();
    return memoryVisitor;
  }
}

export function resetVisitor() {
  try {
    window.localStorage.removeItem(VISITOR_KEY);
  } catch {}
  memoryVisitor = null;
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

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { "X-Visitor-Id": visitorId() };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  try {
    return await fetch(`${site.apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw networkError();
  }
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
