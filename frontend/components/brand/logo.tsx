import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-brand-solid" />
      <path
        d="M10 22V10l12 12V10"
        fill="none"
        className="stroke-on-brand"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.6" className="fill-on-brand" />
      <circle cx="22" cy="22" r="2.6" className="fill-on-brand" />
      <circle cx="10" cy="22" r="1.8" className="fill-on-brand" />
      <circle cx="22" cy="10" r="1.8" className="fill-on-brand" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  compact,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-xl", className)}
      aria-label="Nexus AI home"
    >
      <LogoMark />
      {!compact && (
        <span className="font-display text-fg text-lg font-extrabold tracking-tight">
          Nexus<span className="text-brand"> AI</span>
        </span>
      )}
    </Link>
  );
}
