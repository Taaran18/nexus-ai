"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

export interface FloatingOptions {
  align?: "start" | "end";
  side?: "bottom" | "top" | "auto";
  matchWidth?: boolean;
  offset?: number;
  minWidth?: number;
  maxHeight?: number;
  width?: number;
}

export interface FloatingStyle {
  top: number;
  left: number;
  width?: number;
  minWidth?: number;
  maxHeight: number;
  placement: "top" | "bottom";
}

export function useFloating(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  options: FloatingOptions = {},
) {
  const [style, setStyle] = useState<FloatingStyle | null>(null);
  const {
    align = "start",
    side = "auto",
    matchWidth = false,
    offset = 6,
    minWidth = 200,
    maxHeight = 420,
    width: fixedWidth,
  } = options;

  const update = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const below = viewportH - rect.bottom - offset - 12;
    const above = rect.top - offset - 12;
    const placement: "top" | "bottom" =
      side === "top"
        ? "top"
        : side === "bottom"
          ? "bottom"
          : below < 260 && above > below
            ? "top"
            : "bottom";
    const available = placement === "bottom" ? below : above;
    const width = matchWidth ? Math.max(rect.width, minWidth) : fixedWidth;
    const panelWidth = Math.min(width ?? minWidth, viewportW - 24);
    let left = align === "end" ? rect.right - panelWidth : rect.left;
    left = Math.max(12, Math.min(left, viewportW - panelWidth - 12));
    setStyle({
      top: placement === "bottom" ? rect.bottom + offset : rect.top - offset,
      left,
      width: width ? Math.min(width, viewportW - 24) : undefined,
      minWidth: width ? undefined : Math.min(minWidth, viewportW - 24),
      maxHeight: Math.max(160, Math.min(maxHeight, available)),
      placement,
    });
  }, [align, fixedWidth, matchWidth, maxHeight, minWidth, offset, side, triggerRef]);

  useLayoutEffect(() => {
    if (open) update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return style;
}

export function floatingCss(style: FloatingStyle): React.CSSProperties {
  return {
    position: "fixed",
    left: style.left,
    top: style.placement === "bottom" ? style.top : undefined,
    bottom: style.placement === "top" ? window.innerHeight - style.top : undefined,
    width: style.width,
    minWidth: style.minWidth,
    maxHeight: style.maxHeight,
  };
}

export function useDismiss(
  open: boolean,
  refs: Array<RefObject<HTMLElement | null>>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, refs, onDismiss]);
}
