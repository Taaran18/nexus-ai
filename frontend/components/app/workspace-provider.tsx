"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { ApiError } from "@/lib/api/client";
import { accountApi, chatApi, folderApi, memoryApi, modelApi } from "@/lib/api/endpoints";
import type {
  Catalog,
  ChatSummary,
  Folder,
  MemoryItem,
  ModelChoice,
  Preferences,
  ProviderInfo,
  ProviderModel,
} from "@/lib/types";

interface WorkspaceValue {
  chats: ChatSummary[];
  chatsLoading: boolean;
  folders: Folder[];
  memory: { limit: number; items: MemoryItem[] };
  catalog: Catalog | null;
  catalogError: string | null;
  providers: ProviderInfo[];
  providerModels: Record<string, ProviderModel[]>;
  choice: ModelChoice;
  think: boolean;
  useMemory: boolean;
  preferences: Preferences;
  setChoice: (choice: ModelChoice) => void;
  setThink: (value: boolean) => void;
  updatePreferences: (changes: Preferences) => Promise<void>;
  refreshChats: () => Promise<void>;
  upsertChat: (chat: ChatSummary) => void;
  patchChat: (id: string, changes: Partial<ChatSummary>) => void;
  renameChat: (id: string, title: string) => Promise<void>;
  moveChat: (id: string, folderId: string | null) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  createFolder: (name: string, color: string) => Promise<Folder | null>;
  updateFolder: (id: string, changes: { name?: string; color?: string }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  refreshMemory: () => Promise<void>;
  saveMemory: (chatId: string) => Promise<boolean>;
  removeMemory: (chatId: string) => Promise<void>;
  refreshProviders: () => Promise<void>;
  loadProviderModels: (provider: string, force?: boolean) => Promise<ProviderModel[]>;
  setProviderModels: (provider: string, models: ProviderModel[]) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

const DEFAULT_CHOICE: ModelChoice = {
  provider: "groq",
  model: "openai/gpt-oss-20b",
  label: "GPT-OSS 20B",
};

function readStoredChoice(): ModelChoice | null {
  try {
    const raw = window.localStorage.getItem("nexus.model");
    return raw ? (JSON.parse(raw) as ModelChoice) : null;
  } catch {
    return null;
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [memory, setMemory] = useState<{ limit: number; items: MemoryItem[] }>({
    limit: 3,
    items: [],
  });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerModels, setProviderModelsState] = useState<Record<string, ProviderModel[]>>({});
  const [choice, setChoiceState] = useState<ModelChoice>(DEFAULT_CHOICE);
  const [think, setThinkState] = useState(false);
  const preferences = useMemo(() => user?.preferences ?? {}, [user]);
  const useMemory = preferences.use_memory !== false;

  const fail = useCallback(
    (title: string, error: unknown) => {
      toast.error(title, error instanceof ApiError ? error.message : "Try again in a moment.");
    },
    [toast],
  );

  const refreshChats = useCallback(async () => {
    try {
      setChats(await chatApi.list());
    } catch (error) {
      fail("Couldn't Load Your Chats", error);
    } finally {
      setChatsLoading(false);
    }
  }, [fail]);

  const refreshMemory = useCallback(async () => {
    try {
      setMemory(await memoryApi.list());
    } catch {}
  }, []);

  const refreshProviders = useCallback(async () => {
    try {
      setProviders(await modelApi.providers());
    } catch {}
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshChats();
      refreshMemory();
      refreshProviders();
      folderApi
        .list()
        .then(setFolders)
        .catch(() => {});
      modelApi
        .catalog()
        .then((data) => {
          setCatalog(data);
          setCatalogError(null);
        })
        .catch((error) =>
          setCatalogError(
            error instanceof ApiError ? error.message : "Couldn't load the model list.",
          ),
        );
      const stored = readStoredChoice();
      if (stored) setChoiceState(stored);
      try {
        setThinkState(window.localStorage.getItem("nexus.think") === "true");
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshChats, refreshMemory, refreshProviders]);

  useEffect(() => {
    if (!catalog || choice.provider !== "groq") return;
    if (!catalog.groq.some((m) => m.id === choice.model)) {
      const fallback = catalog.groq.find((m) => m.default) ?? catalog.groq[0];
      if (fallback) {
        const timer = window.setTimeout(
          () => setChoiceState({ provider: "groq", model: fallback.id, label: fallback.name }),
          0,
        );
        return () => window.clearTimeout(timer);
      }
    }
  }, [catalog, choice]);

  const setChoice = useCallback((next: ModelChoice) => {
    setChoiceState(next);
    try {
      window.localStorage.setItem("nexus.model", JSON.stringify(next));
    } catch {}
  }, []);

  const setThink = useCallback((value: boolean) => {
    setThinkState(value);
    try {
      window.localStorage.setItem("nexus.think", String(value));
    } catch {}
  }, []);

  const updatePreferences = useCallback(
    async (changes: Preferences) => {
      try {
        const updated = await accountApi.update({ preferences: changes });
        setUser(updated);
      } catch (error) {
        fail("Couldn't Save Your Preferences", error);
        throw error;
      }
    },
    [fail, setUser],
  );

  const upsertChat = useCallback((chat: ChatSummary) => {
    setChats((current) => [chat, ...current.filter((c) => c.id !== chat.id)]);
  }, []);

  const patchChat = useCallback((id: string, changes: Partial<ChatSummary>) => {
    setChats((current) => current.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }, []);

  const renameChat = useCallback(
    async (id: string, title: string) => {
      try {
        const updated = await chatApi.rename(id, title);
        setChats((current) => current.map((c) => (c.id === id ? { ...c, ...updated } : c)));
        toast.success("Chat Renamed");
      } catch (error) {
        fail("Couldn't Rename the Chat", error);
        throw error;
      }
    },
    [fail, toast],
  );

  const moveChat = useCallback(
    async (id: string, folderId: string | null) => {
      try {
        const updated = await chatApi.move(id, folderId);
        setChats((current) => current.map((c) => (c.id === id ? { ...c, ...updated } : c)));
        const folder = folders.find((f) => f.id === folderId);
        toast.success(folder ? `Moved to ${folder.name}` : "Removed From Folder");
      } catch (error) {
        fail("Couldn't Move the Chat", error);
        throw error;
      }
    },
    [fail, folders, toast],
  );

  const deleteChat = useCallback(
    async (id: string) => {
      try {
        await chatApi.remove(id);
        setChats((current) => current.filter((c) => c.id !== id));
        setMemory((current) => ({
          ...current,
          items: current.items.filter((m) => m.session_id !== id),
        }));
        toast.success("Chat Deleted");
      } catch (error) {
        fail("Couldn't Delete the Chat", error);
        throw error;
      }
    },
    [fail, toast],
  );

  const createFolder = useCallback(
    async (name: string, color: string) => {
      try {
        const folder = await folderApi.create(name, color);
        setFolders((current) => [...current, folder]);
        toast.success(
          "Folder Created",
          `“${folder.name}” is ready. Move chats into it from their menu.`,
        );
        return folder;
      } catch (error) {
        fail("Couldn't Create the Folder", error);
        throw error;
      }
    },
    [fail, toast],
  );

  const updateFolder = useCallback(
    async (id: string, changes: { name?: string; color?: string }) => {
      try {
        const folder = await folderApi.update(id, changes);
        setFolders((current) => current.map((f) => (f.id === id ? folder : f)));
        toast.success("Folder Updated");
      } catch (error) {
        fail("Couldn't Update the Folder", error);
        throw error;
      }
    },
    [fail, toast],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      try {
        await folderApi.remove(id);
        setFolders((current) => current.filter((f) => f.id !== id));
        setChats((current) =>
          current.map((c) => (c.folder_id === id ? { ...c, folder_id: null } : c)),
        );
        toast.success("Folder Deleted", "Its chats are now in your recent list.");
      } catch (error) {
        fail("Couldn't Delete the Folder", error);
        throw error;
      }
    },
    [fail, toast],
  );

  const saveMemory = useCallback(
    async (chatId: string) => {
      try {
        const item = await memoryApi.save(chatId);
        setMemory((current) => ({
          ...current,
          items: [...current.items.filter((m) => m.session_id !== chatId), item],
        }));
        setChats((current) =>
          current.map((c) => (c.id === chatId ? { ...c, in_memory: true } : c)),
        );
        toast.success("Saved to Memory", "Nexus will remember the key points from this chat.");
        return true;
      } catch (error) {
        fail("Couldn't Save to Memory", error);
        return false;
      }
    },
    [fail, toast],
  );

  const removeMemory = useCallback(
    async (chatId: string) => {
      try {
        await memoryApi.remove(chatId);
        setMemory((current) => ({
          ...current,
          items: current.items.filter((m) => m.session_id !== chatId),
        }));
        setChats((current) =>
          current.map((c) => (c.id === chatId ? { ...c, in_memory: false } : c)),
        );
        toast.success("Removed From Memory");
      } catch (error) {
        fail("Couldn't Remove the Memory", error);
        throw error;
      }
    },
    [fail, toast],
  );

  const loadProviderModels = useCallback(
    async (provider: string, force = false) => {
      if (!force && providerModels[provider]) return providerModels[provider];
      const models = await modelApi.models(provider);
      setProviderModelsState((current) => ({ ...current, [provider]: models }));
      return models;
    },
    [providerModels],
  );

  const setProviderModels = useCallback((provider: string, models: ProviderModel[]) => {
    setProviderModelsState((current) => ({ ...current, [provider]: models }));
  }, []);

  const value = useMemo<WorkspaceValue>(
    () => ({
      chats,
      chatsLoading,
      folders,
      memory,
      catalog,
      catalogError,
      providers,
      providerModels,
      choice,
      think,
      useMemory,
      preferences,
      setChoice,
      setThink,
      updatePreferences,
      refreshChats,
      upsertChat,
      patchChat,
      renameChat,
      moveChat,
      deleteChat,
      createFolder,
      updateFolder,
      deleteFolder,
      refreshMemory,
      saveMemory,
      removeMemory,
      refreshProviders,
      loadProviderModels,
      setProviderModels,
    }),
    [
      chats,
      chatsLoading,
      folders,
      memory,
      catalog,
      catalogError,
      providers,
      providerModels,
      choice,
      think,
      useMemory,
      preferences,
      setChoice,
      setThink,
      updatePreferences,
      refreshChats,
      upsertChat,
      patchChat,
      renameChat,
      moveChat,
      deleteChat,
      createFolder,
      updateFolder,
      deleteFolder,
      refreshMemory,
      saveMemory,
      removeMemory,
      refreshProviders,
      loadProviderModels,
      setProviderModels,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
