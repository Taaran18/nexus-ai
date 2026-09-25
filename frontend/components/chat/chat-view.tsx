"use client";

import {
  AlertTriangle,
  ArrowDown,
  Brain,
  FileSearch,
  Gauge,
  Globe,
  Lightbulb,
  MessageSquareOff,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChatActions } from "@/components/app/chat-actions";
import { LogoMark } from "@/components/brand/logo";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Composer, type ComposerHandle } from "@/components/chat/composer";
import { MessageItem } from "@/components/chat/message-item";
import { useToast } from "@/components/providers/toast-provider";
import { LinkButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { ApiError } from "@/lib/api/client";
import { chatApi } from "@/lib/api/endpoints";
import type { Message, PipelineStep, SourceChoice, StreamEvent } from "@/lib/types";
import { cn, formatDateTime, greeting } from "@/lib/utils";

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

const SOURCE_KEY = "nexus.sources";

function readSourceChoice(chatId: string): SourceChoice | null {
  try {
    const map = JSON.parse(window.localStorage.getItem(SOURCE_KEY) ?? "{}");
    return map[chatId] ?? null;
  } catch {
    return null;
  }
}

function saveSourceChoice(chatId: string, choice: SourceChoice | null) {
  try {
    const map = JSON.parse(window.localStorage.getItem(SOURCE_KEY) ?? "{}");
    if (choice) map[chatId] = choice;
    else delete map[chatId];
    window.localStorage.setItem(SOURCE_KEY, JSON.stringify(map));
  } catch {}
}

const LIMIT_CODES = ["trial_limit", "chat_limit", "rate_limited"];

type LoadState = "idle" | "loading" | "missing" | "error";

export function ChatView() {
  const params = useSearchParams();
  const routeChat = params.get("c");
  const toast = useToast();
  const workspace = useWorkspace();
  const actions = useChatActions();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [notice, setNotice] = useState<{ code: string; message: string } | null>(null);
  const [remembered, setRemembered] = useState<SourceChoice | null>(null);
  const pendingRemember = useRef<SourceChoice | null>(null);
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
      setNotice(null);
      setRemembered(routeChat ? readSourceChoice(routeChat) : null);
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
    restore: { userId?: string; text?: string; chatId?: string | null },
  ) => {
    setStreaming(true);
    setSteps([]);
    stickRef.current = true;
    let terminal = false;
    const grow = (m: Message, text: string): Message =>
      m.live ? { ...m, live: { ...m.live, chars: m.live.chars + text.length } } : m;
    try {
      for await (const event of stream) {
        if (controller.signal.aborted) break;
        switch (event.type) {
          case "meta":
            if (!chatIdRef.current) {
              chatIdRef.current = event.chat_id;
              setChatId(event.chat_id);
              window.history.replaceState(null, "", `/?c=${event.chat_id}`);
              const now = new Date().toISOString();
              if (pendingRemember.current) {
                saveSourceChoice(event.chat_id, pendingRemember.current);
                pendingRemember.current = null;
              }
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
              ...current.filter((step) => step.node !== event.node),
              { node: event.node, label: event.label, done: false },
            ]);
            break;
          case "node_end": {
            const finished: PipelineStep = {
              node: event.node,
              label: event.label,
              ms: event.ms,
              tokens: event.tokens,
              detail: event.detail,
              done: true,
            };
            setSteps((current) =>
              current.map((step) => (step.node === event.node ? finished : step)),
            );
            updateAssistant(tempId, (m) => ({ ...m, pipeline: [...(m.pipeline ?? []), finished] }));
            break;
          }
          case "board":
            updateAssistant(tempId, (m) => ({ ...m, board: event.board }));
            break;
          case "sources":
            updateAssistant(tempId, (m) => ({ ...m, sources: event.sources }));
            break;
          case "thinking":
            updateAssistant(tempId, (m) =>
              grow({ ...m, thinking: (m.thinking ?? "") + event.content }, event.content),
            );
            break;
          case "token":
            updateAssistant(tempId, (m) =>
              grow({ ...m, content: m.content + event.content }, event.content),
            );
            break;
          case "usage":
            updateAssistant(tempId, (m) => ({
              ...m,
              input_tokens: event.input_tokens,
              output_tokens: event.output_tokens,
              total_tokens: event.total_tokens,
              tokens_estimated: event.estimated,
              live: m.live
                ? { ...m.live, confirmed: event.total_tokens, chars: 0, estimated: event.estimated }
                : m.live,
            }));
            break;
          case "title":
            workspace.patchChat(event.chat_id, { title: event.title });
            break;
          case "done":
            terminal = true;
            updateAssistant(tempId, () => ({ ...event.message }));
            workspace.patchChat(event.chat_id, {
              updated_at: event.message.created_at,
              message_count: messagesCount(event.chat_id),
            });
            break;
          case "clarify":
            terminal = true;
            updateAssistant(tempId, (m) => ({
              ...m,
              pending: false,
              live: undefined,
              clarify: {
                message: event.message,
                documents: event.documents,
                question: restore.text ?? "",
              },
            }));
            break;
          case "error":
            terminal = true;
            updateAssistant(tempId, (m) => ({
              ...m,
              error: event.message,
              error_code: event.code,
              pending: false,
              time_ms: m.live ? Date.now() - m.live.started : m.time_ms,
            }));
            break;
        }
      }
      if (!terminal) {
        const stopped = controller.signal.aborted;
        updateAssistant(tempId, (m) => ({
          ...m,
          pending: false,
          stopped,
          time_ms: m.live ? Date.now() - m.live.started : m.time_ms,
          error: stopped
            ? null
            : "The connection closed before Nexus finished replying. Your message was saved, so you can try again.",
          error_code: stopped ? null : "connection_closed",
        }));
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateAssistant(tempId, (m) => ({
          ...m,
          stopped: true,
          pending: false,
          time_ms: m.live ? Date.now() - m.live.started : m.time_ms,
        }));
      } else if (error instanceof ApiError && LIMIT_CODES.includes(error.code)) {
        setMessages((current) => current.filter((m) => m.id !== tempId && m.id !== restore.userId));
        if (restore.text) composerRef.current?.fill(restore.text);
        if (!restore.userId && restore.chatId) loadChat(restore.chatId);
        setNotice({ code: error.code, message: error.message });
      } else {
        const message =
          error instanceof ApiError
            ? error.message
            : "We lost the connection while writing the reply. Try again.";
        updateAssistant(tempId, (m) => ({
          ...m,
          error: message,
          error_code: error instanceof ApiError ? error.code : "network",
          pending: false,
        }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
      setSteps([]);
      workspace.refreshUsage();
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
    live: { started: Date.now(), confirmed: 0, chars: 0, estimated: true },
  });

  const send = async (text: string, sourceOverride?: SourceChoice) => {
    if (streaming) return;
    const source = sourceOverride ?? remembered;
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const assistant = tempAssistant();
    const userId = `tmp-u-${Date.now()}`;
    setMessages((current) => [
      ...current.filter((m, i) => !m.clarify && !(m.role === "user" && current[i + 1]?.clarify)),
      {
        id: userId,
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
        source,
      },
      controller.signal,
    );
    await consume(stream, assistant.id, controller, { userId, text, chatId: chatIdRef.current });
  };

  const regenerate = async () => {
    const id = chatIdRef.current;
    if (!id || streaming) return;
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const assistant = tempAssistant();
    const previous = [...messages].reverse().find((m) => m.role === "assistant" && m.source_mode);
    const source: SourceChoice | null =
      remembered ??
      (previous?.source_mode === "documents" || previous?.source_mode === "ai"
        ? { mode: previous.source_mode, document_ids: previous.document_ids ?? [] }
        : null);
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
        source,
      },
      controller.signal,
    );
    await consume(stream, assistant.id, controller, { chatId: id });
  };

  const chooseSource = (clarifyId: string, choice: SourceChoice, remember: boolean) => {
    const index = messages.findIndex((m) => m.id === clarifyId);
    const question = messages[index]?.clarify?.question ?? "";
    if (!question) return;
    setMessages((current) => current.filter((_, i) => i !== index && i !== index - 1));
    if (remember) {
      setRemembered(choice);
      if (chatIdRef.current) saveSourceChoice(chatIdRef.current, choice);
      else pendingRemember.current = choice;
    }
    send(question, choice);
  };

  const forgetSource = () => {
    setRemembered(null);
    pendingRemember.current = null;
    if (chatIdRef.current) saveSourceChoice(chatIdRef.current, null);
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
          action={<LinkButton href="/">Start a New Chat</LinkButton>}
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
              className="font-bold text-brand hover:text-brand-hover"
            >
              Try Again
            </button>
          }
        />
      </div>
    );
  }

  const empty = !chatId && messages.length === 0;
  const usage = workspace.usage;
  const userTurns = messages.filter((m) => m.role === "user").length;
  const dailyExhausted = usage ? usage.messages_left <= 0 : false;
  const chatFull = Boolean(chatId) && usage ? userTurns >= usage.max_turns_per_chat : false;
  const blocked = !streaming && (dailyExhausted || chatFull);
  const banner = dailyExhausted
    ? {
        tone: "danger" as const,
        text: `You've used today's ${usage?.messages_limit} trial messages. You can chat again after ${usage ? formatDateTime(usage.resets_at) : "midnight UTC"}.`,
        action: false,
      }
    : chatFull
      ? {
          tone: "think" as const,
          text: `This chat has reached the trial limit of ${usage?.max_turns_per_chat} messages. Start a new chat to keep going.`,
          action: true,
        }
      : notice
        ? { tone: "think" as const, text: notice.message, action: notice.code === "chat_limit" }
        : null;
  const usageLine = usage
    ? `${usage.messages_left} of ${usage.messages_limit} trial messages left today${chatId ? ` · ${Math.max(0, usage.max_turns_per_chat - userTurns)} left in this chat` : ""}`
    : null;
  const bannerNode = banner && (
    <div
      role="status"
      className={cn(
        "mb-3 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center",
        banner.tone === "danger"
          ? "border-danger/30 bg-danger-soft"
          : "border-think/30 bg-think-soft",
      )}
    >
      <Gauge
        className={cn("size-5 shrink-0", banner.tone === "danger" ? "text-danger" : "text-think")}
        aria-hidden
      />
      <p className="flex-1 text-sm font-medium text-fg">{banner.text}</p>
      {banner.action && (
        <LinkButton href="/" size="sm" className="self-start sm:self-auto">
          Start a New Chat
        </LinkButton>
      )}
    </div>
  );

  if (empty) {
    return (
      <div className="flex h-full scrollbar-thin flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-fg sm:text-5xl">{greeting()}</h1>
            <p className="mt-3 text-lg text-fg-2">What Can I Help You With Today?</p>
          </div>
          <div className="mt-9">
            {bannerNode}
            <Composer
              ref={composerRef}
              onSend={send}
              onStop={() => abortRef.current?.abort()}
              streaming={streaming}
              disabled={blocked}
              autoFocus
            />
            {usageLine && <p className="mt-2 text-center text-xs text-muted">{usageLine}</p>}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.title}
                onClick={() => {
                  if (s.think && !workspace.think) workspace.setThink(true);
                  composerRef.current?.fill(s.prompt);
                }}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    s.think ? "bg-think-soft text-think" : "bg-brand-soft text-brand",
                  )}
                >
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-bold text-fg">{s.title}</span>
              </button>
            ))}
          </div>
          {workspace.memory.items.length > 0 && workspace.useMemory && (
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted">
              <Brain className="size-4 text-brand" aria-hidden />
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
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
        <h1 className="min-w-0 truncate text-base font-bold text-fg">
          {chat?.title ?? "New Chat"}
        </h1>
        <div className="flex items-center gap-2">
          {chat?.in_memory && (
            <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand sm:inline-flex">
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
                  className="grid size-9 place-items-center rounded-xl text-fg-2 hover:bg-surface-2 hover:text-fg"
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
                  onChooseSource={(choice, remember) => chooseSource(message.id, choice, remember)}
                />
              );
            })
          )}
          {!streaming && loadState === "idle" && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 sm:gap-4">
              <LogoMark className="mt-0.5 size-8" />
              <div
                role="alert"
                className="flex flex-1 flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
              >
                <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />
                <p className="flex-1 text-sm font-medium text-fg">
                  This message didn&apos;t get a reply. The connection may have dropped or the model
                  was unavailable.
                </p>
                <button
                  onClick={regenerate}
                  className="inline-flex h-9 items-center gap-2 self-start rounded-xl bg-surface px-3.5 text-sm font-bold text-fg shadow-card hover:bg-surface-2 sm:self-auto"
                >
                  <RefreshCw className="size-4" aria-hidden />
                  Try Again
                </button>
              </div>
            </div>
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
            className="absolute -top-12 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full border border-border bg-surface text-fg shadow-pop hover:bg-surface-2"
          >
            <ArrowDown className="size-5" />
          </button>
        )}
        <div className="mx-auto w-full max-w-[880px]">
          {remembered && (
            <div className="mb-2 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg-2">
                {remembered.mode === "documents" ? (
                  <FileSearch className="size-3.5 text-brand" aria-hidden />
                ) : (
                  <Sparkles className="size-3.5 text-brand" aria-hidden />
                )}
                {remembered.mode === "documents"
                  ? `Answering from ${remembered.document_ids.length || "all"} document${remembered.document_ids.length === 1 ? "" : "s"} in this chat`
                  : "Giving general AI answers in this chat"}
                <button
                  onClick={forgetSource}
                  className="font-bold text-brand hover:text-brand-hover"
                >
                  Change
                </button>
              </span>
            </div>
          )}
          {bannerNode}
          <Composer
            ref={composerRef}
            onSend={send}
            onStop={() => abortRef.current?.abort()}
            streaming={streaming}
            disabled={blocked}
            placeholder="Reply to Nexus"
          />
          <p className="mt-2 text-center text-xs text-muted">
            Nexus can make mistakes. Check important information.
            {usageLine && <span className="max-sm:block"> {usageLine}.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
