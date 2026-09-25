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
      <div className="flex animate-slide-up justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-surface-2 px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-fg sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = streaming && !message.content;
  return (
    <div className="group flex animate-slide-up gap-3 sm:gap-4">
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
            className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
          >
            <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />
            <p className="flex-1 text-sm font-medium text-fg">{message.error}</p>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex h-9 items-center gap-2 self-start rounded-xl bg-surface px-3.5 text-sm font-bold text-fg shadow-card hover:bg-surface-2 sm:self-auto"
              >
                <RefreshCw className="size-4" aria-hidden />
                Try Again
              </button>
            )}
          </div>
        )}
        {message.stopped && !message.error && (
          <p className="text-sm font-medium text-muted">You stopped this reply.</p>
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
    <div className="overflow-hidden rounded-2xl border border-think/25 bg-think-soft/60">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        disabled={live}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <Lightbulb
          className={cn("size-4 shrink-0 text-think", live && "animate-pulse")}
          aria-hidden
        />
        <span className={cn("flex-1 text-sm font-bold text-think", live && "text-shimmer")}>
          {live ? "Thinking it through" : "Thought Process"}
          {engine && <span className="font-medium opacity-80"> · {engine}</span>}
        </span>
        {!live && (
          <ChevronDown
            className={cn("size-4 text-think transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        )}
      </button>
      {expanded && text && (
        <div className="max-h-80 scrollbar-thin overflow-y-auto border-t border-think/20 px-4 py-3 text-[14px] text-fg-2 [&_.prose]:text-[14px] [&_.prose]:text-fg-2">
          <Markdown content={text} />
        </div>
      )}
    </div>
  );
}

function Sources({ sources }: { sources: NonNullable<Message["sources"]> }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Sources</p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((source, index) => {
          const Icon = source.type === "web" ? Globe : BookOpenText;
          let host = "";
          try {
            host = source.url ? new URL(source.url).hostname.replace(/^www\./, "") : "";
          } catch {}
          const body = (
            <>
              <Icon className="size-3.5 shrink-0 text-brand" aria-hidden />
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg-2 transition-colors hover:border-brand hover:text-fg"
                >
                  {body}
                </a>
              ) : (
                <span
                  title={source.title}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg-2"
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
              "rounded-lg p-1.5 transition-colors hover:bg-surface-2",
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
              "rounded-lg p-1.5 transition-colors hover:bg-surface-2",
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
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <RefreshCw className="size-4" />
        </button>
      )}
      {showStats && stats.length > 0 && (
        <span className="ml-2 text-xs text-muted">{stats.join(" · ")}</span>
      )}
    </div>
  );
}
