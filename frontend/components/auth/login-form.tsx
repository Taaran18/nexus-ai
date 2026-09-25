"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { useRedirectWhenSignedIn } from "@/components/auth/use-redirect-when-signed-in";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useRedirectWhenSignedIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't sign you in. Try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeading title="Welcome Back" description="Sign in to pick up where you left off." />
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
        <Field
          label="Password"
          action={
            <Link
              href="/forgot-password"
              className="text-brand hover:text-brand-hover text-sm font-semibold"
            >
              Forgot Password?
            </Link>
          }
        >
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!email || !password}
        >
          Sign In
        </Button>
      </form>
      <p className="text-fg-2 mt-8 text-center text-[15px]">
        New to Nexus?{" "}
        <Link href="/signup" className="text-brand hover:text-brand-hover font-semibold">
          Create an Account
        </Link>
      </p>
    </>
  );
}
