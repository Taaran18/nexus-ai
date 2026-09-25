import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatView } from "@/components/chat/chat-view";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: `${site.name}: ${site.tagline}` },
  description: site.description,
  alternates: { canonical: "/" },
};

export default function ChatPage() {
  return (
    <Suspense>
      <ChatView />
    </Suspense>
  );
}
