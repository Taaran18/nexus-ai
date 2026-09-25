import {
  ArrowRight,
  BookOpenText,
  Brain,
  CheckCircle2,
  FolderTree,
  Globe,
  KeyRound,
  Layers,
  Lightbulb,
  Lock,
  Mic,
  Route,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { Faq } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { Reveal } from "@/components/marketing/reveal";
import { Section } from "@/components/marketing/section";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: `${site.name}: ${site.tagline}` },
  description: site.description,
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Route,
    title: "Smart Routing",
    text: "Every question is routed automatically to the right source: live web search, your uploaded files or the model's own knowledge.",
  },
  {
    icon: Lightbulb,
    title: "Think Mode",
    text: "Turn on Think for hard decisions. Nexus weighs options, trade-offs and unknowns first, then gives you a clear recommendation.",
  },
  {
    icon: BookOpenText,
    title: "Chat With Your Documents",
    text: "Upload PDFs, notes or CSVs. Nexus finds the relevant passages and tells you which file each answer came from.",
  },
  {
    icon: Globe,
    title: "Live Web Search",
    text: "For news, prices and anything recent, Nexus searches the web and cites the pages it used, with real links.",
  },
  {
    icon: Brain,
    title: "Memory You Control",
    text: "Save up to three important chats to memory. Nexus remembers the key points in future conversations until you remove them.",
  },
  {
    icon: KeyRound,
    title: "Bring Your Own Models",
    text: "Chat free on Groq, or connect your OpenAI, Claude, Gemini, OpenRouter, xAI, DeepSeek or Mistral key to use their models.",
  },
  {
    icon: FolderTree,
    title: "Folders and Export",
    text: "Organise chats into colour-coded folders, search them instantly and export any conversation as Markdown.",
  },
  {
    icon: Mic,
    title: "Voice Input",
    text: "Speak instead of typing. Voice input works in any browser that supports speech recognition, like Chrome and Edge.",
  },
];

const STEPS = [
  {
    icon: Sparkles,
    title: "Understand",
    text: "A fast model reads your question and decides what kind of help you need.",
  },
  {
    icon: Layers,
    title: "Gather",
    text: "Nexus searches your documents or the live web when the question calls for it.",
  },
  {
    icon: Lightbulb,
    title: "Think",
    text: "With Think on, a reasoning engine lays out options and trade-offs before answering.",
  },
  {
    icon: Workflow,
    title: "Answer",
    text: "Your chosen model writes the reply, streamed word by word, with sources attached.",
  },
];

const GROQ_MODELS = [
  {
    name: "GPT-OSS 20B",
    group: "Fast",
    tone: "brand" as const,
    bestFor: "Quick everyday questions, short emails and summaries.",
    why: "You want an answer right now.",
  },
  {
    name: "GPT-OSS 120B",
    group: "Fast",
    tone: "brand" as const,
    bestFor: "Smarter all-round answers for writing, coding and research.",
    why: "The fastest model feels too shallow.",
  },
  {
    name: "GPT-OSS 120B Thorough",
    group: "Slow & Thorough",
    tone: "think" as const,
    bestFor: "Maths, logic, tricky code and careful planning.",
    why: "Accuracy matters more than a few seconds.",
  },
  {
    name: "Qwen 3.8 27B",
    group: "New",
    tone: "success" as const,
    bestFor: "The newest model on Groq, strong at problem solving and languages.",
    why: "You want to try the latest model.",
  },
];

const PROVIDERS = [
  "OpenAI",
  "Anthropic Claude",
  "Google Gemini",
  "OpenRouter",
  "xAI Grok",
  "DeepSeek",
  "Mistral AI",
];

