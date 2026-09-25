"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  FileSearch,
  Globe,
  LayoutGrid,
  Lightbulb,
  Loader2,
  PenLine,
  ScanSearch,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import type { PipelineStep } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const META: Record<string, { title: string; icon: LucideIcon; think?: boolean }> = {
  classify: { title: "Understand", icon: ScanSearch },
  retrieve: { title: "Documents", icon: FileSearch },
  web_search: { title: "Web Search", icon: Globe },
  deliberate: { title: "Think", icon: Lightbulb, think: true },
  generate: { title: "Write", icon: PenLine },
  decide: { title: "Decision Board", icon: LayoutGrid, think: true },
};

export function stepTitle(node: string) {
  return META[node]?.title ?? node;
}

function StepCard({ step: raw, finished }: { step: PipelineStep; finished?: boolean }) {
  const step = finished ? { ...raw, done: true } : raw;
  const meta = META[step.node] ?? { title: step.label, icon: Workflow };
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex min-w-[132px] flex-1 items-start gap-2.5 rounded-2xl border px-3 py-2.5 transition-colors sm:flex-none",
        step.done
          ? "border-border bg-surface"
          : meta.think
            ? "border-think/40 bg-think-soft"
            : "border-brand/40 bg-brand-soft",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
          meta.think ? "bg-think-soft text-think" : "bg-brand-soft text-brand",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-fg">
          {meta.title}
          {step.done ? (
            <Check className="size-3.5 text-success" aria-label="Done" />
          ) : (
            <Loader2 className="size-3.5 animate-spin text-muted" aria-label="Running" />
          )}
        </span>
        <span className="block text-[11px] text-muted tabular-nums">
          {step.done
            ? [
                step.ms !== undefined ? formatDuration(step.ms) : null,
                step.tokens ? `${step.tokens.toLocaleString()} tokens` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Done"
            : "Running"}
        </span>
        {step.done && step.detail && (
          <span className="block text-[11px] text-fg-2">{step.detail}</span>
        )}
      </span>
    </div>
  );
}

export function PipelineView({
  steps,
  live,
  totalMs,
}: {
  steps: PipelineStep[];
  live?: boolean;
  totalMs?: number | null;
}) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const sequence = steps.filter((s) => s.node !== "decide");
  const parallel = steps.filter((s) => s.node === "decide");
  const expanded = live || open;
  const route = sequence.map((s) => stepTitle(s.node)).join(" → ");

  return (
    <div className="space-y-2">
      {!live && (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg-2 transition-colors hover:border-border-strong hover:text-fg"
        >
          <Workflow className="size-3.5 shrink-0 text-brand" aria-hidden />
          <span className="truncate">
            Route: {route}
            {parallel.length ? " + Decision Board" : ""}
          </span>
          {totalMs ? (
            <span className="shrink-0 text-muted">· {formatDuration(totalMs)}</span>
          ) : null}
          <ChevronDown
            className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      )}
      {expanded && (
        <div className="animate-fade-in rounded-2xl border border-border bg-bg-subtle p-3">
          <p className="mb-2.5 text-[11px] font-bold tracking-wider text-muted uppercase">
            {live ? "LangGraph Pipeline · Live" : "LangGraph Pipeline · Route Taken"}
          </p>
          <ol className="flex flex-wrap items-center gap-2" aria-label="Pipeline steps">
            {sequence.map((step, index) => (
              <Fragment key={step.node}>
                {index > 0 && (
                  <ChevronRight
                    className="hidden size-4 shrink-0 text-muted sm:block"
                    aria-hidden
                  />
                )}
                <li className="contents">
                  <StepCard step={step} finished={!live} />
                </li>
              </Fragment>
            ))}
          </ol>
          {parallel.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
              <span className="text-[11px] font-semibold text-muted">In parallel with Write:</span>
              {parallel.map((step) => (
                <StepCard key={step.node} step={step} finished={!live} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
