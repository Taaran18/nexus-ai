import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

export function Section({
  id,
  tone = "base",
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  tone?: "base" | "subtle";
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        "scroll-mt-16 py-20 sm:py-28",
        tone === "subtle" ? "border-border bg-bg-subtle border-y" : "bg-bg",
        className,
      )}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <Reveal className="mx-auto max-w-3xl text-center">
          {eyebrow && (
            <p className="text-brand text-xs font-bold tracking-[0.18em] uppercase">{eyebrow}</p>
          )}
          <h2
            id={id ? `${id}-title` : undefined}
            className="text-fg mt-3 text-3xl font-extrabold sm:text-5xl"
          >
            {title}
          </h2>
          {description && (
            <p className="text-fg-2 mt-5 text-base leading-relaxed sm:text-lg">{description}</p>
          )}
        </Reveal>
        <div className="mt-14 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}