const PRIVACY = [
  {
    icon: Trash2,
    title: "Delete Anything, Anytime",
    text: "Remove a chat, a document, your whole history or your account from Settings. Deletion is permanent and immediate.",
  },
  {
    icon: Lock,
    title: "Encrypted API Keys",
    text: "Keys you add are encrypted before they're stored and are never shown again in full. Remove them with one click.",
  },
  {
    icon: ShieldCheck,
    title: "Only What's Needed",
    text: "We store your account, chats, files and memories so the product works. No ads, no selling data, no tracking pixels.",
  },
];

const FAQ = [
  {
    q: "Is Nexus AI free to use?",
    a: "Yes. The Groq models are included at no cost, subject to fair-use limits. If you connect your own OpenAI, Claude, Gemini or OpenRouter key, that provider bills you directly for what you use, at the prices shown in the model picker.",
  },
  {
    q: "What does Think mode do?",
    a: "Think adds a deliberation step before the answer. Nexus writes out the goal, the realistic options, their trade-offs and what's uncertain, then recommends a path with a confidence level. You can open the thinking notes under any reply. It's slower, so use it for decisions and hard problems.",
  },
  {
    q: "How is my data used?",
    a: "Your messages are sent to the model provider you choose to generate replies. Uploaded files are split into passages and turned into search vectors so Nexus can find relevant parts. We don't sell data or use it for advertising. See the Privacy Policy for details.",
  },
  {
    q: "Which model should I pick?",
    a: "Start with GPT-OSS 20B for everyday questions. Switch to GPT-OSS 120B when you want a smarter answer, and to the Thorough version for maths, code or planning. Each model in the picker explains what it's best at.",
  },
  {
    q: "What does memory remember?",
    a: "Only the chats you explicitly save, up to three at a time. Nexus stores a short summary of each and uses it for context in future chats. You can see and remove every memory in Settings.",
  },
  {
    q: "Can Nexus make mistakes?",
    a: "Yes. AI models can be wrong or out of date, even with web search. Check important facts, and don't rely on Nexus for medical, legal or financial decisions. Read the Disclaimer for more.",
  },
];

