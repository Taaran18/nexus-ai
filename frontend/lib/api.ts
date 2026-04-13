import type {
  ChatSession,
  Folder,
  Message,
  NexusDocument,
  StreamEvent,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_URL}/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function searchSessions(q: string): Promise<ChatSession[]> {
  const res = await fetch(
    `${API_URL}/sessions/search?q=${encodeURIComponent(q)}`,
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
}

export async function updateSession(
  sessionId: string,
  data: { folder_id?: string | null; title?: string },
): Promise<ChatSession> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update session");
  return res.json();
}

export function exportSession(sessionId: string): void {
  window.open(`${API_URL}/sessions/${sessionId}/export`, "_blank");
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export async function getFolders(): Promise<Folder[]> {
  const res = await fetch(`${API_URL}/folders`);
  if (!res.ok) throw new Error("Failed to fetch folders");
  return res.json();
}

export async function createFolder(
  name: string,
  color: string,
): Promise<Folder> {
  const res = await fetch(`${API_URL}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to create folder");
  return res.json();
}

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<Folder> {
  const res = await fetch(`${API_URL}/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to rename folder");
  return res.json();
}

export async function deleteFolder(folderId: string): Promise<void> {
  const res = await fetch(`${API_URL}/folders/${folderId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

// ─── Chat stream ──────────────────────────────────────────────────────────────

export async function* streamChat(
  message: string,
  sessionId?: string,
  model?: string,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, model }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6)) as StreamEvent;
        } catch {
          /* skip */
        }
      }
    }
  }
}

export async function* regenerateChat(
  sessionId: string,
  model?: string,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_URL}/chat/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, model }),
  });
  if (!res.ok) throw new Error(`Regenerate failed: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6)) as StreamEvent;
        } catch {
          /* skip */
        }
      }
    }
  }
}

// ─── Message feedback ─────────────────────────────────────────────────────────

export async function sendFeedback(
  messageId: string,
  rating: 1 | -1,
): Promise<void> {
  await fetch(`${API_URL}/messages/${messageId}/feedback`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<NexusDocument[]> {
  const res = await fetch(`${API_URL}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocumentFile(file: File): Promise<{
  filename: string;
  chunks: number;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}
