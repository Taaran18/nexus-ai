"use client";

import { Loader2, Menu as MenuIcon, MessageSquarePlus, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChatActionsProvider } from "@/components/app/chat-actions";
import { Sidebar } from "@/components/app/sidebar";
import { WorkspaceProvider } from "@/components/app/workspace-provider";
import { LogoMark } from "@/components/brand/logo";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useStoredState } from "@/lib/hooks/use-stored-state";

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="bg-bg grid min-h-dvh place-items-center px-6 text-center">{children}</div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status === "offline") {
    return (
      <FullScreen>
        <div className="max-w-sm">
          <span className="bg-danger-soft text-danger mx-auto grid size-14 place-items-center rounded-2xl">
            <WifiOff className="size-7" aria-hidden />
          </span>
          <h1 className="text-fg mt-5 text-2xl font-extrabold">We Can&apos;t Reach Nexus</h1>
          <p className="text-fg-2 mt-2">
            Check your internet connection. If it&apos;s working, our servers may be restarting. Try
            again in a moment.
          </p>
          <Button className="mt-6" onClick={retry}>
            Try Again
          </Button>
        </div>
      </FullScreen>
    );
  }

  if (status !== "authenticated") {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-4" role="status">
          <LogoMark className="size-12" />
          <Loader2 className="text-muted size-5 animate-spin" aria-hidden />
          <span className="sr-only">Loading your workspace</span>
        </div>
      </FullScreen>
    );
  }

  return (
    <WorkspaceProvider>
      <Suspense>
        <ChatActionsProvider>
          <ShellFrame>{children}</ShellFrame>
        </ChatActionsProvider>
      </Suspense>
    </WorkspaceProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const mobile = useMediaQuery("(max-width: 767px)", false);
  const [pinned, setPinned] = useStoredState("nexus.sidebar.pinned", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const routeKey = `${pathname}?${params.toString()}`;
  const [lastRoute, setLastRoute] = useState(routeKey);

  if (routeKey !== lastRoute) {
    setLastRoute(routeKey);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b" && !mobile) {
        event.preventDefault();
        setPinned(!pinned);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile, pinned, setPinned]);

  return (
    <div className="bg-bg flex h-dvh overflow-hidden">
      <Sidebar
        pinned={pinned}
        onPinnedChange={setPinned}
        mobile={mobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {mobile && (
          <header className="border-border bg-bg/90 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 backdrop-blur-xl">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
              className="text-fg-2 hover:bg-surface-2 grid size-10 place-items-center rounded-xl"
            >
              <MenuIcon className="size-5" />
            </button>
            <Link href="/chat" className="flex items-center gap-2" aria-label="Nexus AI">
              <LogoMark className="size-7" />
              <span className="font-display text-fg font-extrabold">Nexus AI</span>
            </Link>
            <Link
              href="/chat"
              aria-label="New chat"
              className="text-fg-2 hover:bg-surface-2 grid size-10 place-items-center rounded-xl"
            >
              <MessageSquarePlus className="size-5" />
            </Link>
          </header>
        )}
        <main id="main" className="relative min-h-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
