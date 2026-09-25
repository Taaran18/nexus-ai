"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  floatingCss,
  useDismiss,
  useFloating,
  type FloatingOptions,
} from "@/components/ui/floating";
import { cn } from "@/lib/utils";

export type MenuItem =
  | {
      label: string;
      icon?: React.ReactNode;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      hint?: string;
    }
  | { separator: true }
  | { heading: string };

interface MenuProps {
  items: MenuItem[];
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    onKeyDown: (event: React.KeyboardEvent) => void;
  }) => React.ReactNode;
  floating?: FloatingOptions;
  onOpenChange?: (open: boolean) => void;
  ariaLabel?: string;
}

export function Menu({ items, trigger, floating, onOpenChange, ariaLabel }: MenuProps) {
  const [open, setOpenState] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const position = useFloating(open, triggerRef, { align: "end", minWidth: 220, ...floating });
  const actionable = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => "onSelect" in item && !item.disabled);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
      if (!next) setActive(-1);
    },
    [onOpenChange],
  );

  useDismiss(
    open,
    useMemo(() => [triggerRef, panelRef], []),
    () => setOpen(false),
  );

  useEffect(() => {
    if (open) requestAnimationFrame(() => panelRef.current?.focus());
  }, [open]);

  const select = (index: number) => {
    const item = items[index];
    if (!item || !("onSelect" in item) || item.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  };

  const move = (delta: number) => {
    if (!actionable.length) return;
    const position = actionable.findIndex(({ index }) => index === active);
    const next = (position + delta + actionable.length) % actionable.length;
    setActive(actionable[position === -1 && delta < 0 ? actionable.length - 1 : next].index);
  };

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen(!open),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onKeyDown: (event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive(actionable[0]?.index ?? -1);
          }
        },
      })}
      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={ariaLabel}
            tabIndex={-1}
            style={floatingCss(position)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                select(active);
              } else if (event.key === "Tab") {
                setOpen(false);
              }
            }}
            className="z-[80] animate-pop-in scrollbar-thin overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-pop outline-none"
          >
            {items.map((item, index) => {
              if ("separator" in item) return <div key={index} className="my-1.5 h-px bg-border" />;
              if ("heading" in item)
                return (
                  <div
                    key={index}
                    className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase"
                  >
                    {item.heading}
                  </div>
                );
              return (
                <div
                  key={index}
                  role="menuitem"
                  aria-disabled={item.disabled || undefined}
                  onMouseMove={() => !item.disabled && active !== index && setActive(index)}
                  onClick={() => select(index)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    item.danger ? "text-danger" : "text-fg",
                    index === active && (item.danger ? "bg-danger-soft" : "bg-surface-2"),
                    item.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  {item.icon && (
                    <span className={cn("shrink-0", item.danger ? "text-danger" : "text-muted")}>
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
