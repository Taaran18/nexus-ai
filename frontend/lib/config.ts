export const site = {
  name: "Nexus AI",
  shortName: "Nexus",
  tagline: "The AI Assistant That Shows Its Work",
  description:
    "Try Nexus AI free: a LangGraph-powered AI assistant that answers from the web, your documents and leading models, thinks through decisions and shows every step. No sign-up needed.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com",
  legalUpdated: "September 25, 2026",
  keywords: [
    "AI assistant",
    "AI chatbot",
    "LangGraph",
    "LangChain",
    "Groq",
    "RAG",
    "document Q&A",
    "web search AI",
    "bring your own API key",
    "OpenRouter",
  ],
};
