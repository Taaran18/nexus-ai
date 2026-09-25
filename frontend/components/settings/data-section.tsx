"use client";

import { AlertTriangle, Database, Download, FileX2, MessageSquareX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ApiError, resetVisitor } from "@/lib/api/client";
import { documentApi, meApi } from "@/lib/api/endpoints";

export function DataSection() {
  const toast = useToast();
  const workspace = useWorkspace();
  const [exporting, setExporting] = useState(false);
  const [clearChats, setClearChats] = useState(false);
  const [clearDocs, setClearDocs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = [
    {
      icon: Download,
      title: "Export Your Data",
      text: "Download your profile, chats, folders, document list and memories as a JSON file.",
      action: (
        <Button
          variant="outline"
          loading={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await meApi.exportData();
              toast.success("Export Ready", "Your data is downloading.");
            } catch (error) {
              toast.error(
                "Couldn't Export Your Data",
                error instanceof ApiError ? error.message : undefined,
              );
            } finally {
              setExporting(false);
            }
          }}
        >
          Download Export
        </Button>
      ),
    },
    {
      icon: MessageSquareX,
      title: "Clear Chat History",
      text: "Delete every chat and message, and clear your saved memories. Folders and documents stay.",
      action: (
        <Button variant="danger-soft" onClick={() => setClearChats(true)}>
          Clear History
        </Button>
      ),
    },
    {
      icon: FileX2,
      title: "Delete All Documents",
      text: "Remove every file from your knowledge base. Nexus won't be able to search them anymore.",
      action: (
        <Button variant="danger-soft" onClick={() => setClearDocs(true)}>
          Delete Documents
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader
          title="Your Data"
          description={
            <>
              You&apos;re in control of what Nexus keeps. Read how we handle data in the{" "}
              <Link href="/privacy" className="font-semibold text-brand hover:text-brand-hover">
                Privacy Policy
              </Link>
              .
            </>
          }
          icon={<Database className="size-5" />}
        />
        <CardBody className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.title}
              className={
                index % 2 === 0
                  ? "flex flex-col gap-4 rounded-2xl bg-bg-subtle p-5 sm:flex-row sm:items-center"
                  : "flex flex-col gap-4 rounded-2xl border border-border p-5 sm:flex-row sm:items-center"
              }
            >
              <row.icon className="size-6 shrink-0 text-brand" aria-hidden />
              <div className="flex-1">
                <h3 className="font-bold text-fg">{row.title}</h3>
                <p className="mt-0.5 text-sm text-fg-2">{row.text}</p>
              </div>
              {row.action}
            </div>
          ))}
        </CardBody>
      </Card>
      <section className="rounded-3xl border border-danger/40 bg-surface shadow-card">
        <CardHeader
          title="Delete All My Data"
          description="Permanently delete everything in this trial workspace: chats, folders, documents, memories, API keys and preferences."
          icon={<AlertTriangle className="size-5 text-danger" />}
          action={
            <Button variant="danger" onClick={() => setDeleting(true)}>
              Delete All Data
            </Button>
          }
        />
      </section>
      <ConfirmDialog
        open={clearChats}
        onClose={() => setClearChats(false)}
        title="Clear All Chat History?"
        description={`All ${workspace.chats.length} chats and their messages will be permanently deleted, and your saved memories will be cleared. This can't be undone.`}
        confirmLabel="Clear History"
        confirmText="DELETE"
        onConfirm={async () => {
          try {
            const result = await meApi.clearHistory();
            await Promise.all([workspace.refreshChats(), workspace.refreshMemory()]);
            toast.success("Chat History Cleared", `${result.deleted} chats deleted.`);
          } catch (error) {
            toast.error(
              "Couldn't Clear Your History",
              error instanceof ApiError ? error.message : undefined,
            );
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={clearDocs}
        onClose={() => setClearDocs(false)}
        title="Delete All Documents?"
        description="Every file in your knowledge base will be permanently removed. This can't be undone."
        confirmLabel="Delete Documents"
        confirmText="DELETE"
        onConfirm={async () => {
          try {
            const result = await documentApi.removeAll();
            toast.success("Documents Deleted", `${result.deleted} files removed.`);
          } catch (error) {
            toast.error(
              "Couldn't Delete Your Documents",
              error instanceof ApiError ? error.message : undefined,
            );
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete All Your Data?"
        description="This permanently deletes every chat, folder, document, memory, API key and preference in this trial workspace, and gives this browser a fresh start. It can't be undone."
        confirmLabel="Delete Everything"
        confirmText="DELETE"
        onConfirm={async () => {
          try {
            await meApi.deleteEverything();
            resetVisitor();
            try {
              window.localStorage.removeItem("nexus.model");
              window.localStorage.removeItem("nexus.think");
            } catch {}
            window.location.replace(`${window.location.origin}/`);
          } catch (error) {
            toast.error(
              "Couldn't Delete Your Data",
              error instanceof ApiError ? error.message : undefined,
            );
            throw error;
          }
        }}
      />
    </>
  );
}
