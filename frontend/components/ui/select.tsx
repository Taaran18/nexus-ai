"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  floatingCss,
  useDismiss,
  useFloating,
  type FloatingOptions,
} from "@/components/ui/floating";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  group?: string;
  disabled?: boolean;
  keywords?: string;
}

interface SelectProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  renderTrigger?: (selected: SelectOption<T> | undefined, open: boolean) => React.ReactNode;
  floating?: FloatingOptions;
  footer?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  ariaLabel,
  id,
  disabled,
  searchable,
  searchPlaceholder = "Search",
  emptyText = "No matches. Try a different search.",
  className,
  triggerClassName,
  renderTrigger,
  floating,
  footer,
  onOpenChange,
}: SelectProps<T>) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", timer: 0 });
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const position = useFloating(open, triggerRef, { matchWidth: true, minWidth: 220, ...floating });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.value} ${o.description ?? ""} ${o.keywords ?? ""} ${o.group ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [options, query]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
      if (next) {
        setQuery("");
        const index = options.findIndex((o) => o.value === value);
        setActive(Math.max(0, index));
      }
    },
    [onOpenChange, options, value],
  );

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen]);

  useDismiss(
    open,
    useMemo(() => [triggerRef, panelRef], []),
    () => setOpen(false),
  );

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus();
      else listRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (option: SelectOption<T> | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  };

  const move = (delta: number) => {
    if (!filtered.length) return;
    let next = active;
    for (let i = 0; i < filtered.length; i++) {
      next = (next + delta + filtered.length) % filtered.length;
      if (!filtered[next].disabled) break;
    }
    setActive(next);
  };

  const onListKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(filtered.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
      window.clearTimeout(typeahead.current.timer);
      typeahead.current.text += event.key.toLowerCase();
      typeahead.current.timer = window.setTimeout(() => (typeahead.current.text = ""), 600);
      const index = filtered.findIndex((o) =>
        o.label.toLowerCase().startsWith(typeahead.current.text),
      );
      if (index >= 0) setActive(index);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : setOpen(true))}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          renderTrigger
            ? "outline-none"
            : "border-border bg-surface text-fg hover:border-border-strong focus-visible:border-brand flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-sm transition-colors disabled:opacity-60",
          open && !renderTrigger && "border-brand ring-brand-ring/30 ring-4",
          triggerClassName,
        )}
      >
        {renderTrigger ? (
          renderTrigger(selected, open)
        ) : (
          <>
            <span className="flex min-w-0 items-center gap-2">
              {selected?.icon}
              <span className={cn("truncate", !selected && "text-muted")}>
                {selected?.label ?? placeholder}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "text-muted size-4 shrink-0 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </>
        )}
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={floatingCss(position)}
            className="animate-pop-in border-border bg-surface shadow-pop z-[80] flex flex-col overflow-hidden rounded-2xl border"
          >
            {searchable && (
              <div className="border-border flex items-center gap-2 border-b px-3">
                <Search className="text-muted size-4" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onListKey}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listId}
                  aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
                  className="text-fg placeholder:text-muted h-11 w-full bg-transparent text-sm outline-none"
                />
              </div>
            )}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={searchable ? -1 : 0}
              aria-label={ariaLabel}
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              onKeyDown={onListKey}
              className="flex-1 scrollbar-thin overflow-y-auto p-1.5 outline-none"
            >
              {filtered.length === 0 && (
                <p className="text-muted px-3 py-6 text-center text-sm">{emptyText}</p>
              )}
              {filtered.map((option, index) => {
                const showGroup = option.group && option.group !== filtered[index - 1]?.group;
                const isSelected = option.value === value;
                return (
                  <Fragment key={option.value}>
                    {showGroup && (
                      <div className="text-muted px-3 pt-3 pb-1.5 text-[11px] font-bold tracking-wider uppercase first:pt-1.5">
                        {option.group}
                      </div>
                    )}
                    <div
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onMouseMove={() => active !== index && setActive(index)}
                      onClick={() => choose(option)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        index === active && "bg-surface-2",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {option.icon && <span className="mt-0.5 shrink-0">{option.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate font-medium",
                              isSelected ? "text-fg" : "text-fg",
                            )}
                          >
                            {option.label}
                          </span>
                          {option.meta}
                        </span>
                        {option.description && (
                          <span className="text-muted mt-0.5 block text-[13px] leading-snug">
                            {option.description}
                          </span>
                        )}
                      </span>
                      <Check
                        className={cn(
                          "text-brand mt-0.5 size-4 shrink-0",
                          !isSelected && "invisible",
                        )}
                        aria-hidden
                      />
                    </div>
                  </Fragment>
                );
              })}
            </div>
            {footer && <div className="border-border bg-bg-subtle border-t">{footer}</div>}
          </div>,
          document.body,
        )}
    </div>
  );
}
