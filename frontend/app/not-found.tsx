import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Logo />
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-16 text-center">
        <div className="max-w-md">
          <span className="bg-brand-soft text-brand mx-auto grid size-16 place-items-center rounded-2xl">
            <Compass className="size-8" aria-hidden />
          </span>
          <p className="text-brand mt-6 text-sm font-bold tracking-[0.18em] uppercase">Error 404</p>
          <h1 className="text-fg mt-2 text-4xl font-extrabold sm:text-5xl">Page Not Found</h1>
          <p className="text-fg-2 mt-4 text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Check the address, or
            head back home.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href="/" size="lg">
              Go to Home
            </LinkButton>
            <LinkButton href="/chat" size="lg" variant="outline">
              Open Chat
            </LinkButton>
          </div>
        </div>
      </main>
    </div>
  );
}
