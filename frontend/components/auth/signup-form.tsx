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

export function SignupForm() {
  const { signup } = useAuth();
  const router = useRouter();
  const next = useRedirectWhenSignedIn();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const passwordError =
    touched && password.length > 0 && password.length < 8 ? "Use at least 8 characters." : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (busy || password.length < 8 || !agreed) return;
    setError(null);
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "We couldn't create your account. Try again.",
      );
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeading
        title="Create Your Account"
        description="Free to start. No credit card needed."
      />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <Field label="Name">
          {(props) => (
            <Input
              {...props}
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
            />
          )}
        </Field>
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
          hint="At least 8 characters. Longer is stronger."
          error={passwordError}
        >
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              required
              showStrength
              value={password}
              onBlur={() => setTouched(true)}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <label className="text-fg-2 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 rounded accent-[var(--brand)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-brand hover:text-brand-hover font-semibold">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-brand hover:text-brand-hover font-semibold">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!name.trim() || !email || password.length < 8 || !agreed}
        >
          Create Account
        </Button>
      </form>
      <p className="text-fg-2 mt-8 text-center text-[15px]">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:text-brand-hover font-semibold">
          Sign In
        </Link>
      </p>
    </>
  );
}
