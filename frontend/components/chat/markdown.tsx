"use client";

import { memo, useMemo } from "react";
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

const CITATION = /\[(\d{1,2})\](?!\()/g;

function linkCitations(content: string) {
  return content
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(CITATION, "[$1](#cite-$1)")))
    .join("");
}

export function scrollToReference(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.dataset.flash = "true";
  window.setTimeout(() => {
    delete target.dataset.flash;
  }, 1600);
}

export const Markdown = memo(function Markdown({
  content,
  citeId,
}: {
  content: string;
  citeId?: string;
}) {
  const withCitations = useMemo<Components>(
    () =>
      citeId
        ? {
            ...components,
            a: ({ href, children }) => {
              if (href?.startsWith("#cite-")) {
                const ref = href.slice(6);
                const target = `ref-${citeId}-${ref}`;
                return (
                  <a
                    href={`#${target}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToReference(target);
                    }}
                    aria-label={`Reference ${ref}`}
                    className="mx-0.5 inline-grid h-5 min-w-5 -translate-y-0.5 place-items-center rounded-md bg-brand-soft px-1 align-middle text-[11px] font-bold text-brand no-underline transition-colors hover:bg-brand-solid hover:text-on-brand"
                  >
                    {ref}
                  </a>
                );
              }
              return components.a
                ? (components.a as (props: object) => React.ReactNode)({ href, children })
                : null;
            },
          }
        : components,
    [citeId],
  );
  return (
    <div className="prose max-w-none text-[15px] leading-7 text-fg prose-neutral dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-headings:text-fg prose-p:my-3 prose-blockquote:border-l-brand prose-blockquote:text-fg-2 prose-strong:text-fg prose-li:my-1 prose-hr:border-border">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={withCitations}>
        {citeId ? linkCitations(content) : content}
      </ReactMarkdown>
    </div>
  );
});
