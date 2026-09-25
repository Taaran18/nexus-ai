import { JsonLd } from "@/components/marketing/json-ld";
import { site } from "@/lib/config";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export function LegalPage({
  title,
  summary,
  path,
  sections,
}: {
  title: string;
  summary: string;
  path: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${title} | ${site.name}`,
          url: `${site.url}${path}`,
          description: summary,
          dateModified: "2026-09-25",
          isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
        }}
      />
      <header className="border-b border-border bg-bg-subtle">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">Legal</p>
          <h1 className="mt-3 text-4xl font-extrabold text-fg sm:text-6xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-fg-2">{summary}</p>
          <p className="mt-4 text-sm font-semibold text-muted">Last Updated: {site.legalUpdated}</p>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-10">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">On This Page</p>
            <ol className="mt-4 space-y-1 border-l border-border">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-fg-2 transition-colors hover:border-brand hover:text-brand"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <article className="min-w-0 space-y-4">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className={
                index % 2 === 0
                  ? "scroll-mt-24 rounded-3xl border border-border bg-surface p-6 sm:p-8"
                  : "scroll-mt-24 rounded-3xl border border-border bg-bg-subtle p-6 sm:p-8"
              }
            >
              <h2 id={`${section.id}-title`} className="text-2xl font-bold text-fg">
                {index + 1}. {section.title}
              </h2>
              <div className="prose mt-4 max-w-none text-[15px] leading-relaxed prose-neutral dark:prose-invert prose-p:text-fg-2 prose-a:text-brand prose-strong:text-fg prose-li:text-fg-2">
                {section.body}
              </div>
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
