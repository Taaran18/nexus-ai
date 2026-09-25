import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/lib/config";

const summary =
  "What the Nexus AI trial collects, including your IP address, why we need it, who we share it with and how to delete it.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: summary,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={summary}
      path="/privacy"
      sections={[
        {
          id: "overview",
          title: "Overview",
          body: (
            <p>
              {site.name} (&ldquo;Nexus&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is offered as a
              free trial with no accounts. This policy explains what we collect when you use it,
              why, and how you can export or delete your data at any time from Settings, Data &amp;
              Privacy.
            </p>
          ),
        },
        {
          id: "information-we-collect",
          title: "Information We Collect",
          body: (
            <ul>
              <li>
                <strong>IP address and usage counts:</strong> we record the IP address you connect
                from, when it was first and last seen, and how many messages and uploads it used
                each day. We use this to enforce trial limits and prevent abuse.
              </li>
              <li>
                <strong>Trial ID:</strong> a random identifier created in your browser and stored in
                its local storage. We combine it with your IP address to create a private workspace,
                so other people, even on the same network, can&apos;t see your chats. It
                doesn&apos;t contain your name or email.
              </li>
              <li>
                <strong>Conversations:</strong> the messages you send, the replies you receive,
                ratings, chat titles and folders.
              </li>
              <li>
                <strong>Documents:</strong> files you upload, stored as text passages and numerical
                search vectors.
              </li>
              <li>
                <strong>Memories:</strong> short summaries of up to three chats you choose to save
                to memory.
              </li>
              <li>
                <strong>API keys:</strong> keys you add for third-party providers, encrypted before
                storage.
              </li>
              <li>
                <strong>Technical logs:</strong> request times, status codes and error types, used
                to keep the service reliable. Logs don&apos;t include message content.
              </li>
            </ul>
          ),
        },
        {
          id: "how-we-use-information",
          title: "How We Use Information",
          body: (
            <ul>
              <li>To generate replies, search your documents and apply your saved memories.</li>
              <li>To show your chat history, folders, documents and settings in this browser.</li>
              <li>To apply daily trial limits per IP address and per chat.</li>
              <li>To prevent abuse, enforce rate limits and fix problems.</li>
            </ul>
          ),
        },
        {
          id: "third-parties",
          title: "Services We Share Data With",
          body: (
            <>
              <p>To answer your questions, parts of your data are sent to these services:</p>
              <ul>
                <li>
                  <strong>Groq</strong> processes your messages when you use the free models, and
                  also to route questions, title chats and summarise saved memories.
                </li>
                <li>
                  <strong>Your chosen provider</strong> (OpenAI, Anthropic, Google, OpenRouter, xAI,
                  DeepSeek or Mistral) processes your messages when you pick one of its models with
                  your own key. Its own privacy policy and terms apply.
                </li>
                <li>
                  <strong>Hugging Face</strong> converts document passages and questions into search
                  vectors.
                </li>
                <li>
                  <strong>DuckDuckGo</strong> receives the search query when Nexus searches the web.
                </li>
                <li>
                  <strong>TypeSafe (JEV)</strong> receives each question to decide where Nexus
                  should look for the answer, and in Think mode receives the question and reasoning
                  notes to score your options.
                </li>
                <li>
                  <strong>Hosting providers</strong> run our website and servers and store data on
                  our behalf.
                </li>
              </ul>
              <p>We don&apos;t sell your data, and we don&apos;t use it for advertising.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "How Long We Keep Data",
          body: (
            <p>
              Daily usage counts for an IP address are kept for 14 days. Chats, documents, memories,
              keys and preferences are kept until you delete them or the trial ends. Deleting an
              item removes it immediately, and Delete All My Data in Settings removes everything
              linked to your trial ID. Backups may keep copies for up to 30 days before they are
              overwritten.
            </p>
          ),
        },
        {
          id: "your-rights",
          title: "Your Choices and Rights",
          body: (
            <ul>
              <li>
                <strong>Access and export:</strong> download your trial data from Settings, Data
                &amp; Privacy.
              </li>
              <li>
                <strong>Deletion:</strong> delete individual items, your chat history or all of your
                trial data.
              </li>
              <li>
                <strong>Objection:</strong> contact us if you have concerns about how your data,
                including your IP address, is processed.
              </li>
            </ul>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              API keys are encrypted, connections use HTTPS, and your trial ID is a long random
              value. Anyone with access to your browser can open your trial workspace, so don&apos;t
              use Nexus on shared devices for anything sensitive.
            </p>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <p>
              Nexus isn&apos;t intended for children under 13, and we don&apos;t knowingly collect
              their data.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to This Policy",
          body: (
            <p>
              If we make meaningful changes, we&apos;ll update the date at the top of this page and,
              where appropriate, tell you in the app.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions about privacy? Email{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
