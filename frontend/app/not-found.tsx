import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Logo />
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-16 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Compass className="size-8" aria-hidden />
          </span>
          <p className="mt-6 text-sm font-bold tracking-[0.18em] text-brand uppercase">Error 404</p>
          <h1 className="mt-2 text-4xl font-extrabold text-fg sm:text-5xl">Page Not Found</h1>
          <p className="mt-4 text-lg text-fg-2">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Check the address, or
            head back home.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href="/" size="lg">
              Open Nexus
            </LinkButton>
          </div>
        </div>
      </main>
    </div>
  );
}
