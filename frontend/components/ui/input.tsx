"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";
import { cn, passwordStrength } from "@/lib/utils";

const inputBase =
  "h-11 w-full rounded-xl border border-border bg-surface text-[15px] text-fg placeholder:text-muted transition-colors outline-none hover:border-border-strong focus:border-brand focus:ring-4 focus:ring-brand-ring/30 disabled:opacity-60 aria-[invalid=true]:border-danger sm:text-sm";

export const inputClass = `${inputBase} px-3.5`;

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => React.ReactNode;
  action?: React.ReactNode;
}

export function Field({ label, hint, error, children, action }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-fg text-sm font-semibold">
          {label}
        </label>
        {action}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="text-danger text-[13px] font-medium">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted text-[13px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, showStrength, value, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const strength = passwordStrength(String(value ?? ""));
    const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-brand", "bg-success"];
    return (
      <div>
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            value={value}
            className={cn(inputBase, "pr-11 pl-3.5", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="text-muted hover:bg-surface-2 hover:text-fg absolute inset-y-0 right-1 my-auto grid size-9 place-items-center rounded-lg transition-colors"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {showStrength && String(value ?? "").length > 0 && (
          <div className="mt-2 flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    strength.level >= step ? colors[strength.level] : "bg-surface-3",
                  )}
                />
              ))}
            </div>
            <span className="text-fg-2 w-20 text-right text-xs font-semibold">
              {strength.label}
            </span>
          </div>
        )}
      </div>
    );
  },
);
