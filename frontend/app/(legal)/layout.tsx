import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { LinkButton } from "@/components/ui/button";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton href="/" variant="outline">
              <ArrowLeft className="size-4" aria-hidden />
              Back to Chat
            </LinkButton>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
