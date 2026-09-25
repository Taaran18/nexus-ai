"use client";

import { Gauge, Lightbulb, MessagesSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const KEY = "nexus.welcome.v1";

function seen() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function WelcomeDialog() {
  const { usage } = useWorkspace();
  const [open, setOpen] = useState(() => typeof window !== "undefined" && !seen());

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
  };

  const points = [
    {
      icon: MessagesSquare,
      text: `${usage?.messages_limit ?? 25} messages a day, up to ${usage?.max_turns_per_chat ?? 15} in each chat.`,
    },
    { icon: Gauge, text: "Limits are counted per network (IP address) and reset at midnight UTC." },
    {
      icon: ShieldCheck,
      text: "Your chats are private to you. They stay with this browser on this network, so a new network starts a fresh workspace.",
    },
    {
      icon: Lightbulb,
      text: "Turn on Think for decisions and hard problems. It takes a little longer.",
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={accept}
      title="Welcome to the Nexus AI Trial"
      description="No sign-up needed. Ask anything, search the web, upload documents or turn on Think mode."
      footer={
        <Button onClick={accept} data-autofocus className="w-full sm:w-auto">
          Start Chatting
        </Button>
      }
    >
      <ul className="space-y-3">
        {points.map((point) => (
          <li
            key={point.text}
            className="flex items-start gap-3 rounded-2xl bg-bg-subtle px-4 py-3"
          >
            <point.icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <span className="text-sm text-fg">{point.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-relaxed text-fg-2">
        By continuing, you agree to the{" "}
        <Link href="/terms" className="font-semibold text-brand hover:text-brand-hover">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/disclaimer" className="font-semibold text-brand hover:text-brand-hover">
          Disclaimer
        </Link>
        , and to our use of your IP address and a browser ID as described in the{" "}
        <Link href="/privacy" className="font-semibold text-brand hover:text-brand-hover">
          Privacy Policy
        </Link>
        .
      </p>
    </Dialog>
  );
}
