"use client";

import { ArrowUp, Lightbulb, Loader2, Mic, Paperclip, Square, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ModelPicker } from "@/components/chat/model-picker";
import { useWorkspace } from "@/components/app/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { ApiError } from "@/lib/api/client";
import { documentApi, voiceApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

export interface ComposerHandle {
  focus: () => void;
  fill: (text: string) => void;
}

type VoiceState = "idle" | "recording" | "transcribing";

const MAX_RECORDING_SECONDS = 60;
const AUDIO_TYPES: Array<[string, string]> = [
  ["audio/webm;codecs=opus", "webm"],
  ["audio/webm", "webm"],
  ["audio/mp4", "mp4"],
  ["audio/ogg;codecs=opus", "ogg"],
];

function pickAudioType() {
  if (typeof MediaRecorder === "undefined") return null;
  return AUDIO_TYPES.find(([type]) => MediaRecorder.isTypeSupported(type)) ?? ["", "webm"];
}

const ACCEPT = ".pdf,.txt,.md,.markdown,.csv";

export const Composer = forwardRef<
  ComposerHandle,
  {
    onSend: (text: string) => void;
    onStop: () => void;
    streaming: boolean;
    disabled?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
  }
>(function Composer(
  { onSend, onStop, streaming, disabled, placeholder = "Ask Nexus anything", autoFocus },
  ref,
) {
  const { think, setThink, catalog, preferences, refreshUsage } = useWorkspace();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [seconds, setSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef<number>(0);
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

  useEffect(
    () => () => {
      cancelledRef.current = true;
      window.clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    [],
  );

  const submit = () => {
    const text = value.trim();
    if (!text || streaming || disabled) return;
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

  const transcribe = async (blob: Blob, extension: string) => {
    setVoice("transcribing");
    try {
      const { text } = await voiceApi.transcribe(blob, `voice.${extension}`);
      setValue((current) => (current.trim() ? `${current.trim()} ${text}` : text));
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (error) {
      toast.error(
        "Couldn't Transcribe That",
        error instanceof ApiError ? error.message : undefined,
      );
    } finally {
      setVoice("idle");
      refreshUsage();
    }
  };

  const stopRecording = (cancel = false) => {
    cancelledRef.current = cancel;
    window.clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (cancel) setVoice("idle");
  };

  const startRecording = async () => {
    const audioType = pickAudioType();
    if (!audioType || !navigator.mediaDevices?.getUserMedia) {
      toast.error(
        "Voice Input Isn't Available",
        "This browser can't record audio. Please type your message.",
      );
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        "Microphone Blocked",
        "Allow microphone access in your browser's site settings, then try again.",
      );
      return;
    }
    const [mimeType, extension] = audioType;
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      if (cancelledRef.current) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (blob.size < 800) {
        setVoice("idle");
        toast.error("Nothing Recorded", "Hold the mic button a little longer and speak clearly.");
        return;
      }
      transcribe(blob, extension);
    };
    cancelledRef.current = false;
    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setVoice("recording");
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
    }, 250);
  };

  const toggleVoice = () => {
    if (voice === "recording") stopRecording();
    else if (voice === "idle") startRecording();
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

  const canSend = value.trim().length > 0 && !streaming && !disabled;

  return (
    <div
      className={cn(
        "rounded-[28px] border bg-surface shadow-pop transition-colors",
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
        disabled={disabled}
        placeholder={
          disabled
            ? "Trial limit reached"
            : voice === "recording"
              ? "Listening… tap the mic to finish"
              : voice === "transcribing"
                ? "Turning your voice into text…"
                : think
                  ? "Describe the decision or problem"
                  : placeholder
        }
        className="block max-h-60 min-h-[56px] w-full resize-none scrollbar-thin bg-transparent px-5 pt-4 pb-2 text-base leading-relaxed text-fg outline-none placeholder:text-muted disabled:cursor-not-allowed"
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
            className="grid size-9 shrink-0 place-items-center rounded-xl text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-60"
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
          {voice === "recording" && (
            <button
              type="button"
              onClick={() => stopRecording(true)}
              aria-label="Cancel recording"
              title="Cancel Recording"
              className="grid size-9 place-items-center rounded-xl text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleVoice}
            disabled={voice === "transcribing" || disabled}
            aria-pressed={voice === "recording"}
            aria-label={
              voice === "recording"
                ? "Finish recording"
                : voice === "transcribing"
                  ? "Transcribing"
                  : "Record a voice message"
            }
            title={voice === "recording" ? "Finish Recording" : "Voice Input"}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold tabular-nums transition-colors disabled:opacity-60",
              voice === "recording"
                ? "bg-danger-soft text-danger"
                : "text-fg-2 hover:bg-surface-2 hover:text-fg",
            )}
          >
            {voice === "transcribing" ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : voice === "recording" ? (
              <>
                <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden />
                0:{String(seconds).padStart(2, "0")}
              </>
            ) : (
              <Mic className="size-[18px]" />
            )}
          </button>
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop Generating"
              className="grid size-10 place-items-center rounded-full bg-fg text-bg transition-transform active:scale-95"
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
              className="grid size-10 place-items-center rounded-full bg-brand-solid text-on-brand transition-[transform,opacity,background-color] hover:bg-brand-hover active:scale-95 disabled:bg-surface-3 disabled:text-muted"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </div>
      </div>
      {think && (
        <div className="flex items-center gap-2 border-t border-think/20 px-5 py-2 text-xs font-semibold text-think">
          <Lightbulb className="size-3.5" aria-hidden />
          <span className="truncate">Think mode · {thinkEngine} weighs your options first</span>
        </div>
      )}
    </div>
  );
});
