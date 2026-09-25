import { api, download, streamEvents } from "@/lib/api/client";
import type {
  AuthResponse,
  AuthSession,
  Catalog,
  ChatDetail,
  ChatSummary,
  DocumentFile,
  Folder,
  MemoryItem,
  Overview,
  Preferences,
  ProviderInfo,
  ProviderModel,
  User,
} from "@/lib/types";

export const authApi = {
  signup: (name: string, email: string, password: string) =>
    api<AuthResponse>("/auth/signup", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    }),
  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
  forgot: (email: string) =>
    api<{ status: string; email_delivery: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),
  reset: (token: string, password: string) =>
    api<{ status: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
      auth: false,
    }),
};

export const accountApi = {
  get: () => api<User>("/account"),
  update: (changes: { name?: string; preferences?: Preferences }) =>
    api<User>("/account", { method: "PATCH", body: changes }),
  changePassword: (current_password: string, new_password: string, sign_out_others: boolean) =>
    api<{ signed_out_sessions: number }>("/account/password", {
      method: "POST",
      body: { current_password, new_password, sign_out_others },
    }),
  changeEmail: (email: string, password: string) =>
    api<User>("/account/email", { method: "POST", body: { email, password } }),
  sessions: () => api<AuthSession[]>("/account/sessions"),
  revokeSession: (id: string) => api<void>(`/account/sessions/${id}`, { method: "DELETE" }),
  revokeOthers: () =>
    api<{ revoked: number }>("/account/sessions/revoke-others", { method: "POST" }),
  overview: () => api<Overview>("/account/overview"),
  exportData: () => download("/account/export"),
  clearHistory: () => api<{ deleted: number }>("/account/history", { method: "DELETE" }),
  deleteAccount: (password: string) =>
    api<void>("/account/delete", { method: "POST", body: { password } }),
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
    },
    signal: AbortSignal,
  ) => streamEvents("/chat", body, signal),
  regenerate: (
    body: { chat_id: string; provider: string; model: string; think: boolean; use_memory: boolean },
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

export const modelApi = {
  catalog: () => api<Catalog>("/models", { auth: false }),
  providers: () => api<ProviderInfo[]>("/providers"),
  saveKey: (provider: string, apiKey: string) =>
    api<{ key_hint: string; models: ProviderModel[] }>(`/providers/${provider}/key`, {
      method: "PUT",
      body: { api_key: apiKey },
    }),
  removeKey: (provider: string) => api<void>(`/providers/${provider}/key`, { method: "DELETE" }),
  models: (provider: string) => api<ProviderModel[]>(`/providers/${provider}/models`),
};
