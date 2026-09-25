"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  icon,
  size = "sm",
  dismissible = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target =
        panel?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel)?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissibleRef.current) {
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === "Tab" && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="animate-fade-in bg-overlay absolute inset-0 backdrop-blur-[2px]"
        onClick={() => dismissible && onClose()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "animate-slide-up border-border bg-surface shadow-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border outline-none sm:rounded-3xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
        )}
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-fg text-lg font-bold">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="text-fg-2 mt-1.5 text-sm leading-relaxed">
                {description}
              </div>
            )}
          </div>
          {dismissible && (
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-muted hover:bg-surface-2 hover:text-fg -mt-1 -mr-2 rounded-xl p-2 transition-colors"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        {children && <div className="scrollbar-thin overflow-y-auto px-6 pt-5">{children}</div>}
        {footer && (
          <div className="border-border bg-bg-subtle mt-6 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
        {!footer && <div className="h-6" />}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  confirmText?: string;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  confirmText,
  children,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const blocked = Boolean(confirmText) && typed.trim() !== confirmText;

  const handleClose = () => {
    if (busy) return;
    setTyped("");
    onClose();
  };

  const run = async () => {
    if (blocked) return;
    setBusy(true);
    try {
      await onConfirm();
      setTyped("");
      onClose();
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      dismissible={!busy}
      icon={
        tone === "danger" ? (
          <span className="bg-danger-soft text-danger grid size-11 shrink-0 place-items-center rounded-2xl">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={run}
            loading={busy}
            disabled={blocked}
            data-autofocus={confirmText ? undefined : true}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {(children || confirmText) && (
        <div className="space-y-4">
          {children}
          {confirmText && (
            <label className="block space-y-1.5">
              <span className="text-fg-2 text-sm">
                Type <span className="text-fg font-mono font-semibold">{confirmText}</span> to
                confirm.
              </span>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                data-autofocus
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </label>
          )}
        </div>
      )}
    </Dialog>
  );
}
