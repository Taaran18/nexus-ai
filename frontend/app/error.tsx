"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert className="size-8" aria-hidden />
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-fg">Something Went Wrong</h1>
        <p className="mt-4 text-lg text-fg-2">
          This page hit an unexpected error. Your chats are safe. Try again, and if it keeps
          happening, reload the page.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="size-4" aria-hidden />
            Try Again
          </Button>
          <LinkButton href="/" size="lg" variant="outline">
            Back to Chat
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
