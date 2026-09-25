import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a secure link to reset your Nexus AI password.",
  alternates: { canonical: "/forgot-password" },
};

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