export default function HomePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon.svg`,
      email: site.contactEmail,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      description: site.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      url: site.url,
      description: site.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: FEATURES.map((f) => f.title),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <section className="relative overflow-hidden">
        <div className="grid-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex max-w-[1400px] flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 lg:px-10">
          <Reveal>
            <span className="border-border bg-surface text-fg-2 shadow-card inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold">
              <span className="bg-brand size-2 rounded-full" aria-hidden />
              Built on LangGraph and LangChain
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-fg mt-7 max-w-5xl text-5xl leading-[1.04] font-extrabold sm:text-6xl lg:text-7xl">
              The AI Assistant That <span className="text-brand">Shows Its Work</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-fg-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
              Nexus routes every question to the right source (the web, your documents or the model
              itself), thinks it through when it matters and shows you each step as it happens.
            </p>
          </Reveal>
          <Reveal
            delay={240}
            className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
          >
            <LinkButton href="/signup" size="lg">
              Start Chatting Free
              <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
            <LinkButton href="/#how-it-works" size="lg" variant="outline">
              See How It Works
            </LinkButton>
          </Reveal>
          <Reveal delay={320} className="mt-16 w-full max-w-4xl">
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      <Section
        id="features"
        tone="subtle"
        eyebrow="Features"
        title="Everything You Need in One Assistant"
        description="Fast answers for everyday questions, careful thinking for hard ones, and full control over your data and models."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 4) * 70}>
              <article className="group border-border bg-surface shadow-card hover:border-brand/40 hover:shadow-pop h-full rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1">
                <span className="bg-brand-soft text-brand grid size-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="size-6" aria-hidden />
                </span>
                <h3 className="text-fg mt-5 text-lg font-bold">{feature.title}</h3>
                <p className="text-fg-2 mt-2 text-[15px] leading-relaxed">{feature.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        id="how-it-works"
        eyebrow="How It Works"
        title="A Visible Pipeline, Not a Black Box"
        description="Nexus runs each message through a LangGraph pipeline. You see which step is running while you wait, so you always know what's happening."
      >
        <ol className="relative grid gap-4 md:grid-cols-4">
          <div
            className="bg-border absolute top-12 right-[12%] left-[12%] hidden h-px md:block"
            aria-hidden
          />
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 90} className="relative">
              <div className="border-border bg-surface shadow-card flex h-full flex-col items-center rounded-3xl border p-6 text-center">
                <span className="bg-brand-solid text-on-brand shadow-card relative grid size-14 place-items-center rounded-2xl">
                  <step.icon className="size-6" aria-hidden />
                  <span className="border-border bg-surface text-fg absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border text-xs font-bold">
                    {index + 1}
                  </span>
                </span>
                <h3 className="text-fg mt-5 text-lg font-bold">{step.title}</h3>
                <p className="text-fg-2 mt-2 text-[15px] leading-relaxed">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section
        id="think"
        tone="subtle"
        eyebrow="Think Mode"
        title="Better Decisions, Not Just Faster Answers"
        description="Some questions deserve more than a quick reply. Think mode deliberates first, then answers with a clear recommendation."
      >
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="space-y-5">
            {[
              [
                "Clarifies the Real Goal",
                "Separates what you asked from what you actually need, including hidden constraints.",
              ],
              [
                "Compares Real Options",
                "Lays out at least two approaches when there's a choice to make.",
              ],
              [
                "Weighs the Trade-Offs",
                "Considers evidence, risk, cost, effort and whether the choice can be undone.",
              ],
              [
                "Commits to a Recommendation",
                "Ends with the best path and an honest confidence level.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-4">
                <CheckCircle2 className="text-think mt-0.5 size-6 shrink-0" aria-hidden />
                <div>
                  <h3 className="text-fg text-lg font-bold">{title}</h3>
                  <p className="text-fg-2 mt-1 text-[15px] leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </Reveal>
          <Reveal delay={120}>
            <div className="border-border bg-surface shadow-pop rounded-3xl border p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-think inline-flex items-center gap-2 text-sm font-bold">
                  <Lightbulb className="size-4" aria-hidden />
                  Thinking Notes
                </span>
                <Badge tone="think">Example</Badge>
              </div>
              <p className="bg-surface-2 text-fg mt-4 rounded-2xl px-4 py-3 text-[15px]">
                Should I rewrite our app in a new framework or keep improving the current one?
              </p>
              <div className="border-think/40 text-fg-2 mt-4 space-y-3 border-l-2 pl-4 text-sm leading-relaxed">
                <p>
                  <strong className="text-fg">Goal:</strong> ship features faster without a risky
                  freeze.
                </p>
                <p>
                  <strong className="text-fg">Options:</strong> full rewrite, gradual migration, or
                  targeted refactors.
                </p>
                <p>
                  <strong className="text-fg">Trade-offs:</strong> a rewrite pauses delivery for
                  months; gradual migration keeps shipping but runs two stacks for a while.
                </p>
                <p>
                  <strong className="text-fg">Recommendation:</strong> migrate gradually, starting
                  with the slowest area. Confidence: medium.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section
        id="models"
        eyebrow="Models"
        title="The Right Model for Every Question"
        description="Groq models are included for free. Choose Fast for speed, Slow & Thorough for accuracy, or New to try the latest release."
      >
        <Reveal>
          <div className="border-border bg-surface shadow-card overflow-hidden rounded-3xl border">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Free Groq models and when to use them</caption>
                <thead className="border-border bg-bg-subtle text-muted border-b text-[12px] font-bold tracking-wider uppercase">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Model
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Category
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Best For
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Pick It When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {GROQ_MODELS.map((model) => (
                    <tr
                      key={model.name}
                      className="border-border even:bg-bg-subtle/60 hover:bg-brand-soft border-b transition-colors last:border-0"
                    >
                      <th scope="row" className="text-fg px-6 py-4 font-bold">
                        {model.name}
                      </th>
                      <td className="px-5 py-4">
                        <Badge tone={model.tone}>{model.group}</Badge>
                      </td>
                      <td className="text-fg-2 px-5 py-4">{model.bestFor}</td>
                      <td className="text-fg-2 px-6 py-4">{model.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
        <Reveal delay={100} className="mt-10 text-center">
          <h3 className="text-fg text-xl font-bold">Or Bring Your Own Key</h3>
          <p className="text-fg-2 mx-auto mt-2 max-w-2xl text-[15px]">
            Add a key in Settings and pick from that provider&apos;s live model list, with prices
            per million tokens and a plain-English note on what each model is best at.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
            {PROVIDERS.map((provider) => (
              <li
                key={provider}
                className="border-border bg-surface text-fg shadow-card rounded-full border px-4 py-2 text-sm font-semibold"
              >
                {provider}
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section
        id="privacy"
        tone="subtle"
        eyebrow="Privacy and Control"
        title="Your Data Stays Yours"
        description="Clear controls, no dark patterns. You decide what Nexus keeps and for how long."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {PRIVACY.map((item, index) => (
            <Reveal key={item.title} delay={index * 90}>
              <article className="border-border bg-surface shadow-card h-full rounded-3xl border p-7">
                <item.icon className="text-brand size-7" aria-hidden />
                <h3 className="text-fg mt-5 text-lg font-bold">{item.title}</h3>
                <p className="text-fg-2 mt-2 text-[15px] leading-relaxed">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Questions, Answered">
        <Reveal>
          <Faq items={FAQ} />
        </Reveal>
      </Section>

      <section className="border-border bg-bg-subtle border-t py-20 sm:py-28">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
          <Zap className="text-brand size-10" aria-hidden />
          <h2 className="text-fg mt-5 text-3xl font-extrabold sm:text-5xl">
            Ask Your First Question
          </h2>
          <p className="text-fg-2 mt-4 max-w-xl text-lg">
            Create a free account in under a minute. No credit card, no setup.
          </p>
          <LinkButton href="/signup" size="lg" className="mt-8">
            Create Your Account
            <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </Reveal>
      </section>
    </>
  );
}

function HeroPreview() {
  const steps = ["Understanding", "Searching the Web", "Thinking", "Writing"];
  return (
    <div
      className="border-border bg-surface shadow-pop overflow-hidden rounded-3xl border text-left"
      role="img"
      aria-label="Illustration of a Nexus conversation showing the pipeline steps, thinking notes and a cited answer"
    >
      <div className="border-border bg-bg-subtle flex items-center gap-2 border-b px-5 py-3">
        <span className="bg-border-strong size-3 rounded-full" />
        <span className="bg-border-strong size-3 rounded-full" />
        <span className="bg-border-strong size-3 rounded-full" />
        <span className="text-muted ml-3 text-xs font-semibold">Nexus AI</span>
      </div>
      <div className="space-y-5 p-5 sm:p-8">
        <div className="bg-surface-2 text-fg ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg px-5 py-3 text-[15px]">
          Which laptop should I buy for video editing under $1,500?
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <span
              key={step}
              className={
                index === 2
                  ? "bg-think-soft text-think inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  : "bg-brand-soft text-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              }
            >
              <CheckCircle2 className="size-3.5" aria-hidden />
              {step}
            </span>
          ))}
        </div>
        <div className="text-fg space-y-3 text-[15px] leading-relaxed">
          <p>
            <strong>My recommendation:</strong> pick a 14-inch model with a recent mid-range GPU and
            32 GB of memory. It handles 4K timelines smoothly and stays within budget.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Buying guide", "Benchmark roundup"].map((source) => (
              <span
                key={source}
                className="border-border bg-bg-subtle text-fg-2 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
              >
                <Globe className="text-brand size-3.5" aria-hidden />
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
