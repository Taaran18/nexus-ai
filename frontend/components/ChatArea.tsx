"use client";

import { useEffect, useRef } from "react";
import { Bot, Download, Library, PanelLeft } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { exportSession } from "@/lib/api";
import type { ChatSession, Folder, Message, NodeStatus } from "@/lib/types";

const SUGGESTIONS = [
  { icon: "🧠", title: "How does LangGraph work?",     sub: "Nodes, edges & conditional routing" },
  { icon: "🔍", title: "What is RAG in AI?",           sub: "Retrieval-Augmented Generation explained" },
  { icon: "🌐", title: "Latest AI news today",         sub: "Live web search via DuckDuckGo"  },
  { icon: "📄", title: "Summarise my uploaded document", sub: "Ask about your knowledge base" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  nodeStatus: NodeStatus | null;
  currentSession: ChatSession | null;
  folders: Folder[];
  onToggleSidebar: () => void;
  onOpenDocs: () => void;
  onSuggestion: (text: string) => void;
  onRegenerate: () => void;
}

export function ChatArea({
  messages,
  isStreaming,
  nodeStatus,
  currentSession,
  folders,
  onToggleSidebar,
  onOpenDocs,
  onSuggestion,
  onRegenerate,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const folderName = currentSession?.folder_id
    ? folders.find((f) => f.id === currentSession.folder_id)?.name
    : null;

  // Index of the last assistant message
  const lastAssistantIdx = messages.reduceRight(
    (acc, m, i) => (acc === -1 && m.role === "assistant" ? i : acc),
    -1
  );

  /* ── Empty / welcome state ─────────────────────────────────────────── */
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Mobile-only hamburger */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
            title="Open sidebar"
          >
            <PanelLeft size={16} />
          </button>
          <div className="flex-1" />
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-2 hover:text-foreground hover:bg-surface-2 border border-border transition-colors"
          >
            <Library size={13} />
            <span className="hidden sm:inline">Knowledge Base</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="relative mb-10">
            <div className="orb absolute inset-0 w-48 h-48 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 pointer-events-none" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-xl shadow-accent/25">
              <Bot size={26} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-1.5 tracking-tight">
            {greeting()}
          </h1>
          <p className="text-foreground-2 text-sm mb-10 text-center max-w-xs leading-relaxed">
            Powered by LangGraph &amp; Groq. Chat, search the web, or ask about your documents.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.title}
                onClick={() => onSuggestion(s.title)}
                className="group text-left px-4 py-3.5 rounded-xl border border-border bg-surface hover:border-accent/40 hover:bg-surface-2 transition-all shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none mt-0.5">{s.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                      {s.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{s.sub}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Chat messages ──────────────────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0">
        {/* Mobile-only hamburger */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors shrink-0"
          title="Open sidebar"
        >
          <PanelLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {folderName && (
            <p className="text-[10px] text-muted mb-0.5 flex items-center gap-1">
              <span>📁</span>
              <span>{folderName}</span>
              <span className="opacity-40 mx-0.5">/</span>
            </p>
          )}
          <h2 className="text-sm font-medium text-foreground truncate">
            {currentSession?.title ?? "New Chat"}
          </h2>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenDocs}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
            title="Knowledge base"
          >
            <Library size={15} />
          </button>
          {currentSession && (
            <button
              onClick={() => exportSession(currentSession.id)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
              title="Export as Markdown"
            >
              <Download size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && idx === messages.length - 1 && msg.role === "assistant"}
              isLastAssistant={idx === lastAssistantIdx}
              nodeStatus={
                isStreaming && idx === messages.length - 1 && msg.role === "assistant"
                  ? nodeStatus
                  : null
              }
              onRegenerate={idx === lastAssistantIdx ? onRegenerate : undefined}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
