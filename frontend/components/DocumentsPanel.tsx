"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { deleteDocument, getDocuments, uploadDocumentFile } from "@/lib/api";
import type { NexusDocument } from "@/lib/types";

interface DocumentsPanelProps {
  onClose: () => void;
}

export function DocumentsPanel({ onClose }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    const allowed = ["application/pdf", "text/plain"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".md")) {
      setUploadResult("Only PDF and TXT files are supported.");
      return;
    }

    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadDocumentFile(file);
      setUploadResult(`✓ "${res.filename}" uploaded — ${res.chunks} chunks indexed`);
      await load();
    } catch (e) {
      setUploadResult("Upload failed. Check the console.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Group by source file name
  const grouped = documents.reduce<Record<string, NexusDocument[]>>((acc, doc) => {
    const src = doc.metadata?.source ?? "Unknown";
    if (!acc[src]) acc[src] = [];
    acc[src].push(doc);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-surface border-l border-border flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Knowledge Base</h2>
            <p className="text-xs text-muted mt-0.5">
              Upload files to make Nexus answer questions about them
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <div className="px-5 py-4 border-b border-border">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              dragOver
                ? "border-accent bg-accent/8 scale-[1.01]"
                : "border-border hover:border-accent/50 hover:bg-surface-2"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileInput}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 size={22} className="text-accent animate-spin" />
                <p className="text-sm text-foreground-2">Processing…</p>
              </>
            ) : (
              <>
                <UploadCloud
                  size={22}
                  className={dragOver ? "text-accent" : "text-muted"}
                />
                <p className="text-sm text-foreground-2 text-center">
                  Drop a file or{" "}
                  <span className="text-accent font-medium">browse</span>
                </p>
                <p className="text-xs text-muted">PDF · TXT · MD</p>
              </>
            )}
          </div>

          {uploadResult && (
            <p
              className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                uploadResult.startsWith("✓")
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {uploadResult}
            </p>
          )}
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12">
              <FileText size={28} className="text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted">No documents yet</p>
              <p className="text-xs text-muted/60 mt-1">
                Upload a file above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([source, chunks]) => (
                <div
                  key={source}
                  className="rounded-xl border border-border bg-surface-2 overflow-hidden"
                >
                  {/* File header */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-surface-3 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={13} className="text-accent shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">
                        {source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded-md border border-border">
                        {chunks.length} chunks
                      </span>
                      <button
                        onClick={() => chunks.forEach((c) => handleDelete(c.id))}
                        className="p-1 rounded-md hover:text-red-400 text-muted transition-colors"
                        title="Delete all chunks from this file"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Preview of first chunk */}
                  <div className="px-3 py-2.5">
                    <p className="text-xs text-foreground-2 leading-relaxed line-clamp-2">
                      {chunks[0]?.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <p className="text-[10px] text-muted text-center">
            After uploading, ask Nexus: "What does [filename] say about X?"
          </p>
        </div>
      </div>
    </div>
  );
}
