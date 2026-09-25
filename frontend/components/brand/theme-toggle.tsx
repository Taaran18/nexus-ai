"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted ? resolvedTheme === "dark" : true;
  const label = dark ? "Switch to Light Mode" : "Switch to Dark Mode";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 items-center gap-2.5 rounded-xl text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg",
        withLabel ? "w-full px-3 text-sm font-semibold" : "w-10 justify-center",
        className,
      )}
    >
      <span className="relative grid size-5 place-items-center">
        <Sun
          className={cn(
            "absolute size-5 transition-all duration-300",
            dark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          )}
        />
        <Moon
          className={cn(
            "absolute size-5 transition-all duration-300",
            dark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
          )}
        />
      </span>
      {withLabel && <span suppressHydrationWarning>{dark ? "Dark Mode" : "Light Mode"}</span>}
    </button>
  );
}
