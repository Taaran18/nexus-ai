import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { site } from "@/lib/config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/#models", label: "Models" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Create Account" },
      { href: "/login", label: "Sign In" },
      { href: "/forgot-password", label: "Reset Password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-border bg-bg-subtle border-t">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_2fr] lg:px-10">
        <div className="max-w-sm">
          <Logo />
          <p className="text-fg-2 mt-4 text-sm leading-relaxed">
            An AI assistant built on LangGraph that answers from the web, your documents and the
            models you choose, and shows you every step along the way.
          </p>
          <a
            href={`mailto:${site.contactEmail}`}
            className="text-brand hover:text-brand-hover mt-4 inline-block text-sm font-semibold"
          >
            {site.contactEmail}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-fg text-sm font-bold">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-fg-2 hover:text-brand text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-border border-t">
        <div className="text-muted mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} Nexus AI. All rights reserved.</p>
          <p>Built with LangGraph, LangChain and Groq.</p>
        </div>
      </div>
    </footer>
  );
}
