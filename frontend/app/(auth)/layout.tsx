import { Brain, Globe, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

const POINTS = [
  { icon: Globe, text: "Answers from the live web, with real sources" },
  { icon: Lightbulb, text: "Think mode for decisions that matter" },
  { icon: Brain, text: "Memory and documents that you control" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="text-muted flex flex-wrap justify-center gap-x-5 gap-y-2 px-4 pb-6 text-sm">
          <Link href="/privacy" className="hover:text-brand">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-brand">
            Terms of Service
          </Link>
          <Link href="/disclaimer" className="hover:text-brand">
            Disclaimer
          </Link>
        </footer>
      </div>
      <aside className="border-border bg-bg-subtle relative hidden overflow-hidden border-l lg:flex lg:items-center lg:justify-center">
        <div className="grid-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative max-w-md px-10">
          <h2 className="text-fg text-4xl leading-tight font-extrabold">
            The AI Assistant That <span className="text-brand">Shows Its Work</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-center gap-4">
                <span className="bg-brand-soft text-brand grid size-11 shrink-0 place-items-center rounded-2xl">
                  <point.icon className="size-5" aria-hidden />
                </span>
                <span className="text-fg text-[15px] font-semibold">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
