"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp, CheckCircle2, ChevronUp, Loader2,
  Mic, MicOff, Paperclip, XCircle, Zap,
} from "lucide-react";
import { uploadDocumentFile } from "@/lib/api";
import type { NexusModel } from "@/lib/types";

/* ── Available Groq free-tier models ──────────────────────────────────────── */
export const GROQ_MODELS: NexusModel[] = [
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 · 8B",
    desc: "Fastest responses, great for everyday questions",
    badge: "8B · Fast",
    speed: "fast",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 · 70B",
    desc: "Most capable, best for complex reasoning & analysis",
    badge: "70B · Smart",
    speed: "medium",
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral · 8×7B",
    desc: "Long context (32k tokens), balanced performance",
    badge: "Mixtral · 32k",
    speed: "medium",
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 · 9B",
    desc: "Google's model, great for creative & instructional tasks",
    badge: "Gemma 2",
    speed: "fast",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 · 70B",
    desc: "Reasoning model — thinks step-by-step before answering",
    badge: "R1 · Reasoning",
    speed: "slow",
  },
  {
    id: "llama-3.2-11b-vision-preview",
    name: "Llama 3.2 · 11B Vision",
    desc: "Vision-capable model (preview) — multimodal support",
    badge: "11B · Vision",
    speed: "medium",
  },
];

const SPEED_DOT: Record<NexusModel["speed"], string> = {
  fast:   "bg-emerald-400",
  medium: "bg-amber-400",
  slow:   "bg-rose-400",
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface MessageInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  initialValue?: string;
  onInitialValueConsumed?: () => void;
}

export function MessageInput({
  onSend,
  isStreaming,
  selectedModel,
  onModelChange,
  initialValue,
  onInitialValueConsumed,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMsg, setUploadMsg] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const activeModel = GROQ_MODELS.find((m) => m.id === selectedModel) ?? GROQ_MODELS[0];

  // Injected value (suggestion card)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      textareaRef.current?.focus();
      onInitialValueConsumed?.();
    }
  }, [initialValue, onInitialValueConsumed]);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // Focus when streaming ends
  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  // Close model picker on Escape
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowModelPicker(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showModelPicker]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ── Voice input ── */
  const toggleVoice = () => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Try Chrome."); return; }

    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setValue((prev) => (prev ? `${prev} ${t}` : t));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend   = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  /* ── File upload ── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowed = ["application/pdf", "text/plain", "text/markdown"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".md")) {
      setUploadStatus("error");
      setUploadMsg("Only PDF, TXT, or MD files are supported.");
      setTimeout(() => setUploadStatus("idle"), 3000);
      return;
    }
    setUploadStatus("uploading");
    setUploadMsg(`Uploading "${file.name}"…`);
    try {
      const res = await uploadDocumentFile(file);
      setUploadStatus("success");
      setUploadMsg(`"${res.filename}" added — ${res.chunks} chunks indexed`);
    } catch {
      setUploadStatus("error");
      setUploadMsg("Upload failed. Try again.");
    } finally {
      setTimeout(() => setUploadStatus("idle"), 4000);
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">

        {/* Upload status banner */}
        {uploadStatus !== "idle" && (
          <div className={`flex items-center gap-2 px-3 py-2 mb-2 rounded-xl text-xs border animate-fade-in ${
            uploadStatus === "uploading" ? "bg-accent/10 border-accent/20 text-accent" :
            uploadStatus === "success"   ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                          "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {uploadStatus === "uploading" && <Loader2 size={13} className="animate-spin shrink-0" />}
            {uploadStatus === "success"   && <CheckCircle2 size={13} className="shrink-0" />}
            {uploadStatus === "error"     && <XCircle size={13} className="shrink-0" />}
            <span>{uploadMsg}</span>
          </div>
        )}

        {/* Model picker dropdown — opens ABOVE the input */}
        {showModelPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
            <div className="relative z-50 mb-2 rounded-2xl border border-border bg-surface shadow-xl shadow-black/20 overflow-hidden animate-fade-up">
              <div className="px-3 pt-3 pb-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                  Groq Free Models
                </p>
              </div>
              <div className="py-1">
                {GROQ_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { onModelChange(model.id); setShowModelPicker(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      model.id === selectedModel
                        ? "bg-accent/10 text-foreground"
                        : "hover:bg-surface-2 text-foreground-2 hover:text-foreground"
                    }`}
                  >
                    {/* Speed dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${SPEED_DOT[model.speed]}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{model.name}</span>
                        {model.id === selectedModel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/20 text-accent font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5 truncate">{model.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-border bg-surface-2">
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Fast
                  <span className="mx-2 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Medium
                  <span className="mx-0 w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-2" /> Slow
                </p>
              </div>
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Main input box */}
        <div className="relative rounded-2xl border border-border bg-surface shadow-sm focus-within:border-accent/50 transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={
              listening ? "Listening…" : isStreaming ? "Nexus is thinking…" : "Ask anything…"
            }
            rows={1}
            className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm text-foreground placeholder-muted resize-none outline-none scrollbar-thin disabled:cursor-not-allowed leading-relaxed"
          />

          {/* Toolbar */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2.5 border-t border-border/50">
            {/* Left: attach + voice */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus === "uploading"}
                title="Attach PDF or TXT to knowledge base"
                className={`p-1.5 rounded-lg transition-colors ${
                  uploadStatus === "uploading"
                    ? "text-accent opacity-60 cursor-not-allowed"
                    : "text-muted hover:text-foreground-2 hover:bg-surface-2"
                }`}
              >
                {uploadStatus === "uploading"
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Paperclip size={15} />}
              </button>

              <button
                onClick={toggleVoice}
                title={listening ? "Stop listening" : "Voice input"}
                className={`p-1.5 rounded-lg transition-colors ${
                  listening
                    ? "text-red-400 bg-red-400/10 animate-pulse"
                    : "text-muted hover:text-foreground-2 hover:bg-surface-2"
                }`}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            </div>

            {/* Right: model selector + send */}
            <div className="flex items-center gap-2">
              {/* Model badge — click to open picker */}
              <button
                onClick={() => setShowModelPicker((v) => !v)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  showModelPicker
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-surface-2 border-border text-foreground-2 hover:text-foreground hover:border-border-strong"
                }`}
                title="Select model"
              >
                <Zap size={11} />
                {activeModel.badge}
                <ChevronUp
                  size={11}
                  className={`transition-transform ${showModelPicker ? "rotate-180" : ""}`}
                />
              </button>

              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                title="Send (Enter)"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  canSend
                    ? "bg-accent hover:bg-accent-2 text-white shadow-sm shadow-accent/30"
                    : "bg-surface-3 text-muted cursor-not-allowed"
                }`}
              >
                <ArrowUp size={14} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted mt-2">
          Enter to send · Shift+Enter for new line · 🎙 for voice
        </p>
      </div>
    </div>
  );
}
