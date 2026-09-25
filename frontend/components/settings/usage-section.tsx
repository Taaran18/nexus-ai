"use client";

import { Gauge, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const left = Math.max(0, limit - used);
  const percent = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="rounded-2xl bg-bg-subtle p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-fg">{label}</p>
        <p className="text-sm text-fg-2">
          <span className="font-display text-2xl font-extrabold text-fg">{left}</span> of {limit}{" "}
          left
        </p>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            percent >= 80 ? "bg-danger" : "bg-brand-solid",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function UsageSection() {
  const { usage, refreshUsage } = useWorkspace();

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return (
    <>
      <Card>
        <CardHeader
          title="Trial Usage"
          description="Nexus is in a free trial. Limits keep it fast and available for everyone."
          icon={<Gauge className="size-5" />}
          action={
            <Button variant="ghost" size="sm" onClick={refreshUsage}>
              <RefreshCw className="size-4" aria-hidden />
              Refresh
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {!usage ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Meter
                  label="Messages Today"
                  used={usage.messages_used}
                  limit={usage.messages_limit}
                />
                <Meter
                  label="Voice Recordings Today"
                  used={usage.voice_used}
                  limit={usage.voice_limit}
                />
                <Meter
                  label="File Uploads Today"
                  used={usage.uploads_used}
                  limit={usage.uploads_limit}
                />
              </div>
              <p className="text-sm text-fg-2">
                Your limits reset on{" "}
                <strong className="text-fg">{formatDateTime(usage.resets_at)}</strong>.
              </p>
            </>
          )}
        </CardBody>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Trial Limits" description="How the free trial is measured." />
        <Table>
          <THead>
            <tr>
              <Th>Limit</Th>
              <Th className="text-right">Allowance</Th>
              <Th>How It Works</Th>
            </tr>
          </THead>
          <tbody>
            <Tr>
              <Td className="font-semibold">Messages per Day</Td>
              <Td className="text-right tabular-nums">{usage?.messages_limit ?? "—"}</Td>
              <Td className="text-fg-2">
                Counted per network (IP address). Failed replies aren&apos;t counted.
              </Td>
            </Tr>
            <Tr>
              <Td className="font-semibold">Messages per Chat</Td>
              <Td className="text-right tabular-nums">{usage?.max_turns_per_chat ?? "—"}</Td>
              <Td className="text-fg-2">Start a new chat when one reaches its limit.</Td>
            </Tr>
            <Tr>
              <Td className="font-semibold">File Uploads per Day</Td>
              <Td className="text-right tabular-nums">{usage?.uploads_limit ?? "—"}</Td>
              <Td className="text-fg-2">PDF, TXT, Markdown or CSV, up to 10 MB each.</Td>
            </Tr>
            <Tr>
              <Td className="font-semibold">Voice Recordings per Day</Td>
              <Td className="text-right tabular-nums">{usage?.voice_limit ?? "—"}</Td>
              <Td className="text-fg-2">
                Up to a minute each. Failed transcriptions aren&apos;t counted.
              </Td>
            </Tr>
            <Tr>
              <Td className="font-semibold">Saved Memories</Td>
              <Td className="text-right tabular-nums">3</Td>
              <Td className="text-fg-2">Save your most useful chats so Nexus remembers them.</Td>
            </Tr>
          </tbody>
        </Table>
      </Card>
    </>
  );
}
