"use client";

import { FileText, Info, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/chat/copy-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useWorkspace } from "@/components/app/workspace-provider";

const LINKS = [
  {
    href: "/privacy",
    label: "Privacy Policy",
    text: "What we collect, including your IP address, and why.",
    icon: ShieldCheck,
  },
  {
    href: "/terms",
    label: "Terms of Service",
    text: "The rules for using the Nexus AI trial.",
    icon: Scale,
  },
  {
    href: "/disclaimer",
    label: "Disclaimer",
    text: "What Nexus can and can't do, and when to double-check.",
    icon: FileText,
  },
];

export function AboutSection() {
  const { trialId } = useWorkspace();
  const id = trialId ?? "";
  return (
    <>
      <Card>
        <CardHeader
          title="Legal"
          description="Read how Nexus works and how your data is handled."
          icon={<Scale className="size-5" />}
        />
        <CardBody>
          <ul className="grid gap-3 md:grid-cols-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex h-full flex-col rounded-2xl border border-border bg-bg-subtle p-5 transition-colors hover:border-brand"
                >
                  <link.icon className="size-6 text-brand" aria-hidden />
                  <span className="mt-3 font-bold text-fg">{link.label}</span>
                  <span className="mt-1 text-sm text-fg-2">{link.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="About This Trial"
          description="There are no accounts in the trial. Your workspace is private to this browser on this network."
          icon={<Info className="size-5" />}
        />
        <CardBody>
          <div className="rounded-2xl bg-bg-subtle px-4 py-3">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Trial ID</p>
            <p className="mt-1 flex items-center gap-1 font-mono text-xs text-fg">
              <span className="truncate">{id}</span>
              {id && <CopyButton text={id} label="Copy trial ID" />}
            </p>
          </div>
          <p className="mt-3 text-sm text-fg-2">
            Each person gets a separate workspace, even on the same network. It&apos;s tied to this
            browser and your current IP address, so clearing browser data, switching browsers or
            connecting from a different network (for example mobile data or a VPN) opens a fresh
            workspace. Export anything you want to keep from Data &amp; Privacy.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
