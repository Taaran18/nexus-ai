import { api, download, streamEvents } from "@/lib/api/client";
import type {
  Catalog,
  ChatDetail,
  ChatSummary,
  DocumentFile,
  Folder,
  Me,
  MemoryItem,
  Overview,
  Preferences,
  ProviderInfo,
  ProviderModel,
  SourceChoice,
  Usage,
} from "@/lib/types";

export const meApi = {
  get: () => api<Me>("/me"),
  updatePreferences: (preferences: Preferences) =>
    api<Me>("/me", { method: "PATCH", body: { preferences } }),
  usage: () => api<Usage>("/me/usage"),
  overview: () => api<Overview>("/me/overview"),
  exportData: () => download("/me/export"),
  clearHistory: () => api<{ deleted: number }>("/me/history", { method: "DELETE" }),
  deleteEverything: () => api<void>("/me", { method: "DELETE" }),
};

export const chatApi = {
  list: () => api<ChatSummary[]>("/chats"),
  get: (id: string) => api<ChatDetail>(`/chats/${id}`),
  rename: (id: string, title: string) =>
    api<ChatSummary>(`/chats/${id}`, { method: "PATCH", body: { title } }),
  move: (id: string, folderId: string | null) =>
    api<ChatSummary>(`/chats/${id}`, {
      method: "PATCH",
      body: folderId ? { folder_id: folderId } : { clear_folder: true },
    }),
  remove: (id: string) => api<void>(`/chats/${id}`, { method: "DELETE" }),
  exportMarkdown: (id: string) => download(`/chats/${id}/export`),
  feedback: (chatId: string, messageId: string, rating: 1 | -1 | null) =>
    api<void>(`/chats/${chatId}/messages/${messageId}/feedback`, {
      method: "PATCH",
      body: { rating },
    }),
  send: (
    body: {
      message: string;
      chat_id?: string | null;
      provider: string;
      model: string;
      think: boolean;
      use_memory: boolean;
      source?: SourceChoice | null;
    },
    signal: AbortSignal,
  ) => streamEvents("/chat", body, signal),
  regenerate: (
    body: {
      chat_id: string;
      provider: string;
      model: string;
      think: boolean;
      use_memory: boolean;
      source?: SourceChoice | null;
    },
    signal: AbortSignal,
  ) => streamEvents("/chat/regenerate", body, signal),
};

export const folderApi = {
  list: () => api<Folder[]>("/folders"),
  create: (name: string, color: string) =>
    api<Folder>("/folders", { method: "POST", body: { name, color } }),
  update: (id: string, changes: { name?: string; color?: string }) =>
    api<Folder>(`/folders/${id}`, { method: "PATCH", body: changes }),
  remove: (id: string) => api<void>(`/folders/${id}`, { method: "DELETE" }),
};

export const documentApi = {
  list: () => api<DocumentFile[]>("/documents"),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<DocumentFile>("/documents/upload", { method: "POST", form });
  },
  remove: (id: string) => api<void>(`/documents/${id}`, { method: "DELETE" }),
  removeAll: () => api<{ deleted: number }>("/documents", { method: "DELETE" }),
};

export const memoryApi = {
  list: () => api<{ limit: number; items: MemoryItem[] }>("/memory"),
  save: (chatId: string) =>
    api<MemoryItem>("/memory", { method: "POST", body: { chat_id: chatId } }),
  remove: (chatId: string) => api<void>(`/memory/${chatId}`, { method: "DELETE" }),
};

export const voiceApi = {
  transcribe: (audio: Blob, filename: string) => {
    const form = new FormData();
    form.append("file", audio, filename);
    return api<{ text: string }>("/voice/transcribe", { method: "POST", form });
  },
};

export const modelApi = {
  catalog: () => api<Catalog>("/models"),
  providers: () => api<ProviderInfo[]>("/providers"),
  saveKey: (provider: string, apiKey: string) =>
    api<{ key_hint: string; models: ProviderModel[] }>(`/providers/${provider}/key`, {
      method: "PUT",
      body: { api_key: apiKey },
    }),
  removeKey: (provider: string) => api<void>(`/providers/${provider}/key`, { method: "DELETE" }),
  models: (provider: string) => api<ProviderModel[]>(`/providers/${provider}/models`),
};
