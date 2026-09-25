"use client";

import { Laptop, LogOut, MonitorSmartphone, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "@/lib/api/endpoints";
import type { AuthSession } from "@/lib/types";
import { describeDevice, formatDate, relativeTime } from "@/lib/utils";

export function SessionsSection() {
  const toast = useToast();
  const [sessions, setSessions] = useState<AuthSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AuthSession | null>(null);
  const [revokeAll, setRevokeAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await accountApi.sessions());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Try again in a moment.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const others = (sessions ?? []).filter((s) => !s.current);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          title="Active Sessions"
          description="Devices where you're signed in. If you don't recognise one, sign it out and change your password."
          icon={<MonitorSmartphone className="size-5" />}
          action={
            <>
              <Button variant="ghost" size="sm" onClick={load} aria-label="Refresh sessions">
                <RefreshCw className="size-4" aria-hidden />
                Refresh
              </Button>
              <Button
                variant="danger-soft"
                size="sm"
                disabled={others.length === 0}
                onClick={() => setRevokeAll(true)}
              >
                <LogOut className="size-4" aria-hidden />
                Sign Out Others
              </Button>
            </>
          }
        />
        {error ? (
          <p className="text-danger px-6 pb-6 text-sm">{error}</p>
        ) : !sessions ? (
          <div className="space-y-3 px-6 pb-6">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : (
          <>
            <Table className="hidden md:block">
              <THead>
                <tr>
                  <Th>Device</Th>
                  <Th>IP Address</Th>
                  <Th>Last Active</Th>
                  <Th>Signed In</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <tbody>
                {sessions.map((session) => {
                  const device = describeDevice(session.user_agent);
                  const Icon = device.mobile ? Smartphone : Laptop;
                  return (
                    <Tr key={session.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Icon className="text-brand size-5 shrink-0" aria-hidden />
                          <span className="text-fg font-semibold">{device.label}</span>
                          {session.current && <Badge tone="success">This Device</Badge>}
                        </div>
                      </Td>
                      <Td className="text-fg-2 font-mono text-xs">{session.ip || "Unknown"}</Td>
                      <Td className="text-fg-2 whitespace-nowrap">
                        {relativeTime(session.last_used_at)}
                      </Td>
                      <Td className="text-fg-2 whitespace-nowrap">
                        {formatDate(session.created_at)}
                      </Td>
                      <Td className="text-right">
                        {!session.current && (
                          <Button size="sm" variant="outline" onClick={() => setRevoking(session)}>
                            Sign Out
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <ul className="divide-border border-border divide-y border-t md:hidden">
              {sessions.map((session) => {
                const device = describeDevice(session.user_agent);
                return (
                  <li key={session.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-fg flex flex-wrap items-center gap-2 font-semibold">
                        {device.label}
                        {session.current && <Badge tone="success">This Device</Badge>}
                      </p>
                      <p className="text-muted text-xs">
                        {session.ip || "Unknown IP"} · active {relativeTime(session.last_used_at)}
                      </p>
                    </div>
                    {!session.current && (
                      <Button size="sm" variant="outline" onClick={() => setRevoking(session)}>
                        Sign Out
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title="Sign Out This Device?"
        description={`${revoking ? describeDevice(revoking.user_agent).label : "This device"} will be signed out within a few minutes and will need your password to get back in.`}
        confirmLabel="Sign Out Device"
        onConfirm={async () => {
          if (!revoking) return;
          try {
            await accountApi.revokeSession(revoking.id);
            setSessions((current) => (current ?? []).filter((s) => s.id !== revoking.id));
            toast.success("Device Signed Out");
          } catch (err) {
            toast.error(
              "Couldn't Sign Out the Device",
              err instanceof ApiError ? err.message : undefined,
            );
            throw err;
          }
        }}
      />
      <ConfirmDialog
        open={revokeAll}
        onClose={() => setRevokeAll(false)}
        title="Sign Out All Other Devices?"
        description={`${others.length} other session${others.length === 1 ? "" : "s"} will be signed out. You'll stay signed in here.`}
        confirmLabel="Sign Out Others"
        onConfirm={async () => {
          try {
            const result = await accountApi.revokeOthers();
            setSessions((current) => (current ?? []).filter((s) => s.current));
            toast.success("Other Devices Signed Out", `${result.revoked} session(s) ended.`);
          } catch (err) {
            toast.error(
              "Couldn't Sign Out Other Devices",
              err instanceof ApiError ? err.message : undefined,
            );
            throw err;
          }
        }}
      />
    </>
  );
}
