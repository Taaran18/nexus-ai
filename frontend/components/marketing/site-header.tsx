"use client";

import { Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#models", label: "Models" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || open
          ? "border-border bg-bg/85 border-b backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-fg-2 hover:bg-surface-2 hover:text-fg rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <LinkButton href="/chat" size="md" className="hidden sm:inline-flex">
              Open Nexus
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" className="hidden sm:inline-flex">
                Sign In
              </LinkButton>
              <LinkButton href="/signup" className="hidden sm:inline-flex">
                Get Started
              </LinkButton>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="text-fg-2 hover:bg-surface-2 hover:text-fg grid size-10 place-items-center rounded-xl transition-colors lg:hidden"
          >
            {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="animate-fade-in border-border bg-bg h-[calc(100dvh-4rem)] overflow-y-auto border-t px-4 pb-8 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-fg hover:bg-surface-2 rounded-2xl px-4 py-4 text-lg font-bold transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-border grid gap-3 border-t pt-6">
            {signedIn ? (
              <LinkButton href="/chat" size="lg">
                Open Nexus
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/signup" size="lg">
                  Get Started
                </LinkButton>
                <LinkButton href="/login" size="lg" variant="outline">
                  Sign In
                </LinkButton>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
