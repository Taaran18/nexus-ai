import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = {
  title: "Choose a New Password",
  description: "Set a new password for your Nexus AI account.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
