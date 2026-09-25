"use client";

import { AlertTriangle, Database, Download, FileX2, MessageSquareX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { ApiError, clearSession } from "@/lib/api/client";
import { accountApi, documentApi } from "@/lib/api/endpoints";

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
              await accountApi.exportData();
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
              <Link href="/privacy" className="text-brand hover:text-brand-hover font-semibold">
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
                  ? "bg-bg-subtle flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
                  : "border-border flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center"
              }
            >
              <row.icon className="text-brand size-6 shrink-0" aria-hidden />
              <div className="flex-1">
                <h3 className="text-fg font-bold">{row.title}</h3>
                <p className="text-fg-2 mt-0.5 text-sm">{row.text}</p>
              </div>
              {row.action}
            </div>
          ))}
        </CardBody>
      </Card>
      <section className="border-danger/40 bg-surface shadow-card rounded-3xl border">
        <CardHeader
          title="Delete Account"
          description="Permanently delete your account and everything in it: chats, documents, memories, API keys and sessions."
          icon={<AlertTriangle className="text-danger size-5" />}
          action={
            <Button variant="danger" onClick={() => setDeleting(true)}>
              Delete Account
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
            const result = await accountApi.clearHistory();
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
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = password.length > 0 && typed.trim().toLowerCase() === user?.email;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.deleteAccount(password);
      clearSession();
      toast.success("Account Deleted", "Your account and data have been permanently removed.");
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "We couldn't delete your account. Try again.",
      );
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      title="Delete Your Account?"
      icon={
        <span className="bg-danger-soft text-danger grid size-11 shrink-0 place-items-center rounded-2xl">
          <AlertTriangle className="size-5" aria-hidden />
        </span>
      }
      description="This permanently deletes your profile, chats, documents, memories, API keys and sessions. There's no way to recover them."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Keep My Account
          </Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!ready}>
            Delete Account Forever
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p
            role="alert"
            className="bg-danger-soft text-danger rounded-2xl px-4 py-3 text-sm font-medium"
          >
            {error}
          </p>
        )}
        <Field label={`Type your email (${user?.email}) to confirm`}>
          {(props) => (
            <Input
              {...props}
              data-autofocus
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          )}
        </Field>
        <Field label="Password">
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
