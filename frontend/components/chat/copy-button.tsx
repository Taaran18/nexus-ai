"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={cn(
        "text-muted hover:bg-surface-2 hover:text-fg inline-flex items-center gap-1.5 rounded-lg p-1.5 transition-colors",
        className,
      )}
    >
      {copied ? <Check className="text-success size-4" /> : <Copy className="size-4" />}
    </button>
  );
}
