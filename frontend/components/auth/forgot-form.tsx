"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.forgot(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't send the email. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="bg-brand-soft text-brand mx-auto grid size-14 place-items-center rounded-2xl">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <AuthHeading
          title="Check Your Email"
          description={
            <>
              If an account exists for <strong className="text-fg">{email}</strong>, we&apos;ve sent
              a link to reset your password. It expires in 30 minutes.
            </>
          }
        />
        <LinkButton href="/login" variant="outline" size="lg" className="w-full">
          Back to Sign In
        </LinkButton>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Reset Your Password"
        description="Enter the email you signed up with and we'll send you a reset link."
      />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <Field label="Email">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email}>
          Send Reset Link
        </Button>
      </form>
      <p className="text-fg-2 mt-8 text-center text-[15px]">
        Remembered it?{" "}
        <Link href="/login" className="text-brand hover:text-brand-hover font-semibold">
          Sign In
        </Link>
      </p>
    </>
  );
}
