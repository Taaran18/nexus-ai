"use client";

import {
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageFrame } from "@/components/app/page-frame";
import { useWakeOnMount } from "@/components/app/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { documentApi } from "@/lib/api/endpoints";
import type { DocumentFile } from "@/lib/types";
import { cn, formatBytes, formatDate, relativeTime } from "@/lib/utils";

type Sort = "newest" | "oldest" | "name" | "size";
type UploadItem = { name: string; status: "uploading" | "done" | "error"; message?: string };

const ACCEPT = [".pdf", ".txt", ".md", ".markdown", ".csv"];

export function KnowledgeView() {
  useWakeOnMount();
  const toast = useToast();
  const [docs, setDocs] = useState<DocumentFile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DocumentFile | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setDocs(await documentApi.list());
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Try again in a moment.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (docs ?? []).filter((d) => d.source.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "name") return a.source.localeCompare(b.source);
      if (sort === "size") return b.size_bytes - a.size_bytes;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [docs, query, sort]);

  const uploadFiles = async (files: File[]) => {
    const valid = files.filter((f) => ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext)));
    const rejected = files.length - valid.length;
    if (rejected)
      toast.error("Some Files Were Skipped", "Only PDF, TXT, MD and CSV files can be added.");
    for (const file of valid) {
      setUploads((current) => [
        { name: file.name, status: "uploading" },
        ...current.filter((u) => u.name !== file.name),
      ]);
      try {
        const doc = await documentApi.upload(file);
        setDocs((current) => [doc, ...(current ?? [])]);
        setUploads((current) =>
          current.map((u) =>
            u.name === file.name
              ? { ...u, status: "done", message: `${doc.chunks} passages indexed` }
              : u,
          ),
        );
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Upload failed. Try again.";
        setUploads((current) =>
          current.map((u) => (u.name === file.name ? { ...u, status: "error", message } : u)),
        );
      }
    }
  };

  const totalChunks = (docs ?? []).reduce((sum, d) => sum + d.chunks, 0);
  const busy = uploads.some((u) => u.status === "uploading");

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Knowledge Base"
        title="Your Documents"
        description="Upload files and Nexus will search them whenever you ask about their contents. Only you can see your documents."
      />

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card className="h-fit">
          <CardHeader
            title="Add Files"
            description="PDF, TXT, Markdown or CSV, up to 10 MB each."
            icon={<UploadCloud className="size-5" />}
          />
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                uploadFiles(Array.from(e.dataTransfer.files));
              }}
              className={cn(
                "flex w-full flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging
                  ? "border-brand bg-brand-soft"
                  : "border-border hover:border-brand/60 hover:bg-bg-subtle",
              )}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                {busy ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : (
                  <UploadCloud className="size-7" />
                )}
              </span>
              <span className="mt-4 text-base font-bold text-fg">
                {dragging ? "Drop to Upload" : "Drag Files Here"}
              </span>
              <span className="mt-1 text-sm text-fg-2">
                or <span className="font-bold text-brand">browse your computer</span>
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT.join(",")}
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                uploadFiles(files);
              }}
            />
            {uploads.length > 0 && (
              <ul className="mt-4 space-y-2" aria-live="polite">
                {uploads.slice(0, 5).map((u) => (
                  <li
                    key={u.name}
                    className="flex items-start gap-3 rounded-2xl bg-bg-subtle px-4 py-3"
                  >
                    {u.status === "uploading" ? (
                      <Loader2
                        className="mt-0.5 size-4 shrink-0 animate-spin text-brand"
                        aria-hidden
                      />
                    ) : u.status === "done" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{u.name}</span>
                      <span
                        className={cn(
                          "text-xs",
                          u.status === "error" ? "text-danger" : "text-muted",
                        )}
                      >
                        {u.status === "uploading"
                          ? "Reading and indexing. Large PDFs can take a minute."
                          : u.message}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-5 text-[13px] leading-relaxed text-muted">
              Tip: ask &ldquo;What does my contract say about notice periods?&rdquo; and Nexus will
              search your files automatically.
            </p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Library"
            description={
              docs
                ? `${docs.length} file${docs.length === 1 ? "" : "s"} · ${totalChunks.toLocaleString()} searchable passages`
                : "Loading your files"
            }
            icon={<FileText className="size-5" />}
            action={
              docs && docs.length > 0 ? (
                <Button variant="danger-soft" size="sm" onClick={() => setDeleteAll(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete All
                </Button>
              ) : undefined
            }
          />
          {docs && docs.length > 0 && (
            <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:px-6">
              <label className="relative flex-1">
                <span className="sr-only">Search files</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Files"
                  className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-sm text-fg outline-none placeholder:text-muted focus:border-brand"
                />
              </label>
              <Select
                className="sm:w-52"
                ariaLabel="Sort files"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "name", label: "Name A to Z" },
                  { value: "size", label: "Largest First" },
                ]}
              />
            </div>
          )}
          {loadError ? (
            <EmptyState
              icon={<XCircle className="size-7" />}
              title="Couldn't Load Your Files"
              description={loadError}
              action={<Button onClick={load}>Try Again</Button>}
            />
          ) : !docs ? (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-7" />}
              title="No Documents Yet"
              description="Add a PDF, notes or a spreadsheet export. Nexus will read it and answer questions about it."
              action={<Button onClick={() => inputRef.current?.click()}>Upload a File</Button>}
            />
          ) : visible.length === 0 ? (
            <p className="px-6 pb-8 text-center text-sm text-fg-2">
              No files match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <>
              <Table className="hidden md:block">
                <THead>
                  <tr>
                    <Th>File</Th>
                    <Th className="text-right">Size</Th>
                    <Th className="text-right">Passages</Th>
                    <Th>Added</Th>
                    <Th className="w-14">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <tbody>
                  {visible.map((doc) => (
                    <Tr key={doc.id}>
                      <Td className="max-w-[420px]">
                        <div className="flex items-start gap-3">
                          <FileText className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-fg">{doc.source}</p>
                            <p className="line-clamp-1 text-xs text-muted">{doc.preview}</p>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-right whitespace-nowrap text-fg-2 tabular-nums">
                        {formatBytes(doc.size_bytes)}
                      </Td>
                      <Td className="text-right text-fg-2 tabular-nums">{doc.chunks}</Td>
                      <Td
                        className="whitespace-nowrap text-fg-2"
                        title={formatDate(doc.created_at)}
                      >
                        {relativeTime(doc.created_at)}
                      </Td>
                      <Td>
                        <button
                          onClick={() => setPendingDelete(doc)}
                          aria-label={`Delete ${doc.source}`}
                          title="Delete File"
                          className="grid size-9 place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <ul className="divide-y divide-border border-t border-border md:hidden">
                {visible.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 px-5 py-4">
                    <FileText className="size-5 shrink-0 text-brand" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fg">{doc.source}</p>
                      <p className="text-xs text-muted">
                        {formatBytes(doc.size_bytes)} · {doc.chunks} passages ·{" "}
                        {relativeTime(doc.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setPendingDelete(doc)}
                      aria-label={`Delete ${doc.source}`}
                      className="grid size-10 place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete This File?"
        description={
          <>
            <strong className="text-fg">{pendingDelete?.source}</strong> will be removed from your
            knowledge base. Nexus won&apos;t be able to search it anymore. Past answers that used it
            stay in your chats.
          </>
        }
        confirmLabel="Delete File"
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await documentApi.remove(pendingDelete.id);
            setDocs((current) => (current ?? []).filter((d) => d.id !== pendingDelete.id));
            toast.success("File Deleted");
          } catch (error) {
            toast.error(
              "Couldn't Delete the File",
              error instanceof ApiError ? error.message : undefined,
            );
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={deleteAll}
        onClose={() => setDeleteAll(false)}
        title="Delete All Documents?"
        description={`All ${docs?.length ?? 0} files and their ${totalChunks.toLocaleString()} passages will be permanently removed. This can't be undone.`}
        confirmLabel="Delete All Documents"
        confirmText="DELETE"
        onConfirm={async () => {
          try {
            const result = await documentApi.removeAll();
            setDocs([]);
            toast.success("Knowledge Base Cleared", `${result.deleted} files deleted.`);
          } catch (error) {
            toast.error(
              "Couldn't Delete Your Documents",
              error instanceof ApiError ? error.message : undefined,
            );
            throw error;
          }
        }}
      />
    </PageFrame>
  );
}
