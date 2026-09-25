"use client";

import {
  AlertTriangle,
  BookOpenText,
  Check,
  ChevronDown,
  Coins,
  FileText,
  Globe,
  KeyRound,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { CopyButton } from "@/components/chat/copy-button";
import { Markdown } from "@/components/chat/markdown";
import { LogoMark } from "@/components/brand/logo";
import { ClarifyCard } from "@/components/chat/clarify-card";
import { References } from "@/components/chat/references";
import type { LiveUsage, Message, SourceChoice } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const KEY_ERRORS = [
  "invalid_key",
  "missing_key",
  "service_unavailable",
  "quota_exceeded",
  "model_unavailable",
];

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
  onChooseSource,
}: {
  message: Message;
  steps?: Step[];
  streaming?: boolean;
  isLast?: boolean;
  showStats?: boolean;
  onRegenerate?: () => void;
  onRate?: (rating: 1 | -1 | null) => void;
  onChooseSource?: (choice: SourceChoice, remember: boolean) => void;
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

  const references = (message.sources ?? []).filter((s) => s.type === "document" && s.ref);
  const otherSources = (message.sources ?? []).filter((s) => !(s.type === "document" && s.ref));
  if (message.clarify) {
    return (
      <div className="flex animate-slide-up gap-3 sm:gap-4">
        <LogoMark className="mt-0.5 size-8" />
        <div className="min-w-0 flex-1">
          <ClarifyCard clarify={message.clarify} onChoose={(c, r) => onChooseSource?.(c, r)} />
        </div>
      </div>
    );
  }
  const waiting = streaming && !message.content;
  return (
    <div className="group flex animate-slide-up gap-3 sm:gap-4">
      <LogoMark className="mt-0.5 size-8" />
      <div className="min-w-0 flex-1 space-y-3">
        {streaming && message.live && <LiveMeter live={message.live} />}
        {message.source_mode === "documents" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
            <FileText className="size-3.5" aria-hidden />
            Answer From Your Documents
          </span>
        )}
        {message.source_mode === "ai" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-fg-2">
            <Sparkles className="size-3.5 text-brand" aria-hidden />
            General AI Answer
          </span>
        )}
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
            <Markdown
              content={message.content}
              citeId={references.length ? message.id : undefined}
            />
            {streaming && <span className="caret" aria-hidden />}
          </div>
        )}
        {references.length > 0 && <References sources={references} messageId={message.id} />}
        {otherSources.length > 0 && <Sources sources={otherSources} />}
        {message.error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
          >
            <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />
            <p className="flex-1 text-sm font-medium text-fg">{message.error}</p>
            {message.error_code && KEY_ERRORS.includes(message.error_code) && (
              <Link
                href="/settings?tab=models"
                className="inline-flex h-9 items-center gap-2 self-start rounded-xl px-3.5 text-sm font-bold text-brand hover:bg-surface sm:self-auto"
              >
                <KeyRound className="size-4" aria-hidden />
                Models & Keys
              </Link>
            )}
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
          <Actions message={message} isLast={isLast} onRegenerate={onRegenerate} onRate={onRate} />
        )}
        {!streaming && showStats && <ReplyStats message={message} />}
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

function liveTokens(live: LiveUsage) {
  return live.confirmed + Math.ceil(live.chars / 4);
}

function LiveMeter({ live }: { live: LiveUsage }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);
  const approximate = live.estimated || live.chars > 0;
  return (
    <div
      className="inline-flex items-center gap-3 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg-2 tabular-nums"
      aria-label="Live usage for this reply"
    >
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-brand" />
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Coins className="size-3.5 text-brand" aria-hidden />
        {approximate ? "≈ " : ""}
        {liveTokens(live).toLocaleString()} tokens
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Timer className="size-3.5 text-brand" aria-hidden />
        {((now - live.started) / 1000).toFixed(1)} s
      </span>
    </div>
  );
}

function ReplyStats({ message }: { message: Message }) {
  const total =
    message.total_tokens ??
    (message.live && liveTokens(message.live) ? liveTokens(message.live) : null);
  if (!message.time_ms && !total) return null;
  const estimated = message.tokens_estimated || (!message.total_tokens && Boolean(message.live));
  const verb = message.error ? "Failed after" : message.stopped ? "Stopped after" : "Answered in";
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
      {message.time_ms ? (
        <span className="inline-flex items-center gap-1.5">
          <Timer className="size-3.5" aria-hidden />
          {verb} {formatDuration(message.time_ms)}
        </span>
      ) : null}
      {total ? (
        <span
          className="inline-flex items-center gap-1.5"
          title={
            estimated
              ? "Estimated from the text length because the provider didn't report usage"
              : undefined
          }
        >
          <Coins className="size-3.5" aria-hidden />
          {estimated ? "≈ " : ""}
          {total.toLocaleString()} tokens
          {message.input_tokens && message.output_tokens
            ? ` (${message.input_tokens.toLocaleString()} in · ${message.output_tokens.toLocaleString()} out)`
            : ""}
        </span>
      ) : null}
      {message.model_label && <span>{message.model_label}</span>}
    </p>
  );
}

function Actions({
  message,
  isLast,
  onRegenerate,
  onRate,
}: {
  message: Message;
  isLast?: boolean;
  onRegenerate?: () => void;
  onRate?: (rating: 1 | -1 | null) => void;
}) {
  const persisted = !message.id.startsWith("tmp-");
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
    </div>
  );
}
