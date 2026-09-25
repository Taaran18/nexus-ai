"use client";

import { Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

const THEMES = [
  {
    value: "light",
    label: "Light",
    description: "Crisp white, best in bright rooms",
    bg: "#ffffff",
    panel: "#f6f8f8",
    line: "#e2e7e7",
    ink: "#0b1212",
    accent: "#0f766e",
  },
  {
    value: "dark",
    label: "Dark",
    description: "True black, easy on the eyes at night",
    bg: "#000000",
    panel: "#0f1111",
    line: "#222828",
    ink: "#f2f5f5",
    accent: "#2dd4bf",
  },
];

export function AppearanceSection() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <Card>
      <CardHeader
        title="Theme"
        description="Choose how Nexus looks. Your choice is saved on this device."
        icon={<Palette className="size-5" />}
      />
      <CardBody>
        <div role="radiogroup" aria-label="Theme" className="grid gap-4 sm:grid-cols-2">
          {THEMES.map((theme) => {
            const selected = mounted && resolvedTheme === theme.value;
            return (
              <button
                key={theme.value}
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(theme.value)}
                className={cn(
                  "overflow-hidden rounded-3xl border-2 text-left transition-colors",
                  selected ? "border-brand" : "border-border hover:border-border-strong",
                )}
              >
                <div className="flex h-32 gap-2 p-3" style={{ background: theme.bg }} aria-hidden>
                  <div
                    className="w-1/4 rounded-xl"
                    style={{ background: theme.panel, border: `1px solid ${theme.line}` }}
                  />
                  <div className="flex flex-1 flex-col justify-end gap-2">
                    <div
                      className="ml-auto h-4 w-1/2 rounded-full"
                      style={{ background: theme.panel }}
                    />
                    <div className="h-3 w-4/5 rounded-full" style={{ background: theme.line }} />
                    <div
                      className="h-8 rounded-2xl"
                      style={{ border: `1px solid ${theme.line}`, background: theme.panel }}
                    >
                      <div
                        className="mt-1.5 mr-1.5 ml-auto size-5 rounded-full"
                        style={{ background: theme.accent }}
                      />
                    </div>
                  </div>
                </div>
                <div className="border-border bg-surface flex items-center justify-between gap-3 border-t px-4 py-3">
                  <span>
                    <span className="text-fg block text-sm font-bold">{theme.label}</span>
                    <span className="text-muted block text-xs">{theme.description}</span>
                  </span>
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full border-2",
                      selected
                        ? "border-brand bg-brand-solid text-on-brand"
                        : "border-border-strong",
                    )}
                  >
                    {selected && <Check className="size-3.5" />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
