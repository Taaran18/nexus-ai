"use client";

import { ChevronDown, KeyRound, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn, formatPrice } from "@/lib/utils";

const GROUP_LABEL: Record<string, string> = {
  fast: "Free · Fast",
  thorough: "Free · Slow & Thorough",
  new: "Free · New",
};

const TIER: Record<string, { label: string; tone: "brand" | "think" | "neutral" }> = {
  fast: { label: "Fast", tone: "brand" },
  balanced: { label: "Balanced", tone: "neutral" },
  deep: { label: "Deep", tone: "think" },
};

export function ModelPicker({ compact }: { compact?: boolean }) {
  const { catalog, providers, providerModels, loadProviderModels, choice, setChoice } =
    useWorkspace();
  const [loading, setLoading] = useState(false);
  const connected = providers.filter((p) => p.connected);

  const options = useMemo(() => {
    const list: SelectOption[] = [];
    const order = ["fast", "thorough", "new"];
    for (const group of order) {
      for (const model of catalog?.groq.filter((m) => m.group === group) ?? []) {
        list.push({
          value: `groq::${model.id}`,
          label: model.name,
          description: model.best_for,
          group: GROUP_LABEL[group],
          keywords: `${model.developer} groq free ${model.why}`,
          meta: model.preview ? (
            <Badge tone="success">Preview</Badge>
          ) : (
            <Badge tone="brand">Free</Badge>
          ),
        });
      }
    }
    for (const provider of connected) {
      for (const model of providerModels[provider.id] ?? []) {
        const tier = TIER[model.tier] ?? TIER.balanced;
        const price =
          model.price_in !== null && model.price_out !== null
            ? `${formatPrice(model.price_in)} in · ${formatPrice(model.price_out)} out per 1M tokens`
            : "Price not listed. Check the provider's pricing page.";
        list.push({
          value: `${provider.id}::${model.id}`,
          label: model.name,
          description: `${model.best_for} ${price}`,
          group: `${provider.name} · Your Key`,
          keywords: `${provider.name} ${model.id}`,
          meta: <Badge tone={tier.tone}>{tier.label}</Badge>,
        });
      }
    }
    if (!list.some((o) => o.value === `${choice.provider}::${choice.model}`)) {
      list.push({
        value: `${choice.provider}::${choice.model}`,
        label: choice.label,
        group: "Current",
      });
    }
    return list;
  }, [catalog, connected, providerModels, choice]);

  const onOpen = async (open: boolean) => {
    if (!open) return;
    const missing = connected.filter((p) => !providerModels[p.id]);
    if (!missing.length) return;
    setLoading(true);
    await Promise.allSettled(missing.map((p) => loadProviderModels(p.id)));
    setLoading(false);
  };

  return (
    <Select
      ariaLabel="Choose a model"
      value={`${choice.provider}::${choice.model}`}
      options={options}
      searchable={options.length > 8}
      searchPlaceholder="Search Models"
      onOpenChange={onOpen}
      floating={{
        side: "auto",
        matchWidth: false,
        width: 440,
        minWidth: 320,
        maxHeight: 480,
        align: "start",
      }}
      onChange={(value) => {
        const [provider, ...rest] = value.split("::");
        const model = rest.join("::");
        const option = options.find((o) => o.value === value);
        setChoice({ provider, model, label: option?.label ?? model });
      }}
      renderTrigger={(selected, open) => (
        <span
          className={cn(
            "inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg",
            open && "bg-surface-2 text-fg",
          )}
        >
          <Sparkles className="size-4 shrink-0 text-brand" aria-hidden />
          <span className={cn("truncate", compact && "max-sm:sr-only")}>
            {selected?.label ?? choice.label}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
      )}
      footer={
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 text-xs text-muted">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading your
                providers&apos; models
              </>
            ) : connected.length ? (
              `${connected.length} provider${connected.length > 1 ? "s" : ""} connected`
            ) : (
              "Free models from Groq"
            )}
          </span>
          <Link
            href="/settings?tab=models"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-hover"
          >
            <KeyRound className="size-3.5" aria-hidden />
            Add API Keys
          </Link>
        </div>
      }
    />
  );
}
