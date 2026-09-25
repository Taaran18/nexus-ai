"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password ? "The passwords don't match." : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || password.length < 8 || password !== confirm) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.reset(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "We couldn't reset your password. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <AuthHeading
          title="This Link Is Incomplete"
          description="Open the reset link from your email again, or request a new one."
        />
        <LinkButton href="/forgot-password" size="lg" className="w-full">
          Request a New Link
        </LinkButton>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="bg-success-soft text-success mx-auto grid size-14 place-items-center rounded-2xl">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <AuthHeading
          title="Password Updated"
          description="Your password has been changed and you've been signed out everywhere. Sign in with your new password."
        />
        <LinkButton href="/login" size="lg" className="w-full">
          Sign In
        </LinkButton>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Choose a New Password"
        description="Pick something you haven't used for Nexus before."
      />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <Field label="New Password" hint="At least 8 characters.">
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              showStrength
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Field label="Confirm New Password" error={mismatch}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </Field>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={password.length < 8 || password !== confirm}
        >
          Update Password
        </Button>
      </form>
    </>
  );
}
