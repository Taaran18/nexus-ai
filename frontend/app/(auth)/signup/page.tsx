import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free Nexus AI account and start chatting with fast free models, web search and your own documents.",
  alternates: { canonical: "/signup" },
};

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
