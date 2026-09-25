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
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "@/lib/api/endpoints";
import type { Overview } from "@/lib/types";
import { firstName, formatBytes, formatNumber, greeting, relativeTime } from "@/lib/utils";

export function DashboardView() {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const actions = useChatActions();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOverview(await accountApi.overview());
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
        title={`${greeting()}, ${firstName(user?.name)}`}
        description="Pick up a recent chat, add documents for Nexus to read or tune how it answers you."
        actions={
          <>
            <LinkButton href="/chat" size="lg">
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
          className="border-danger/30 bg-danger-soft mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
        >
          <p className="text-fg flex-1 text-sm font-medium">
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
              <p className="text-fg-2 text-sm font-bold">{card.label}</p>
              <span className="bg-brand-soft text-brand grid size-10 place-items-center rounded-2xl">
                <card.icon className="size-5" aria-hidden />
              </span>
            </div>
            {card.value === undefined ? (
              <Skeleton className="mt-4 h-9 w-16" />
            ) : (
              <p className="font-display text-fg mt-3 text-4xl font-extrabold">
                {formatNumber(card.value)}
              </p>
            )}
            <p className="text-muted mt-1 text-[13px]">{card.hint}</p>
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
              <LinkButton href="/chat" variant="outline" size="sm">
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
              action={<LinkButton href="/chat">Start Chatting</LinkButton>}
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
                            href={`/chat?c=${chat.id}`}
                            className="text-fg hover:text-brand flex items-center gap-2 font-semibold"
                          >
                            {chat.in_memory && (
                              <Brain
                                className="text-brand size-4 shrink-0"
                                aria-label="Saved to memory"
                              />
                            )}
                            <span className="truncate">{chat.title}</span>
                          </Link>
                        </Td>
                        <Td>
                          {folder ? (
                            <span className="text-fg-2 inline-flex items-center gap-2">
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
                        <Td className="text-fg-2 text-right tabular-nums">{chat.message_count}</Td>
                        <Td className="text-fg-2 whitespace-nowrap">
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
              <ul className="divide-border border-border divide-y border-t md:hidden">
                {recent.map((chat) => (
                  <li key={chat.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Link href={`/chat?c=${chat.id}`} className="min-w-0 flex-1">
                      <span className="text-fg block truncate font-semibold">{chat.title}</span>
                      <span className="text-muted text-[13px]">
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
              <SetupRow label="Default Model" value={workspace.choice.label} />
              <SetupRow
                label="Think Mode"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Lightbulb className="text-think size-4" aria-hidden />
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
                <p className="border-border text-fg-2 rounded-2xl border border-dashed p-5 text-center text-sm">
                  No documents yet. Upload a PDF or notes and ask Nexus about them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {overview.recent_documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="bg-bg-subtle flex items-center gap-3 rounded-2xl px-4 py-3"
                    >
                      <FileText className="text-brand size-5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="text-fg block truncate text-sm font-semibold">
                          {doc.source}
                        </span>
                        <span className="text-muted text-xs">
                          {formatBytes(doc.size_bytes)} · {relativeTime(doc.created_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/knowledge"
                className="text-brand hover:text-brand-hover mt-4 inline-flex items-center gap-1.5 text-sm font-bold"
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
    <div className="bg-bg-subtle flex items-start justify-between gap-4 rounded-2xl px-4 py-3">
      <span className="text-fg-2 text-sm">{label}</span>
      <span className="text-right">
        <span className="text-fg block text-sm font-bold">{value}</span>
        {hint && <span className="text-muted block text-xs">{hint}</span>}
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
          className="text-muted hover:bg-surface-2 hover:text-fg grid size-9 place-items-center rounded-xl"
        >
          <MoreHorizontal className="size-5" />
        </button>
      )}
    />
  );
}
