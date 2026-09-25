"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-border border-border bg-surface shadow-card mx-auto max-w-3xl divide-y overflow-hidden rounded-3xl border">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`faq-${index}`}
                onClick={() => setOpen(expanded ? null : index)}
                className="text-fg hover:bg-surface-2 flex w-full items-center justify-between gap-6 px-6 py-5 text-left text-base font-bold transition-colors"
              >
                {item.q}
                <Plus
                  className={cn(
                    "text-brand size-5 shrink-0 transition-transform duration-300",
                    expanded && "rotate-45",
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              id={`faq-${index}`}
              role="region"
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="text-fg-2 px-6 pb-6 text-[15px] leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
