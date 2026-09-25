"use client";

import { Brain, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, Switch } from "@/components/ui/misc";
import type { MemoryItem } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function MemorySection() {
  const { memory, removeMemory, useMemory, updatePreferences } = useWorkspace();
  const [removing, setRemoving] = useState<MemoryItem | null>(null);
  const used = memory.items.length;

  return (
    <>
      <Card>
        <CardHeader
          title="Memory"
          description="Save important chats from their menu and Nexus will remember the key points in future conversations."
          icon={<Brain className="size-5" />}
        />
        <CardBody>
          <div className="bg-bg-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg font-bold">
                {used} of {memory.limit} Memory Slots Used
              </span>
              {used >= memory.limit && <Badge tone="warning">Full</Badge>}
            </div>
            <div className="mt-3 flex gap-1.5" aria-hidden>
              {Array.from({ length: memory.limit }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    i < used ? "bg-brand-solid" : "bg-surface-3",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="divide-border mt-2 divide-y">
            <Switch
              label="Use Memory in Replies"
              description="Turn off to pause memory without deleting what's saved."
              checked={useMemory}
              onChange={(value) => updatePreferences({ use_memory: value }).catch(() => {})}
            />
          </div>
        </CardBody>
      </Card>
      {memory.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Brain className="size-7" />}
            title="Nothing Saved Yet"
            description="Open a chat's menu and choose Save to Memory. Nexus will keep a short summary so it can remember the important parts."
            action={<LinkButton href="/chat">Go to Chats</LinkButton>}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {memory.items.map((item) => (
            <li key={item.session_id}>
              <Card className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-fg truncate text-base font-bold">{item.title}</h3>
                    <p className="text-muted mt-0.5 text-xs">
                      Saved {formatDate(item.saved_at)} · {item.message_count} messages
                    </p>
                  </div>
                  <Badge tone={item.summary_type === "ai" ? "brand" : "neutral"}>
                    {item.summary_type === "ai" ? "AI Summary" : "Excerpt"}
                  </Badge>
                </div>
                <p className="bg-bg-subtle text-fg-2 mt-4 flex-1 rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line">
                  {item.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/chat?c=${item.session_id}`}
                    className="text-fg-2 hover:bg-surface-2 hover:text-fg inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Open Chat
                  </Link>
                  <Button size="sm" variant="danger-soft" onClick={() => setRemoving(item)}>
                    <Trash2 className="size-4" aria-hidden />
                    Remove From Memory
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove This Memory?"
        description={
          <>
            Nexus will forget what it learned from{" "}
            <strong className="text-fg">“{removing?.title}”</strong>. The chat itself stays in your
            history.
          </>
        }
        confirmLabel="Remove Memory"
        onConfirm={async () => {
          if (removing) await removeMemory(removing.session_id);
        }}
      />
    </>
  );
}
