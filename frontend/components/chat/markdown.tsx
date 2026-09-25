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
        <code className="border-border bg-surface-2 text-fg rounded-md border px-1.5 py-0.5 font-mono text-[0.88em]">
          {children}
        </code>
      );
    }
    return (
      <div className="not-prose border-border bg-bg-subtle my-4 overflow-hidden rounded-2xl border">
        <div className="border-border bg-surface-2 flex items-center justify-between border-b px-4 py-1.5">
          <span className="text-muted font-mono text-xs font-semibold">{match?.[1] ?? "text"}</span>
          <CopyButton text={text} label="Copy code" />
        </div>
        <pre className="text-fg scrollbar-thin overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
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
      className="text-brand decoration-brand/40 hover:decoration-brand font-medium underline underline-offset-2"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="not-prose border-border shadow-card my-5 scrollbar-thin overflow-x-auto rounded-2xl border">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-2 text-fg">{children}</thead>,
  th: ({ children }) => (
    <th className="border-border border-b px-4 py-3 font-bold whitespace-nowrap">{children}</th>
  ),
  tr: ({ children }) => (
    <tr className="border-border even:bg-bg-subtle border-b last:border-0">{children}</tr>
  ),
  td: ({ children }) => <td className="text-fg-2 px-4 py-3 align-top">{children}</td>,
  img: () => null,
};

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert text-fg prose-headings:font-display prose-headings:font-bold prose-headings:text-fg prose-p:my-3 prose-strong:text-fg prose-li:my-1 prose-blockquote:border-l-brand prose-blockquote:text-fg-2 prose-hr:border-border max-w-none text-[15px] leading-7">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
