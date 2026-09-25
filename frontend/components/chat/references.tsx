"use client";

import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

export function locationLabel(source: Source) {
  const parts: string[] = [];
  if (source.page) parts.push(`Page ${source.page}`);
  if (source.start_line) {
    parts.push(
      source.start_line === source.end_line
        ? `Line ${source.start_line}`
        : `Lines ${source.start_line}–${source.end_line}`,
    );
  }
  return parts.join(" · ");
}

function Reference({ source, anchor }: { source: Source; anchor: string }) {
  const [open, setOpen] = useState(false);
  const lines = (source.quote ?? "").split("\n").filter(Boolean);
  const location = locationLabel(source);
  return (
    <li
      id={anchor}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4 transition-shadow"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
          {source.ref}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <FileText className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="truncate font-bold text-fg">{source.title}</span>
            {location && <span className="text-xs font-semibold text-muted">{location}</span>}
          </p>
          {source.highlight && (
            <blockquote className="mt-2.5 border-l-2 border-brand pl-3 text-sm text-fg">
              <mark className="rounded bg-brand-soft px-1 py-0.5 text-fg">
                “{source.highlight}”
              </mark>
              {source.highlight_line ? (
                <span className="ml-2 text-xs font-semibold whitespace-nowrap text-brand">
                  {source.page ? `Page ${source.page}, ` : ""}Line {source.highlight_line}
                </span>
              ) : null}
            </blockquote>
          )}
          {lines.length > 0 && (
            <>
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-fg-2 hover:text-fg"
              >
                {open
                  ? "Hide Full Passage"
                  : source.highlight
                    ? "Show Full Passage"
                    : "Show Passage"}
                <ChevronDown
                  className={cn("size-3.5 transition-transform", open && "rotate-180")}
                  aria-hidden
                />
              </button>
              {open && (
                <div className="mt-2 rounded-xl bg-bg-subtle p-3 text-[13px] leading-relaxed text-fg-2">
                  {lines.map((line, index) => (
                    <p
                      key={index}
                      className={cn(
                        line === source.highlight && "rounded bg-brand-soft font-medium text-fg",
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function References({ sources, messageId }: { sources: Source[]; messageId: string }) {
  return (
    <section aria-label="References from your documents">
      <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">
        References From Your Documents
      </p>
      <ol className="space-y-2">
        {sources.map((source) => (
          <Reference
            key={`${source.ref}-${source.document_id}`}
            source={source}
            anchor={`ref-${messageId}-${source.ref}`}
          />
        ))}
      </ol>
    </section>
  );
}
