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
      <header className="border-border bg-bg-subtle border-b">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <p className="text-brand text-xs font-bold tracking-[0.18em] uppercase">Legal</p>
          <h1 className="text-fg mt-3 text-4xl font-extrabold sm:text-6xl">{title}</h1>
          <p className="text-fg-2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed">{summary}</p>
          <p className="text-muted mt-4 text-sm font-semibold">Last Updated: {site.legalUpdated}</p>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-10">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-muted text-xs font-bold tracking-wider uppercase">On This Page</p>
            <ol className="border-border mt-4 space-y-1 border-l">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-fg-2 hover:border-brand hover:text-brand -ml-px block border-l border-transparent py-1.5 pl-4 text-sm transition-colors"
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
                  ? "border-border bg-surface scroll-mt-24 rounded-3xl border p-6 sm:p-8"
                  : "border-border bg-bg-subtle scroll-mt-24 rounded-3xl border p-6 sm:p-8"
              }
            >
              <h2 id={`${section.id}-title`} className="text-fg text-2xl font-bold">
                {index + 1}. {section.title}
              </h2>
              <div className="prose prose-neutral dark:prose-invert prose-p:text-fg-2 prose-strong:text-fg prose-a:text-brand prose-li:text-fg-2 mt-4 max-w-none text-[15px] leading-relaxed">
                {section.body}
              </div>
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
