"use client";

import {
  ArrowDown,
  Brain,
  FileSearch,
  Globe,
  Lightbulb,
  MessageSquareOff,
  MoreHorizontal,
  PenLine,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChatActions } from "@/components/app/chat-actions";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Composer, type ComposerHandle } from "@/components/chat/composer";
import { MessageItem, type Step } from "@/components/chat/message-item";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { LinkButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { ApiError } from "@/lib/api/client";
import { chatApi } from "@/lib/api/endpoints";
import type { Message, StreamEvent } from "@/lib/types";
import { cn, firstName, greeting } from "@/lib/utils";

const SUGGESTIONS = [
  {
    icon: Globe,
    title: "What's New in AI This Week?",
    prompt:
      "What are the most important AI announcements from this week? Search the web and cite sources.",
  },
  {
    icon: Lightbulb,
    title: "Help Me Make a Decision",
    prompt: "Help me decide between two job offers. Ask me what you need to know first.",
    think: true,
  },
  {
    icon: FileSearch,
    title: "Summarise My Documents",
    prompt: "Summarise the key points from the documents in my knowledge base.",
  },
  {
    icon: PenLine,
    title: "Draft a Clear Email",
    prompt: "Draft a short, friendly email asking my team for feedback on a proposal by Friday.",
  },
];

type LoadState = "idle" | "loading" | "missing" | "error";

export function ChatView() {
  const params = useSearchParams();
  const routeChat = params.get("c");
  const { user } = useAuth();
  const toast = useToast();
  const workspace = useWorkspace();
  const actions = useChatActions();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const chatIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const stickRef = useRef(true);
  const chat = workspace.chats.find((c) => c.id === chatId) ?? null;
  const showStats = workspace.preferences.show_stats !== false;

  const loadChat = useCallback(async (id: string) => {
    setLoadState("loading");
    setMessages([]);
    try {
      const detail = await chatApi.get(id);
      if (chatIdRef.current !== id) return;
      setMessages(detail.messages);
      setLoadState("idle");
      stickRef.current = true;
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      );
    } catch (error) {
      if (chatIdRef.current !== id) return;
      if (error instanceof ApiError && error.status === 404) setLoadState("missing");
      else {
        setLoadError(error instanceof ApiError ? error.message : "Try again in a moment.");
        setLoadState("error");
      }
    }
  }, []);

  useEffect(() => {
    if (routeChat === chatIdRef.current) return;
    abortRef.current?.abort();
    chatIdRef.current = routeChat;
    const timer = window.setTimeout(() => {
      setChatId(routeChat);
      setSteps([]);
      setStreaming(false);
      if (routeChat) loadChat(routeChat);
      else {
        setMessages([]);
        setLoadState("idle");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [routeChat, loadChat]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickRef.current = bottom;
    if (bottom !== atBottom) setAtBottom(bottom);
  };

  const updateAssistant = (tempId: string, update: (m: Message) => Message) => {
    setMessages((current) => current.map((m) => (m.id === tempId ? update(m) : m)));
  };

  const consume = async (
    stream: AsyncGenerator<StreamEvent>,
    tempId: string,
    controller: AbortController,
  ) => {
    setStreaming(true);
    setSteps([]);
    stickRef.current = true;
    try {
      for await (const event of stream) {
        if (controller.signal.aborted) break;
        switch (event.type) {
          case "meta":
            if (!chatIdRef.current) {
              chatIdRef.current = event.chat_id;
              setChatId(event.chat_id);
              window.history.replaceState(null, "", `/chat?c=${event.chat_id}`);
              const now = new Date().toISOString();
              workspace.upsertChat({
                id: event.chat_id,
                title: "New Chat",
                folder_id: null,
                created_at: now,
                updated_at: now,
                message_count: 1,
              });
            }
            updateAssistant(tempId, (m) => ({
              ...m,
              model_label: event.model_label,
              think_engine: event.think_engine,
            }));
            break;
          case "node_start":
            setSteps((current) => [
              ...current.map((s) => ({ ...s, done: true })),
              { node: event.node, label: event.label, done: false },
            ]);
            break;
          case "sources":
            updateAssistant(tempId, (m) => ({ ...m, sources: event.sources }));
            break;
          case "thinking":
            updateAssistant(tempId, (m) => ({
              ...m,
              thinking: (m.thinking ?? "") + event.content,
            }));
            break;
          case "token":
            updateAssistant(tempId, (m) => ({ ...m, content: m.content + event.content }));
            break;
          case "title":
            workspace.patchChat(event.chat_id, { title: event.title });
            break;
          case "done":
            updateAssistant(tempId, () => ({ ...event.message }));
            workspace.patchChat(event.chat_id, {
              updated_at: event.message.created_at,
              message_count: messagesCount(event.chat_id),
            });
            break;
          case "error":
            updateAssistant(tempId, (m) => ({ ...m, error: event.message, pending: false }));
            break;
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateAssistant(tempId, (m) => ({ ...m, stopped: true, pending: false }));
      } else {
        const message =
          error instanceof ApiError
            ? error.message
            : "We lost the connection while writing the reply. Try again.";
        updateAssistant(tempId, (m) => ({ ...m, error: message, pending: false }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
      setSteps([]);
    }
  };

  const messagesCount = (id: string) => {
    const current = workspace.chats.find((c) => c.id === id);
    return (current?.message_count ?? 0) + 2;
  };

  const tempAssistant = (): Message => ({
    id: `tmp-a-${Date.now()}`,
    role: "assistant",
    content: "",
    created_at: new Date().toISOString(),
    think: workspace.think,
    think_engine: workspace.think ? (workspace.catalog?.think.engine ?? null) : null,
    pending: true,
  });

  const send = async (text: string) => {
    if (streaming) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const assistant = tempAssistant();
    setMessages((current) => [
      ...current,
      {
        id: `tmp-u-${Date.now()}`,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      },
      assistant,
    ]);
    const stream = chatApi.send(
      {
        message: text,
        chat_id: chatIdRef.current,
        provider: workspace.choice.provider,
        model: workspace.choice.model,
        think: workspace.think,
        use_memory: workspace.useMemory,
      },
      controller.signal,
    );
    await consume(stream, assistant.id, controller);
  };

  const regenerate = async () => {
    const id = chatIdRef.current;
    if (!id || streaming) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const assistant = tempAssistant();
    setMessages((current) => {
      const trimmed =
        current[current.length - 1]?.role === "assistant" ? current.slice(0, -1) : current;
      return [...trimmed, assistant];
    });
    const stream = chatApi.regenerate(
      {
        chat_id: id,
        provider: workspace.choice.provider,
        model: workspace.choice.model,
        think: workspace.think,
        use_memory: workspace.useMemory,
      },
      controller.signal,
    );
    await consume(stream, assistant.id, controller);
  };

  const rate = async (message: Message, rating: 1 | -1 | null) => {
    if (!chatIdRef.current) return;
    const previous = message.rating ?? null;
    setMessages((current) => current.map((m) => (m.id === message.id ? { ...m, rating } : m)));
    try {
      await chatApi.feedback(chatIdRef.current, message.id, rating);
      if (rating) toast.success("Thanks for the Feedback");
    } catch (error) {
      setMessages((current) =>
        current.map((m) => (m.id === message.id ? { ...m, rating: previous } : m)),
      );
      toast.error(
        "Couldn't Save Your Rating",
        error instanceof ApiError ? error.message : undefined,
      );
    }
  };

  if (loadState === "missing") {
    return (
      <div className="grid h-full place-items-center px-4">
        <EmptyState
          icon={<MessageSquareOff className="size-7" />}
          title="Chat Not Found"
          description="This chat doesn't exist or was deleted. Start a new one or pick another from the sidebar."
          action={<LinkButton href="/chat">Start a New Chat</LinkButton>}
        />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="grid h-full place-items-center px-4">
        <EmptyState
          icon={<MessageSquareOff className="size-7" />}
          title="Couldn't Open This Chat"
          description={loadError ?? "Try again in a moment."}
          action={
            <button
              onClick={() => routeChat && loadChat(routeChat)}
              className="text-brand hover:text-brand-hover font-bold"
            >
              Try Again
            </button>
          }
        />
      </div>
    );
  }

  const empty = !chatId && messages.length === 0;

  if (empty) {
    return (
      <div className="flex h-full scrollbar-thin flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
          <div className="text-center">
            <h1 className="text-fg text-4xl font-extrabold sm:text-5xl">
              {greeting()}, {firstName(user?.name)}
            </h1>
            <p className="text-fg-2 mt-3 text-lg">What Can I Help You With Today?</p>
          </div>
          <div className="mt-9">
            <Composer
              ref={composerRef}
              onSend={send}
              onStop={() => abortRef.current?.abort()}
              streaming={streaming}
              autoFocus
            />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.title}
                onClick={() => {
                  if (s.think && !workspace.think) workspace.setThink(true);
                  composerRef.current?.fill(s.prompt);
                }}
                className="group border-border bg-surface shadow-card hover:border-brand/40 flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    s.think ? "bg-think-soft text-think" : "bg-brand-soft text-brand",
                  )}
                >
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="text-fg text-sm font-bold">{s.title}</span>
              </button>
            ))}
          </div>
          {workspace.memory.items.length > 0 && workspace.useMemory && (
            <p className="text-muted mt-6 flex items-center justify-center gap-2 text-center text-sm">
              <Brain className="text-brand size-4" aria-hidden />
              Nexus remembers {workspace.memory.items.length} saved chat
              {workspace.memory.items.length > 1 ? "s" : ""}.
            </p>
          )}
        </div>
      </div>
    );
  }

  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  return (
    <div className="flex h-full flex-col">
      <header className="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <h1 className="text-fg min-w-0 truncate text-base font-bold">
          {chat?.title ?? "New Chat"}
        </h1>
        <div className="flex items-center gap-2">
          {chat?.in_memory && (
            <span className="bg-brand-soft text-brand hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold sm:inline-flex">
              <Brain className="size-3.5" aria-hidden />
              In Memory
            </span>
          )}
          {chat && (
            <Menu
              ariaLabel="Chat options"
              items={actions.chatMenu(chat)}
              trigger={(props) => (
                <button
                  {...props}
                  aria-label="Chat options"
                  className="text-fg-2 hover:bg-surface-2 hover:text-fg grid size-9 place-items-center rounded-xl"
                >
                  <MoreHorizontal className="size-5" />
                </button>
              )}
            />
          )}
        </div>
      </header>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 scrollbar-thin overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-[880px] space-y-8 px-4 py-8 sm:px-6">
          {loadState === "loading" ? (
            <div className="space-y-6" role="status" aria-label="Loading chat">
              <Skeleton className="ml-auto h-12 w-2/3" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="ml-auto h-12 w-1/2" />
            </div>
          ) : (
            messages.map((message, index) => {
              const live =
                streaming && index === messages.length - 1 && message.role === "assistant";
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  steps={live ? steps : undefined}
                  streaming={live}
                  isLast={index === lastAssistantIndex}
                  showStats={showStats}
                  onRegenerate={index === lastAssistantIndex && !streaming ? regenerate : undefined}
                  onRate={(rating) => rate(message, rating)}
                />
              );
            })
          )}
        </div>
      </div>
      <div className="relative shrink-0 px-4 pt-2 pb-4 sm:px-6">
        {!atBottom && (
          <button
            onClick={() => {
              stickRef.current = true;
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              });
            }}
            aria-label="Jump to latest message"
            className="border-border bg-surface text-fg shadow-pop hover:bg-surface-2 absolute -top-12 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full border"
          >
            <ArrowDown className="size-5" />
          </button>
        )}
        <div className="mx-auto w-full max-w-[880px]">
          <Composer
            ref={composerRef}
            onSend={send}
            onStop={() => abortRef.current?.abort()}
            streaming={streaming}
            placeholder="Reply to Nexus"
          />
          <p className="text-muted mt-2 text-center text-xs">
            Nexus can make mistakes. Check important information.
          </p>
        </div>
      </div>
    </div>
  );
}
