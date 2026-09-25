"use client";

import {
  AlertTriangle,
  BookOpenText,
  Check,
  ChevronDown,
  Globe,
  Lightbulb,
  Loader2,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { memo, useState } from "react";
import { CopyButton } from "@/components/chat/copy-button";
import { Markdown } from "@/components/chat/markdown";
import { LogoMark } from "@/components/brand/logo";
import type { Message } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export interface Step {
  node: string;
  label: string;
  done: boolean;
}

export const MessageItem = memo(function MessageItem({
  message,
  steps,
  streaming,
  isLast,
  showStats,
  onRegenerate,
  onRate,
}: {
  message: Message;
  steps?: Step[];
  streaming?: boolean;
  isLast?: boolean;
  showStats?: boolean;
  onRegenerate?: () => void;
  onRate?: (rating: 1 | -1 | null) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="animate-slide-up flex justify-end">
        <div className="bg-surface-2 text-fg max-w-[85%] rounded-3xl rounded-br-lg px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = streaming && !message.content;
  return (
    <div className="animate-slide-up group flex gap-3 sm:gap-4">
      <LogoMark className="mt-0.5 size-8" />
      <div className="min-w-0 flex-1 space-y-3">
        {steps && steps.length > 0 && streaming && <Pipeline steps={steps} />}
        {(message.thinking || (message.think && streaming)) && (
          <ThinkingPanel
            text={message.thinking ?? ""}
            engine={message.think_engine}
            live={Boolean(streaming && !message.content)}
          />
        )}
        {waiting && !message.thinking && (!steps || steps.length === 0) && (
          <p className="text-shimmer text-[15px] font-medium" role="status">
            Getting started…
          </p>
        )}
        {message.content && (
          <div aria-live={streaming ? "polite" : undefined} aria-busy={streaming || undefined}>
            <Markdown content={message.content} />
            {streaming && <span className="caret" aria-hidden />}
          </div>
        )}
        {message.sources && message.sources.length > 0 && <Sources sources={message.sources} />}
        {message.error && (
          <div
            role="alert"
            className="border-danger/30 bg-danger-soft flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
          >
            <AlertTriangle className="text-danger size-5 shrink-0" aria-hidden />
            <p className="text-fg flex-1 text-sm font-medium">{message.error}</p>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="bg-surface text-fg shadow-card hover:bg-surface-2 inline-flex h-9 items-center gap-2 self-start rounded-xl px-3.5 text-sm font-bold sm:self-auto"
              >
                <RefreshCw className="size-4" aria-hidden />
                Try Again
              </button>
            )}
          </div>
        )}
        {message.stopped && !message.error && (
          <p className="text-muted text-sm font-medium">You stopped this reply.</p>
        )}
        {!streaming && message.content && (
          <Actions
            message={message}
            isLast={isLast}
            showStats={showStats}
            onRegenerate={onRegenerate}
            onRate={onRate}
          />
        )}
      </div>
    </div>
  );
});

function Pipeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((step) => (
        <li
          key={step.node}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors",
            step.node === "deliberate" ? "bg-think-soft text-think" : "bg-brand-soft text-brand",
            step.done && "opacity-70",
          )}
        >
          {step.done ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          )}
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function ThinkingPanel({
  text,
  engine,
  live,
}: {
  text: string;
  engine?: string | null;
  live: boolean;
}) {
  const [open, setOpen] = useState(false);
  const expanded = live || open;
  return (
    <div className="border-think/25 bg-think-soft/60 overflow-hidden rounded-2xl border">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        disabled={live}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <Lightbulb
          className={cn("text-think size-4 shrink-0", live && "animate-pulse")}
          aria-hidden
        />
        <span className={cn("text-think flex-1 text-sm font-bold", live && "text-shimmer")}>
          {live ? "Thinking it through" : "Thought Process"}
          {engine && <span className="font-medium opacity-80"> · {engine}</span>}
        </span>
        {!live && (
          <ChevronDown
            className={cn("text-think size-4 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        )}
      </button>
      {expanded && text && (
        <div className="border-think/20 text-fg-2 [&_.prose]:text-fg-2 max-h-80 scrollbar-thin overflow-y-auto border-t px-4 py-3 text-[14px] [&_.prose]:text-[14px]">
          <Markdown content={text} />
        </div>
      )}
    </div>
  );
}

function Sources({ sources }: { sources: NonNullable<Message["sources"]> }) {
  return (
    <div>
      <p className="text-muted mb-2 text-xs font-bold tracking-wider uppercase">Sources</p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((source, index) => {
          const Icon = source.type === "web" ? Globe : BookOpenText;
          let host = "";
          try {
            host = source.url ? new URL(source.url).hostname.replace(/^www\./, "") : "";
          } catch {}
          const body = (
            <>
              <Icon className="text-brand size-3.5 shrink-0" aria-hidden />
              <span className="max-w-[220px] truncate">{host || source.title}</span>
            </>
          );
          return (
            <li key={`${source.title}-${index}`}>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  title={source.title}
                  className="border-border bg-surface text-fg-2 hover:border-brand hover:text-fg inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  {body}
                </a>
              ) : (
                <span
                  title={source.title}
                  className="border-border bg-surface text-fg-2 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                >
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Actions({
  message,
  isLast,
  showStats,
  onRegenerate,
  onRate,
}: {
  message: Message;
  isLast?: boolean;
  showStats?: boolean;
  onRegenerate?: () => void;
  onRate?: (rating: 1 | -1 | null) => void;
}) {
  const persisted = !message.id.startsWith("tmp-");
  const stats = [
    message.model_label,
    message.time_ms ? formatDuration(message.time_ms) : null,
    message.total_tokens ? `${message.total_tokens.toLocaleString()} tokens` : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 [&:has([aria-pressed=true])]:opacity-100">
      <CopyButton text={message.content} label="Copy reply" />
      {persisted && onRate && (
        <>
          <button
            onClick={() => onRate(message.rating === 1 ? null : 1)}
            aria-pressed={message.rating === 1}
            aria-label="Good reply"
            title="Good Reply"
            className={cn(
              "hover:bg-surface-2 rounded-lg p-1.5 transition-colors",
              message.rating === 1 ? "text-success" : "text-muted hover:text-fg",
            )}
          >
            <ThumbsUp className={cn("size-4", message.rating === 1 && "fill-current")} />
          </button>
          <button
            onClick={() => onRate(message.rating === -1 ? null : -1)}
            aria-pressed={message.rating === -1}
            aria-label="Bad reply"
            title="Bad Reply"
            className={cn(
              "hover:bg-surface-2 rounded-lg p-1.5 transition-colors",
              message.rating === -1 ? "text-danger" : "text-muted hover:text-fg",
            )}
          >
            <ThumbsDown className={cn("size-4", message.rating === -1 && "fill-current")} />
          </button>
        </>
      )}
      {isLast && onRegenerate && (
        <button
          onClick={onRegenerate}
          aria-label="Regenerate reply"
          title="Regenerate"
          className="text-muted hover:bg-surface-2 hover:text-fg rounded-lg p-1.5 transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      )}
      {showStats && stats.length > 0 && (
        <span className="text-muted ml-2 text-xs">{stats.join(" · ")}</span>
      )}
    </div>
  );
}
