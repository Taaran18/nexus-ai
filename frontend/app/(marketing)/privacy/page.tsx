import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/lib/config";

const summary =
  "What Nexus AI collects, why we need it, who we share it with and how you can see, export or delete it.";

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
              This policy explains how {site.name} (&ldquo;Nexus&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;) handles your information when you use our website and AI assistant.
              We collect only what we need to run the service, and you can export or delete your
              data at any time from Settings.
            </p>
          ),
        },
        {
          id: "information-we-collect",
          title: "Information We Collect",
          body: (
            <ul>
              <li>
                <strong>Account details:</strong> your name, email address and a securely hashed
                password. We never store your password in plain text.
              </li>
              <li>
                <strong>Conversations:</strong> the messages you send, the replies you receive, your
                ratings of replies, chat titles and folders.
              </li>
              <li>
                <strong>Documents:</strong> files you upload to your Knowledge Base, stored as text
                passages and numerical search vectors.
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
                <strong>Sign-in sessions:</strong> the browser, device type and IP address for each
                signed-in session, so you can review and end sessions from Settings.
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
              <li>To create and secure your account and keep you signed in.</li>
              <li>To generate replies, search your documents and apply your saved memories.</li>
              <li>To show your chat history, folders, documents and settings across devices.</li>
              <li>To send password reset emails you request.</li>
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
                  <strong>A reasoning partner (JEV by TypeSpace AI)</strong>, when enabled,
                  processes your question in Think mode.
                </li>
                <li>
                  <strong>Hosting providers</strong> run our website and servers and store your data
                  on our behalf.
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
              We keep your data for as long as your account is active. Deleting a chat, document,
              memory or API key removes it immediately. Deleting your account permanently removes
              your profile, chats, documents, memories, keys and sessions. Backups may keep copies
              for up to 30 days before they are overwritten.
            </p>
          ),
        },
        {
          id: "your-rights",
          title: "Your Choices and Rights",
          body: (
            <ul>
              <li>
                <strong>Access and export:</strong> download everything we hold about you from
                Settings, Data and Privacy.
              </li>
              <li>
                <strong>Correction:</strong> update your name and email in Settings.
              </li>
              <li>
                <strong>Deletion:</strong> delete individual items, your full history or your
                account.
              </li>
              <li>
                <strong>Objection:</strong> contact us if you have concerns about how your data is
                processed.
              </li>
            </ul>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              Passwords are hashed with scrypt, API keys are encrypted, connections use HTTPS and
              sessions use short-lived tokens that you can revoke. No system is perfectly secure, so
              please use a strong, unique password.
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
