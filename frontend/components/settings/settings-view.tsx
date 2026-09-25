"use client";

import { Brain, Database, Gauge, Info, KeyRound, Palette, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageFrame } from "@/components/app/page-frame";
import { useWakeOnMount } from "@/components/app/workspace-provider";
import { AboutSection } from "@/components/settings/about-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { DataSection } from "@/components/settings/data-section";
import { MemorySection } from "@/components/settings/memory-section";
import { ModelsSection } from "@/components/settings/models-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import { UsageSection } from "@/components/settings/usage-section";
import { PageHeader, Tabs } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const TABS = [
  {
    value: "preferences",
    label: "Preferences",
    icon: SlidersHorizontal,
    description: "How chats behave",
  },
  {
    value: "models",
    label: "Models & Keys",
    icon: KeyRound,
    description: "Free models and your API keys",
  },
  { value: "memory", label: "Memory", icon: Brain, description: "Chats Nexus remembers" },
  { value: "usage", label: "Trial Usage", icon: Gauge, description: "Your daily limits" },
  { value: "appearance", label: "Appearance", icon: Palette, description: "Light or dark theme" },
  { value: "data", label: "Data & Privacy", icon: Database, description: "Export or delete data" },
  { value: "about", label: "About & Legal", icon: Info, description: "Policies and trial details" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export function SettingsView() {
  useWakeOnMount();
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.value === requested) ? (requested as Tab) : "preferences";
  const setTab = (value: Tab) => router.replace(`/settings?tab=${value}`, { scroll: false });

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Tune how Nexus answers, manage models and memory, and control your data."
      />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-6 space-y-1">
            {TABS.map((t) => {
              const active = t.value === tab;
              return (
                <li key={t.value}>
                  <button
                    onClick={() => setTab(t.value)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
                      active ? "bg-brand-soft" : "hover:bg-surface-2",
                    )}
                  >
                    <t.icon
                      className={cn("size-5 shrink-0", active ? "text-brand" : "text-muted")}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span
                        className={cn("block text-sm font-bold", active ? "text-brand" : "text-fg")}
                      >
                        {t.label}
                      </span>
                      <span className="block truncate text-xs text-muted">{t.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">
          <Tabs
            className="mb-6 lg:hidden"
            ariaLabel="Settings sections"
            value={tab}
            onChange={setTab}
            tabs={TABS.map((t) => ({
              value: t.value,
              label: t.label,
              icon: <t.icon className="size-4" aria-hidden />,
            }))}
          />
          <div
            className="space-y-6"
            role="tabpanel"
            aria-label={TABS.find((t) => t.value === tab)?.label}
          >
            {tab === "appearance" && <AppearanceSection />}
            {tab === "preferences" && <PreferencesSection />}
            {tab === "models" && <ModelsSection />}
            {tab === "memory" && <MemorySection />}
            {tab === "usage" && <UsageSection />}
            {tab === "data" && <DataSection />}
            {tab === "about" && <AboutSection />}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
