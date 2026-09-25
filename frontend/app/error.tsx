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
    <main id="main" className="bg-bg grid min-h-dvh place-items-center px-4 text-center">
      <div className="max-w-md">
        <span className="bg-danger-soft text-danger mx-auto grid size-16 place-items-center rounded-2xl">
          <TriangleAlert className="size-8" aria-hidden />
        </span>
        <h1 className="text-fg mt-6 text-4xl font-extrabold">Something Went Wrong</h1>
        <p className="text-fg-2 mt-4 text-lg">
          This page hit an unexpected error. Your chats are safe. Try again, and if it keeps
          happening, reload the page.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="size-4" aria-hidden />
            Try Again
          </Button>
          <LinkButton href="/" size="lg" variant="outline">
            Go to Home
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
