"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { MessageInput } from "@/components/MessageInput";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import {
  createFolder,
  deleteFolder,
  deleteSession,
  getFolders,
  getMessages,
  getSessions,
  regenerateChat,
  renameFolder,
  streamChat,
  updateSession,
} from "@/lib/api";
import type { ChatSession, Folder, Message, NodeStatus } from "@/lib/types";

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant");
  const [sidebarOpen, setSidebarOpen] = useState(true); // will be corrected for mobile on mount
  const [docsOpen, setDocsOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");

  // ── Start sidebar closed on mobile ───────────────────────────────────────
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // ── Load sessions + folders ───────────────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([getSessions(), getFolders()]);
      setSessions(s);
      setFolders(f);
    } catch (e) {
      console.error("[reload]", e);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId) ?? null,
    [sessions, currentSessionId],
  );

  // ── Session actions ───────────────────────────────────────────────────────
  const handleSelectSession = useCallback(async (id: string) => {
    setCurrentSessionId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
    try {
      setMessages(await getMessages(id));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id).catch(console.error);
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await reload();
    },
    [currentSessionId, reload],
  );

  const handleRenameSession = useCallback(
    async (id: string, title: string) => {
      await updateSession(id, { title }).catch(console.error);
      await reload();
    },
    [reload],
  );

  const handleMoveSession = useCallback(
    async (id: string, folderId: string | null) => {
      await updateSession(id, { folder_id: folderId }).catch(console.error);
      await reload();
    },
    [reload],
  );

  // ── Folder actions ────────────────────────────────────────────────────────
  const handleCreateFolder = useCallback(
    async (name: string, color: string) => {
      await createFolder(name, color).catch(console.error);
      await reload();
    },
    [reload],
  );

  const handleRenameFolder = useCallback(
    async (id: string, name: string) => {
      await renameFolder(id, name).catch(console.error);
      await reload();
    },
    [reload],
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      await deleteFolder(id).catch(console.error);
      await reload();
    },
    [reload],
  );

  // ── Shared stream consumer (used by chat + regenerate) ────────────────────
  const consumeStream = useCallback(
    async (
      generator: AsyncGenerator<import("@/lib/types").StreamEvent>,
      tempAiId: string,
      existingSessionId: string | null,
    ) => {
      let resolved = existingSessionId;
      setIsStreaming(true);
      setNodeStatus(null);

      try {
        for await (const event of generator) {
          if (event.type === "node_start" && event.node && event.label) {
            setNodeStatus({ node: event.node, label: event.label });
          } else if (event.type === "token" && event.content) {
            setNodeStatus(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAiId
                  ? {
                      ...m,
                      content: m.content + event.content,
                      session_id: event.session_id ?? m.session_id,
                    }
                  : m,
              ),
            );
            if (event.session_id && !resolved) {
              resolved = event.session_id;
              setCurrentSessionId(event.session_id);
            }
          } else if (event.type === "done") {
            if (event.session_id && !resolved)
              setCurrentSessionId(event.session_id);
            if (event.total_tokens || event.time_ms) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAiId
                    ? {
                        ...m,
                        total_tokens: event.total_tokens,
                        time_ms: event.time_ms,
                      }
                    : m,
                ),
              );
            }
            await reload();
          } else if (event.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAiId
                  ? { ...m, content: event.content ?? "An error occurred." }
                  : m,
              ),
            );
          }
        }
      } catch (e) {
        console.error("[consumeStream]", e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAiId
              ? {
                  ...m,
                  content:
                    "Could not reach the server. Is the backend running?",
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setNodeStatus(null);
      }
    },
    [reload],
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const tempAiId = `tmp-ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-user-${Date.now()}`,
          session_id: currentSessionId ?? "",
          role: "user",
          content,
          created_at: new Date().toISOString(),
        },
        {
          id: tempAiId,
          session_id: currentSessionId ?? "",
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ]);

      await consumeStream(
        streamChat(content, currentSessionId ?? undefined, selectedModel),
        tempAiId,
        currentSessionId,
      );
    },
    [currentSessionId, isStreaming, consumeStream, selectedModel],
  );

  // ── Regenerate last response ──────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!currentSessionId || isStreaming) return;

    // Remove last assistant message from local state
    setMessages((prev) => {
      const lastAiIdx = [...prev]
        .reverse()
        .findIndex((m) => m.role === "assistant");
      if (lastAiIdx === -1) return prev;
      const idx = prev.length - 1 - lastAiIdx;
      return prev.filter((_, i) => i !== idx);
    });

    const tempAiId = `tmp-regen-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempAiId,
        session_id: currentSessionId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      },
    ]);

    await consumeStream(
      regenerateChat(currentSessionId, selectedModel),
      tempAiId,
      currentSessionId,
    );
  }, [currentSessionId, isStreaming, consumeStream, selectedModel]);

  // ── Suggestion click ──────────────────────────────────────────────────────
  const handleSuggestion = useCallback((text: string) => {
    setSuggestionText(text);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        folders={folders}
        currentSessionId={currentSessionId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onMoveSession={handleMoveSession}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          nodeStatus={nodeStatus}
          currentSession={currentSession}
          folders={folders}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenDocs={() => setDocsOpen(true)}
          onSuggestion={handleSuggestion}
          onRegenerate={handleRegenerate}
        />
        <MessageInput
          onSend={handleSendMessage}
          isStreaming={isStreaming}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          initialValue={suggestionText}
          onInitialValueConsumed={() => setSuggestionText("")}
        />
      </div>

      {docsOpen && <DocumentsPanel onClose={() => setDocsOpen(false)} />}
    </div>
  );
}
