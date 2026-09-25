"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/chat/copy-button";

const components: Components = {
  pre: ({ children }) => <>{children}</>,
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const text = String(children ?? "").replace(/\n$/, "");
    if (!match && !text.includes("\n")) {
      return (
        <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.88em] text-fg">
          {children}
        </code>
      );
    }
    return (
      <div className="not-prose my-4 overflow-hidden rounded-2xl border border-border bg-bg-subtle">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-1.5">
          <span className="font-mono text-xs font-semibold text-muted">{match?.[1] ?? "text"}</span>
          <CopyButton text={text} label="Copy code" />
        </div>
        <pre className="scrollbar-thin overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-fg">
          <code>{text}</code>
        </pre>
      </div>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="not-prose my-5 scrollbar-thin overflow-x-auto rounded-2xl border border-border shadow-card">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-2 text-fg">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-4 py-3 font-bold whitespace-nowrap">{children}</th>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-0 even:bg-bg-subtle">{children}</tr>
  ),
  td: ({ children }) => <td className="px-4 py-3 align-top text-fg-2">{children}</td>,
  img: () => null,
};

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="prose max-w-none text-[15px] leading-7 text-fg prose-neutral dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-headings:text-fg prose-p:my-3 prose-blockquote:border-l-brand prose-blockquote:text-fg-2 prose-strong:text-fg prose-li:my-1 prose-hr:border-border">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
