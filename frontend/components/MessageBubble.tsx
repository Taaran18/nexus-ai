"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { sendFeedback } from "@/lib/api";
import { NodeProgress } from "./NodeProgress";
import type { Message, NodeStatus } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  nodeStatus?: NodeStatus | null;
  onRegenerate?: () => void;
}

/* ── Copy button ──────────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
    </button>
  );
}

/* ── Code block with copy ─────────────────────────────────────────────────── */
function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const lang = className?.replace("language-", "") ?? "code";
  const text = String(children).replace(/\n$/, "");
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-3 border-b border-border">
        <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{lang}</span>
        <CopyButton text={text} />
      </div>
      <pre className="p-4 overflow-x-auto bg-surface-2 scrollbar-thin m-0">
        <code className={`text-xs text-foreground-2 ${className ?? ""}`}>{children}</code>
      </pre>
    </div>
  );
}

/* ── MessageBubble ────────────────────────────────────────────────────────── */
export function MessageBubble({
  message,
  isStreaming,
  isLastAssistant,
  nodeStatus,
  onRegenerate,
}: MessageBubbleProps) {
  const [rating, setRating] = useState<number | null>(message.rating ?? null);
  const isUser = message.role === "user";

  const handleFeedback = async (value: 1 | -1) => {
    const next = rating === value ? null : value;
    setRating(next);
    if (next !== null) await sendFeedback(message.id, next);
  };

  /* ── User bubble ── */
  if (isUser) {
    return (
      <div className="flex justify-end gap-2 group animate-fade-up">
        <div className="relative max-w-[75%]">
          <div className="bg-accent text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm shadow-accent/20">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          {/* Copy on hover */}
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={message.content} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Assistant message ── */
  return (
    <div className="flex gap-3 animate-fade-up">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Bot size={14} className="text-white" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {/* Node progress (shown while loading, before tokens arrive) */}
        {isStreaming && !message.content && nodeStatus && (
          <NodeProgress currentNode={nodeStatus.node} currentLabel={nodeStatus.label} />
        )}

        {/* Typing dots (fallback while waiting for first node event) */}
        {isStreaming && !message.content && !nodeStatus && (
          <div className="flex gap-1.5 items-center h-7">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}

        {/* Content */}
        {message.content && (
          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
                  if (className?.includes("language-")) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  }
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded-md text-[13px] bg-surface-3 text-accent border border-border font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => (
                  <p className="text-sm leading-[1.75] text-foreground mb-3 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="text-sm space-y-1.5 mb-3 list-none pl-0">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="flex gap-2 text-foreground leading-relaxed">
                    <span className="mt-2.5 w-1 h-1 rounded-full bg-accent/60 shrink-0" />
                    <span>{children}</span>
                  </li>
                ),
                ol: ({ children }) => (
                  <ol className="text-sm space-y-1.5 mb-3 list-decimal list-inside text-foreground">{children}</ol>
                ),
                h1: ({ children }) => <h1 className="text-base font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold text-foreground mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mb-1.5 mt-2 first:mt-0">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent/50 pl-4 text-foreground-2 italic my-3">{children}</blockquote>
                ),
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-2 underline underline-offset-2">
                    {children}
                  </a>
                ),
                hr: () => <hr className="border-border my-4" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-xl border border-border scrollbar-thin">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-2 bg-surface-3 border-b border-border">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2.5 text-foreground border-b border-border last:border-0">{children}</td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-[3px] h-4 bg-accent cursor-blink ml-0.5 align-middle rounded-full" />
            )}
          </div>
        )}

        {/* Action bar — shown below completed messages */}
        {!isStreaming && message.content && (
          <div className="flex items-center justify-between mt-2">
            {/* Left: copy, thumbs, regenerate */}
            <div className="flex items-center gap-0.5">
              <CopyButton text={message.content} />

              <button
                onClick={() => handleFeedback(1)}
                className={`p-1.5 rounded-md transition-colors ${
                  rating === 1
                    ? "text-emerald-500 bg-emerald-500/10"
                    : "text-muted hover:text-foreground hover:bg-surface-2"
                }`}
                title="Good response"
              >
                <ThumbsUp size={13} />
              </button>

              <button
                onClick={() => handleFeedback(-1)}
                className={`p-1.5 rounded-md transition-colors ${
                  rating === -1
                    ? "text-red-400 bg-red-400/10"
                    : "text-muted hover:text-foreground hover:bg-surface-2"
                }`}
                title="Bad response"
              >
                <ThumbsDown size={13} />
              </button>

              {isLastAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>

            {/* Right: token count + time */}
            {(message.total_tokens || message.time_ms) && (
              <div className="flex items-center gap-2 text-[10px] text-muted select-none">
                {message.total_tokens ? (
                  <span title="Total tokens used">{message.total_tokens.toLocaleString()} tokens</span>
                ) : null}
                {message.total_tokens && message.time_ms ? (
                  <span className="text-border">·</span>
                ) : null}
                {message.time_ms ? (
                  <span title="Response time">
                    {message.time_ms < 1000
                      ? `${message.time_ms}ms`
                      : `${(message.time_ms / 1000).toFixed(1)}s`}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
