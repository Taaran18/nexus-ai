"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-fg-2">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50",
          checked ? "border-brand-solid bg-brand-solid" : "border-border-strong bg-surface-3",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow-card transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-2">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const baseId = useId();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex scrollbar-thin gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1",
        className,
      )}
      onKeyDown={(event) => {
        const index = tabs.findIndex((t) => t.value === value);
        if (event.key === "ArrowRight") onChange(tabs[(index + 1) % tabs.length].value);
        if (event.key === "ArrowLeft")
          onChange(tabs[(index - 1 + tabs.length) % tabs.length].value);
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`${baseId}-${tab.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              selected ? "bg-surface text-fg shadow-card" : "text-fg-2 hover:text-fg",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mx-auto flex max-w-3xl flex-col items-center py-8 text-center sm:py-12">
      {eyebrow && (
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">{eyebrow}</p>
      )}
      <h1 className="mt-3 text-4xl font-extrabold text-fg sm:text-5xl">{title}</h1>
      {description && (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-2 sm:text-lg">
          {description}
        </p>
      )}
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </header>
  );
}
