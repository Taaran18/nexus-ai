"use client";

import { Download, LayoutGrid, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/chat/copy-button";
import type { DecisionBoardData } from "@/lib/types";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 8) return "bg-success-soft text-success";
  if (score >= 5) return "bg-surface-2 text-fg";
  return "bg-danger-soft text-danger";
}

export function DecisionBoard({ board }: { board: DecisionBoardData }) {
  const initial = useMemo(
    () => Object.fromEntries(board.criteria.map((c) => [c.name, c.weight])),
    [board],
  );
  const [weights, setWeights] = useState<Record<string, number>>(initial);
  const changed = board.criteria.some((c) => weights[c.name] !== c.weight);

  const ranked = useMemo(() => {
    const total = board.criteria.reduce((sum, c) => sum + (weights[c.name] ?? 0), 0) || 1;
    return board.options
      .map((option) => ({
        ...option,
        score:
          board.criteria.reduce(
            (sum, c) => sum + (option.scores[c.name] ?? 0) * (weights[c.name] ?? 0),
            0,
          ) / total,
      }))
      .sort((a, b) => b.score - a.score);
  }, [board, weights]);

  const best = ranked[0]?.name;

  const markdown = useMemo(() => {
    const header = `| Option | ${board.criteria.map((c) => `${c.name} (×${weights[c.name]})`).join(" | ")} | Score |`;
    const divider = `| --- | ${board.criteria.map(() => "---").join(" | ")} | --- |`;
    const rows = ranked.map(
      (o) =>
        `| ${o.name} | ${board.criteria.map((c) => o.scores[c.name]).join(" | ")} | ${o.score.toFixed(1)} |`,
    );
    return [`## ${board.title}`, "", header, divider, ...rows, "", `Best fit: ${best}`].join("\n");
  }, [board, weights, ranked, best]);

  const downloadCsv = () => {
    const lines = [
      [
        "Option",
        ...board.criteria.map((c) => `${c.name} (weight ${weights[c.name]})`),
        "Weighted Score",
      ],
      ...ranked.map((o) => [
        o.name,
        ...board.criteria.map((c) => String(o.scores[c.name])),
        o.score.toFixed(2),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      board.title
        .replace(/[^\w -]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase() || "decision"
    }.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section
      aria-label="Decision board"
      className="overflow-hidden rounded-3xl border border-think/30 bg-surface shadow-card"
    >
      <header className="flex flex-col gap-3 border-b border-border bg-think-soft/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-think-soft text-think">
            <LayoutGrid className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-fg">{board.title}</h3>
            <p className="text-xs text-fg-2">
              Drag the weights to match what matters to you. Scores update instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {changed && (
            <button
              onClick={() => setWeights(initial)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-fg-2 hover:bg-surface hover:text-fg"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset
            </button>
          )}
          <CopyButton text={markdown} label="Copy board as Markdown" />
          <button
            onClick={downloadCsv}
            aria-label="Download board as CSV"
            title="Download CSV"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Download className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]">
        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-bold tracking-wider text-muted uppercase">
            What Matters
          </legend>
          {board.criteria.map((criterion) => (
            <label key={criterion.name} className="block">
              <span className="flex items-center justify-between text-sm font-semibold text-fg">
                {criterion.name}
                <span className="text-xs font-bold text-think tabular-nums">
                  ×{weights[criterion.name]}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={weights[criterion.name]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [criterion.name]: Number(e.target.value) }))
                }
                className="mt-1.5 w-full accent-[var(--think)]"
                aria-describedby={`why-${criterion.name}`}
              />
              {criterion.why && (
                <span id={`why-${criterion.name}`} className="block text-[11px] text-muted">
                  {criterion.why}
                </span>
              )}
            </label>
          ))}
        </fieldset>

        <div className="min-w-0 space-y-3">
          {board.criteria.length > 2 && (
            <p className="text-[11px] text-muted sm:hidden">
              Swipe the table to see every criterion.
            </p>
          )}
          <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead className="bg-bg-subtle text-[11px] font-bold tracking-wider text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Option
                  </th>
                  {board.criteria.map((c) => (
                    <th key={c.name} scope="col" className="px-2 py-2.5 text-center leading-tight">
                      {c.name}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((option) => (
                  <tr
                    key={option.name}
                    className={cn(
                      "border-t border-border transition-colors",
                      option.name === best && "bg-think-soft/60",
                    )}
                  >
                    <th scope="row" className="px-4 py-3 align-top">
                      <span className="flex items-center gap-1.5 font-bold text-fg">
                        {option.name === best && (
                          <Trophy className="size-4 text-think" aria-label="Best fit" />
                        )}
                        {option.name}
                      </span>
                      {option.summary && (
                        <span className="mt-0.5 block text-xs font-normal text-muted">
                          {option.summary}
                        </span>
                      )}
                    </th>
                    {board.criteria.map((c) => (
                      <td key={c.name} className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            "inline-grid size-8 place-items-center rounded-lg text-xs font-bold tabular-nums",
                            scoreTone(option.scores[c.name]),
                          )}
                        >
                          {option.scores[c.name]}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-display text-lg font-extrabold text-fg tabular-nums">
                      {option.score.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-fg-2">
            <span className="font-bold text-fg">Best fit with your weights: {best}.</span>{" "}
            {changed
              ? "You changed the weights, so this may differ from the original recommendation."
              : board.reason}
          </p>
        </div>
      </div>
    </section>
  );
}
