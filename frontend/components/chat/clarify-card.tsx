"use client";

import { FileSearch, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Clarify, SourceChoice } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClarifyCard({
  clarify,
  onChoose,
}: {
  clarify: Clarify;
  onChoose: (choice: SourceChoice, remember: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>(clarify.documents.map((d) => d.id));
  const [remember, setRemember] = useState(false);
  const multiple = clarify.documents.length > 1;
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <div className="rounded-3xl border border-brand/30 bg-surface p-5 shadow-card">
      <h3 className="text-base font-bold text-fg">Where Should I Look?</h3>
      <p className="mt-1 text-sm text-fg-2">{clarify.message}</p>

      {multiple ? (
        <fieldset className="mt-4">
          <legend className="text-xs font-bold tracking-wider text-muted uppercase">
            You have {clarify.documents.length} documents. Choose which to search.
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {clarify.documents.map((doc) => {
              const on = selected.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    on
                      ? "border-brand bg-brand-soft text-fg"
                      : "border-border text-fg-2 hover:border-border-strong",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(doc.id)}
                    className="size-4 accent-[var(--brand)]"
                  />
                  <span className="max-w-[220px] truncate">{doc.source}</span>
                  {doc.pages ? <span className="text-xs text-muted">{doc.pages} pages</span> : null}
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 text-xs font-bold">
            <button
              onClick={() => setSelected(clarify.documents.map((d) => d.id))}
              className="text-brand hover:text-brand-hover"
            >
              Select All
            </button>
            <button onClick={() => setSelected([])} className="text-fg-2 hover:text-fg">
              Clear
            </button>
          </div>
        </fieldset>
      ) : (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-bg-subtle px-3 py-2 text-sm font-semibold text-fg">
          <FileSearch className="size-4 text-brand" aria-hidden />
          {clarify.documents[0]?.source}
        </p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose({ mode: "documents", document_ids: selected }, remember)}
          disabled={selected.length === 0}
          className="flex min-w-0 items-start gap-3 rounded-2xl bg-brand-solid px-4 py-3 text-left text-on-brand shadow-card transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
        >
          <FileSearch className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-bold">Answer From My Documents</span>
            <span className="block text-xs font-medium opacity-85">
              Only uses {multiple ? `the ${selected.length} selected` : "this"} document
              {multiple && selected.length !== 1 ? "s" : ""}, with page and line references
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoose({ mode: "ai", document_ids: [] }, remember)}
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-fg transition-colors hover:border-border-strong hover:bg-surface-2"
        >
          <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-bold">Give a General AI Answer</span>
            <span className="block text-xs text-muted">
              Uses the model&apos;s knowledge and the web, not your files
            </span>
          </span>
        </button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-fg-2">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-4 accent-[var(--brand)]"
        />
        Remember my choice for this chat
      </label>
      <p className="mt-2 text-xs text-muted">
        This question hasn&apos;t used any of your trial messages yet.
      </p>
    </div>
  );
}
