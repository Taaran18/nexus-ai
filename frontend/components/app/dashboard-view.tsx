"use client";

import {
  ArrowRight,
  Brain,
  FileText,
  FolderOpen,
  KeyRound,
  Library,
  Lightbulb,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useChatActions } from "@/components/app/chat-actions";
import { PageFrame } from "@/components/app/page-frame";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { meApi } from "@/lib/api/endpoints";
import type { Overview } from "@/lib/types";
import { formatBytes, formatDateTime, formatNumber, greeting, relativeTime } from "@/lib/utils";

export function DashboardView() {
  const workspace = useWorkspace();
  const actions = useChatActions();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOverview(await meApi.overview());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Try again in a moment.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load, workspace.chats.length, workspace.folders.length, workspace.memory.items.length]);

  const stats = overview?.stats;
  const cards = [
    {
      label: "Chats",
      value: stats?.chats,
      icon: MessagesSquare,
      hint: `${formatNumber(stats?.messages ?? 0)} messages in total`,
    },
    {
      label: "Documents",
      value: stats?.documents,
      icon: FileText,
      hint: `${formatNumber(stats?.chunks ?? 0)} searchable passages`,
    },
    {
      label: "Memories",
      value: stats?.memories,
      icon: Brain,
      hint: `of ${workspace.memory.limit} memory slots used`,
    },
    {
      label: "Folders",
      value: stats?.folders,
      icon: FolderOpen,
      hint: "for organising your chats",
    },
  ];
  const recent = workspace.chats.slice(0, 8);
  const folderOf = (id: string | null) => workspace.folders.find((f) => f.id === id);

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Overview"
        title={greeting()}
        description="Pick up a recent chat, add documents for Nexus to read or tune how it answers you."
        actions={
          <>
            <LinkButton href="/" size="lg">
              <MessageSquarePlus className="size-5" aria-hidden />
              New Chat
            </LinkButton>
            <LinkButton href="/knowledge" size="lg" variant="outline">
              <Library className="size-5" aria-hidden />
              Add Documents
            </LinkButton>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
        >
          <p className="flex-1 text-sm font-medium text-fg">
            We couldn&apos;t load your overview. {error}
          </p>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="size-4" aria-hidden />
            Try Again
          </Button>
        </div>
      )}

      <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-fg-2">{card.label}</p>
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <card.icon className="size-5" aria-hidden />
              </span>
            </div>
            {card.value === undefined ? (
              <Skeleton className="mt-4 h-9 w-16" />
            ) : (
              <p className="mt-3 font-display text-4xl font-extrabold text-fg">
                {formatNumber(card.value)}
              </p>
            )}
            <p className="mt-1 text-[13px] text-muted">{card.hint}</p>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent Chats"
            description="Your latest conversations, most recent first."
            icon={<MessageSquare className="size-5" />}
            action={
              <LinkButton href="/" variant="outline" size="sm">
                New Chat
              </LinkButton>
            }
          />
          {workspace.chatsLoading ? (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare className="size-7" />}
              title="No Chats Yet"
              description="Ask your first question and it will show up here."
              action={<LinkButton href="/">Start Chatting</LinkButton>}
            />
          ) : (
            <>
              <Table className="hidden md:block">
                <THead>
                  <tr>
                    <Th>Chat</Th>
                    <Th>Folder</Th>
                    <Th className="text-right">Messages</Th>
                    <Th>Last Active</Th>
                    <Th className="w-12">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <tbody>
                  {recent.map((chat) => {
                    const folder = folderOf(chat.folder_id);
                    return (
                      <Tr key={chat.id}>
                        <Td className="max-w-[360px]">
                          <Link
                            href={`/?c=${chat.id}`}
                            className="flex items-center gap-2 font-semibold text-fg hover:text-brand"
                          >
                            {chat.in_memory && (
                              <Brain
                                className="size-4 shrink-0 text-brand"
                                aria-label="Saved to memory"
                              />
                            )}
                            <span className="truncate">{chat.title}</span>
                          </Link>
                        </Td>
                        <Td>
                          {folder ? (
                            <span className="inline-flex items-center gap-2 text-fg-2">
                              <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: folder.color }}
                                aria-hidden
                              />
                              {folder.name}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </Td>
                        <Td className="text-right text-fg-2 tabular-nums">{chat.message_count}</Td>
                        <Td className="whitespace-nowrap text-fg-2">
                          {relativeTime(chat.updated_at)}
                        </Td>
                        <Td>
                          <ChatRowMenu items={actions.chatMenu(chat)} title={chat.title} />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <ul className="divide-y divide-border border-t border-border md:hidden">
                {recent.map((chat) => (
                  <li key={chat.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Link href={`/?c=${chat.id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">{chat.title}</span>
                      <span className="text-[13px] text-muted">
                        {chat.message_count} messages · {relativeTime(chat.updated_at)}
                      </span>
                    </Link>
                    <ChatRowMenu items={actions.chatMenu(chat)} title={chat.title} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Your Setup"
              description="How Nexus answers right now."
              icon={<Sparkles className="size-5" />}
            />
            <CardBody className="space-y-3">
              <SetupRow
                label="Trial Messages Today"
                value={
                  workspace.usage
                    ? `${workspace.usage.messages_left} of ${workspace.usage.messages_limit} Left`
                    : "Checking"
                }
                hint={
                  workspace.usage
                    ? `Resets ${formatDateTime(workspace.usage.resets_at)}`
                    : undefined
                }
              />
              <SetupRow label="Default Model" value={workspace.choice.label} />
              <SetupRow
                label="Think Mode"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Lightbulb className="size-4 text-think" aria-hidden />
                    {workspace.think ? "On" : "Off"}
                  </span>
                }
                hint={workspace.catalog?.think.engine}
              />
              <SetupRow label="Memory" value={workspace.useMemory ? "Used in Replies" : "Paused"} />
              <SetupRow
                label="Your API Keys"
                value={
                  workspace.providers.filter((p) => p.connected).length ? (
                    <Badge tone="success">
                      {workspace.providers.filter((p) => p.connected).length} Connected
                    </Badge>
                  ) : (
                    <Badge>None Yet</Badge>
                  )
                }
              />
              <LinkButton href="/settings?tab=models" variant="outline" className="mt-2 w-full">
                <KeyRound className="size-4" aria-hidden />
                Manage Models and Keys
              </LinkButton>
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Recent Documents"
              description="Files Nexus can search when you ask about them."
              icon={<Library className="size-5" />}
            />
            <CardBody>
              {!overview ? (
                <Skeleton className="h-20" />
              ) : overview.recent_documents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-fg-2">
                  No documents yet. Upload a PDF or notes and ask Nexus about them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {overview.recent_documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-3 rounded-2xl bg-bg-subtle px-4 py-3"
                    >
                      <FileText className="size-5 shrink-0 text-brand" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">
                          {doc.source}
                        </span>
                        <span className="text-xs text-muted">
                          {formatBytes(doc.size_bytes)} · {relativeTime(doc.created_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/knowledge"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand-hover"
              >
                Open Knowledge Base
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}

function SetupRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-bg-subtle px-4 py-3">
      <span className="text-sm text-fg-2">{label}</span>
      <span className="text-right">
        <span className="block text-sm font-bold text-fg">{value}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </div>
  );
}

function ChatRowMenu({
  items,
  title,
}: {
  items: ReturnType<ReturnType<typeof useChatActions>["chatMenu"]>;
  title: string;
}) {
  return (
    <Menu
      ariaLabel={`${title} options`}
      items={items}
      trigger={(props) => (
        <button
          {...props}
          aria-label={`Options for ${title}`}
          className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
        >
          <MoreHorizontal className="size-5" />
        </button>
      )}
    />
  );
}
