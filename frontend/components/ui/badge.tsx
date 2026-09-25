import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "think" | "success" | "danger" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-2 border-border",
  brand: "bg-brand-soft text-brand border-transparent",
  think: "bg-think-soft text-think border-transparent",
  success: "bg-success-soft text-success border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  warning: "bg-think-soft text-warning border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
