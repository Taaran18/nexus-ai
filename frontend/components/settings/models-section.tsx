"use client";

import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, PasswordInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { modelApi } from "@/lib/api/endpoints";
import type { ProviderInfo, ProviderModel } from "@/lib/types";
import { formatContext, formatPrice, relativeTime } from "@/lib/utils";

const GROUP_TONE = { fast: "brand", thorough: "think", new: "success" } as const;
const TIER = {
  fast: { label: "Fast", tone: "brand" as const },
  balanced: { label: "Balanced", tone: "neutral" as const },
  deep: { label: "Deep", tone: "think" as const },
};

export function ModelsSection() {
  const workspace = useWorkspace();
  const { catalog, catalogError, providers } = workspace;
  const [keyDialog, setKeyDialog] = useState<ProviderInfo | null>(null);
  const [modelsDialog, setModelsDialog] = useState<ProviderInfo | null>(null);
  const [removing, setRemoving] = useState<ProviderInfo | null>(null);
  const toast = useToast();

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          title="Free Models on Groq"
          description="Included with your account. Pick by what matters more to you: speed or care."
          icon={<Sparkles className="size-5" />}
        />
        {catalogError ? (
          <CardBody>
            <p className="text-danger text-sm">{catalogError}</p>
          </CardBody>
        ) : !catalog ? (
          <CardBody className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </CardBody>
        ) : (
          <>
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3 sm:px-6">
              {catalog.groups.map((group) => (
                <div key={group.id} className="bg-bg-subtle rounded-2xl p-4">
                  <Badge tone={GROUP_TONE[group.id as keyof typeof GROUP_TONE] ?? "neutral"}>
                    {group.name}
                  </Badge>
                  <p className="text-fg-2 mt-2 text-sm">{group.description}</p>
                </div>
              ))}
            </div>
            <Table>
              <THead>
                <tr>
                  <Th>Model</Th>
                  <Th>Category</Th>
                  <Th>Best For</Th>
                  <Th className="hidden text-right 2xl:table-cell">Context</Th>
                  <Th>
                    <span className="sr-only">Use</span>
                  </Th>
                </tr>
              </THead>
              <tbody>
                {catalog.groq.map((model) => {
                  const current =
                    workspace.choice.provider === "groq" && workspace.choice.model === model.id;
                  const group = catalog.groups.find((g) => g.id === model.group);
                  return (
                    <Tr key={model.id}>
                      <Td className="min-w-[180px]">
                        <p className="text-fg font-bold">{model.name}</p>
                        <p className="text-muted text-xs">
                          {model.developer} · {model.speed}
                        </p>
                      </Td>
                      <Td>
                        <Badge tone={GROUP_TONE[model.group]}>{group?.name ?? model.group}</Badge>
                      </Td>
                      <Td className="min-w-[260px]">
                        <p className="text-fg">{model.best_for}</p>
                        <p className="text-muted mt-1 text-xs">{model.why}</p>
                      </Td>
                      <Td
                        className="text-fg-2 hidden text-right whitespace-nowrap 2xl:table-cell"
                        title="How much text the model can consider at once"
                      >
                        {formatContext(model.context)} tokens
                      </Td>
                      <Td className="text-right">
                        {current ? (
                          <Badge tone="success">
                            <CheckCircle2 className="size-3" /> In Use
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              workspace.setChoice({
                                provider: "groq",
                                model: model.id,
                                label: model.name,
                              });
                              toast.success(
                                "Model Selected",
                                `New messages will use ${model.name}.`,
                              );
                            }}
                          >
                            Use Model
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <div className="border-border bg-bg-subtle text-fg-2 flex items-start gap-3 border-t px-6 py-4 text-sm">
              <Lightbulb className="text-think mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                Think mode currently uses{" "}
                <strong className="text-fg">{catalog.think.engine}</strong> to weigh options before
                any model answers.
              </p>
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Your Own API Keys"
          description="Connect a provider to use its models in Nexus. Your key is encrypted and never shown again in full. The provider bills you directly."
          icon={<KeyRound className="size-5" />}
        />
        <CardBody>
          {providers.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {providers.map((provider) => (
                <li
                  key={provider.id}
                  className="border-border bg-bg-subtle flex flex-col rounded-3xl border p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-fg text-base font-bold">{provider.name}</h3>
                    {provider.connected ? (
                      <Badge tone="success">Connected</Badge>
                    ) : (
                      <Badge>Not Connected</Badge>
                    )}
                  </div>
                  <p className="text-fg-2 mt-1.5 flex-1 text-sm">{provider.tagline}</p>
                  {provider.connected && (
                    <p className="text-muted mt-3 text-xs">
                      Key ending <span className="font-mono">{provider.key_hint}</span>
                      {provider.updated_at && ` · added ${relativeTime(provider.updated_at)}`}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.connected ? (
                      <>
                        <Button size="sm" onClick={() => setModelsDialog(provider)}>
                          View Models
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setKeyDialog(provider)}>
                          Replace Key
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${provider.name} key`}
                          title="Remove Key"
                          onClick={() => setRemoving(provider)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setKeyDialog(provider)}>
                        <KeyRound className="size-4" aria-hidden />
                        Add Key
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {keyDialog && (
        <KeyDialog
          provider={keyDialog}
          onClose={() => setKeyDialog(null)}
          onSaved={(models) => {
            workspace.setProviderModels(keyDialog.id, models);
            workspace.refreshProviders();
            setModelsDialog({ ...keyDialog, connected: true });
            setKeyDialog(null);
          }}
        />
      )}
      {modelsDialog && (
        <ModelsDialog provider={modelsDialog} onClose={() => setModelsDialog(null)} />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove Your ${removing?.name ?? ""} Key?`}
        description={`Nexus will delete the saved key. Chats that use ${removing?.name ?? "this provider"}'s models will stop working until you add a key again. Your chats stay.`}
        confirmLabel="Remove Key"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await modelApi.removeKey(removing.id);
            workspace.setProviderModels(removing.id, []);
            await workspace.refreshProviders();
            if (workspace.choice.provider === removing.id) {
              workspace.setChoice({
                provider: "groq",
                model: "openai/gpt-oss-20b",
                label: "GPT-OSS 20B",
              });
            }
            toast.success("Key Removed", `${removing.name} is disconnected.`);
          } catch (error) {
            toast.error(
              "Couldn't Remove the Key",
              error instanceof ApiError ? error.message : undefined,
            );
            throw error;
          }
        }}
      />
    </>
  );
}

function KeyDialog({
  provider,
  onClose,
  onSaved,
}: {
  provider: ProviderInfo;
  onClose: () => void;
  onSaved: (models: ProviderModel[]) => void;
}) {
  const toast = useToast();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (key.trim().length < 8) return;
    setBusy(true);
    setError(null);
    try {
      const result = await modelApi.saveKey(provider.id, key.trim());
      toast.success(
        `${provider.name} Connected`,
        `${result.models.length} models are now available in the model picker.`,
      );
      onSaved(result.models);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't check this key. Try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      title={provider.connected ? `Replace Your ${provider.name} Key` : `Connect ${provider.name}`}
      description="We check the key with the provider, then store it encrypted. You'll see the models it unlocks, with prices."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy} disabled={key.trim().length < 8}>
            {busy ? "Checking Key" : "Save and Verify Key"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="API Key" error={error}>
          {(props) => (
            <PasswordInput
              {...props}
              data-autofocus
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.key_placeholder}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          )}
        </Field>
        <a
          href={provider.key_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:text-brand-hover inline-flex items-center gap-1.5 text-sm font-bold"
        >
          Get a {provider.name} key
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </form>
    </Dialog>
  );
}

function ModelsDialog({ provider, onClose }: { provider: ProviderInfo; onClose: () => void }) {
  const workspace = useWorkspace();
  const toast = useToast();
  const cached = workspace.providerModels[provider.id];
  const [models, setModels] = useState<ProviderModel[] | null>(cached?.length ? cached : null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | "fast" | "balanced" | "deep">("all");
  const [requested, setRequested] = useState(false);

  if (!models && !requested) {
    setRequested(true);
    workspace
      .loadProviderModels(provider.id, true)
      .then(setModels)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load models."));
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (models ?? []).filter(
      (m) => (tier === "all" || m.tier === tier) && `${m.name} ${m.id}`.toLowerCase().includes(q),
    );
  }, [models, query, tier]);

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`${provider.name} Models`}
      description="Prices are per 1 million tokens (about 750,000 words). Recommended models come first."
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      {error ? (
        <p className="bg-danger-soft text-danger rounded-2xl p-4 text-sm font-medium">{error}</p>
      ) : !models ? (
        <div className="text-fg-2 flex items-center gap-3 py-10 text-sm" role="status">
          <Loader2 className="text-brand size-5 animate-spin" aria-hidden />
          Loading the models your key can use…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search models</span>
              <Search
                className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Models"
                className="border-border bg-surface text-fg placeholder:text-muted focus:border-brand h-11 w-full rounded-xl border pr-3 pl-10 text-sm outline-none"
              />
            </label>
            <Select
              className="sm:w-48"
              ariaLabel="Filter by speed"
              value={tier}
              onChange={setTier}
              options={[
                { value: "all", label: "All Speeds" },
                { value: "fast", label: "Fast" },
                { value: "balanced", label: "Balanced" },
                { value: "deep", label: "Deep" },
              ]}
            />
          </div>
          <div className="border-border overflow-hidden rounded-2xl border">
            <Table className="max-h-[50dvh] overflow-y-auto">
              <THead>
                <tr>
                  <Th>Model</Th>
                  <Th>Speed</Th>
                  <Th className="text-right">Input</Th>
                  <Th className="text-right">Output</Th>
                  <Th>
                    <span className="sr-only">Use</span>
                  </Th>
                </tr>
              </THead>
              <tbody>
                {visible.map((model) => {
                  const t = TIER[model.tier] ?? TIER.balanced;
                  const current =
                    workspace.choice.provider === provider.id &&
                    workspace.choice.model === model.id;
                  return (
                    <Tr key={model.id}>
                      <Td className="min-w-[260px]">
                        <p className="text-fg flex flex-wrap items-center gap-2 font-bold">
                          {model.name}
                          {model.recommended && <Badge tone="brand">Recommended</Badge>}
                        </p>
                        <p className="text-fg-2 mt-0.5 text-xs">{model.best_for}</p>
                        <p className="text-muted mt-0.5 font-mono text-[11px]">
                          {model.id}
                          {model.context ? ` · ${formatContext(model.context)} context` : ""}
                        </p>
                      </Td>
                      <Td>
                        <Badge tone={t.tone}>{t.label}</Badge>
                      </Td>
                      <Td className="text-right font-semibold whitespace-nowrap tabular-nums">
                        {formatPrice(model.price_in)}
                      </Td>
                      <Td className="text-right font-semibold whitespace-nowrap tabular-nums">
                        {formatPrice(model.price_out)}
                      </Td>
                      <Td className="text-right">
                        {current ? (
                          <Badge tone="success">In Use</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              workspace.setChoice({
                                provider: provider.id,
                                model: model.id,
                                label: model.name,
                              });
                              toast.success(
                                "Model Selected",
                                `New messages will use ${model.name}.`,
                              );
                            }}
                          >
                            Use
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            {visible.length === 0 && (
              <p className="text-fg-2 p-6 text-center text-sm">No models match your filters.</p>
            )}
          </div>
          <p className="text-muted text-xs">
            {provider.id === "openrouter"
              ? "OpenRouter prices come live from OpenRouter."
              : `Prices for recommended models were checked on ${workspace.catalog?.checked ?? "recently"}. "—" means the price isn't listed, so check ${provider.name}'s pricing page.`}
          </p>
        </div>
      )}
    </Dialog>
  );
}
