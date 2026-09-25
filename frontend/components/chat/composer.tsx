"use client";

import { ArrowUp, Lightbulb, Loader2, Mic, MicOff, Paperclip, Square } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ModelPicker } from "@/components/chat/model-picker";
import { useWorkspace } from "@/components/app/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { ApiError } from "@/lib/api/client";
import { documentApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

export interface ComposerHandle {
  focus: () => void;
  fill: (text: string) => void;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const ACCEPT = ".pdf,.txt,.md,.markdown,.csv";

export const Composer = forwardRef<
  ComposerHandle,
  {
    onSend: (text: string) => void;
    onStop: () => void;
    streaming: boolean;
    placeholder?: string;
    autoFocus?: boolean;
  }
>(function Composer(
  { onSend, onStop, streaming, placeholder = "Ask Nexus anything", autoFocus },
  ref,
) {
  const { think, setThink, catalog, preferences } = useWorkspace();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enterToSend = preferences.enter_to_send !== false;
  const thinkEngine = catalog?.think.engine ?? "a reasoning model";

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    fill: (text: string) => {
      setValue(text);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        el?.focus();
        el?.setSelectionRange(text.length, text.length);
      });
    },
  }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && window.matchMedia("(min-width: 768px)").matches) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text);
    setValue("");
  };

  const toggleThink = () => {
    const next = !think;
    setThink(next);
    if (next) {
      toast.toast({
        title: "Think Mode On",
        description: `Nexus will use ${thinkEngine} to weigh your options before answering. Replies take a little longer.`,
      });
    }
  };

  const toggleVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error(
        "Voice Input Isn't Available",
        "Your browser doesn't support speech recognition. Try Chrome or Edge.",
      );
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setValue((current) => (current ? `${current} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error(
        "Voice Input Stopped",
        "We couldn't hear you. Check microphone permissions and try again.",
      );
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const upload = async (file: File) => {
    setUploading(file.name);
    try {
      const doc = await documentApi.upload(file);
      toast.success(
        "Added to Your Knowledge Base",
        `“${doc.source}” is indexed (${doc.chunks} passages). Ask about it anytime.`,
      );
    } catch (error) {
      toast.error(
        "Couldn't Upload the File",
        error instanceof ApiError ? error.message : undefined,
      );
    } finally {
      setUploading(null);
    }
  };

  const canSend = value.trim().length > 0 && !streaming;

  return (
    <div
      className={cn(
        "bg-surface shadow-pop rounded-[28px] border transition-colors",
        think ? "border-think/50" : "border-border focus-within:border-border-strong",
      )}
    >
      <label htmlFor="composer" className="sr-only">
        Message Nexus
      </label>
      <textarea
        id="composer"
        ref={textareaRef}
        value={value}
        rows={1}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && enterToSend) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !enterToSend) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={
          listening ? "Listening…" : think ? "Describe the decision or problem" : placeholder
        }
        className="text-fg placeholder:text-muted block max-h-60 min-h-[56px] w-full resize-none scrollbar-thin bg-transparent px-5 pt-4 pb-2 text-base leading-relaxed outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={Boolean(uploading)}
            aria-label={uploading ? `Uploading ${uploading}` : "Add a file to your knowledge base"}
            title="Add a File to Your Knowledge Base"
            className="text-fg-2 hover:bg-surface-2 hover:text-fg grid size-9 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <Paperclip className="size-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleThink}
            aria-pressed={think}
            title={`Think mode uses ${thinkEngine}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors",
              think ? "bg-think-soft text-think" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Lightbulb className={cn("size-[18px]", think && "fill-current")} aria-hidden />
            Think
          </button>
          <ModelPicker compact />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={listening}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            title={listening ? "Stop Voice Input" : "Voice Input"}
            className={cn(
              "grid size-9 place-items-center rounded-xl transition-colors",
              listening
                ? "bg-danger-soft text-danger animate-pulse"
                : "text-fg-2 hover:bg-surface-2 hover:text-fg",
            )}
          >
            {listening ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
          </button>
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop Generating"
              className="bg-fg text-bg grid size-10 place-items-center rounded-full transition-transform active:scale-95"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              title={enterToSend ? "Send (Enter)" : "Send (Ctrl + Enter)"}
              className="bg-brand-solid text-on-brand hover:bg-brand-hover disabled:bg-surface-3 disabled:text-muted grid size-10 place-items-center rounded-full transition-[transform,opacity,background-color] active:scale-95"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </div>
      </div>
      {think && (
        <div className="border-think/20 text-think flex items-center gap-2 border-t px-5 py-2 text-xs font-semibold">
          <Lightbulb className="size-3.5" aria-hidden />
          <span className="truncate">Think mode · {thinkEngine} weighs your options first</span>
        </div>
      )}
    </div>
  );
});
