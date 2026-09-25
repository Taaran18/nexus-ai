"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, PasswordInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export function SecuritySection() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== next ? "The new passwords don't match." : null;
  const valid = current.length > 0 && next.length >= 8 && next === confirm;

  return (
    <>
      <Card>
        <CardHeader
          title="Change Password"
          description={
            user?.password_changed_at
              ? `Last changed ${formatDate(user.password_changed_at)}.`
              : "Use a long, unique password you don't use anywhere else."
          }
          icon={<KeyRound className="size-5" />}
        />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) setConfirming(true);
            }}
            className="max-w-xl space-y-5"
          >
            {error && (
              <p
                role="alert"
                className="bg-danger-soft text-danger rounded-2xl px-4 py-3 text-sm font-medium"
              >
                {error}
              </p>
            )}
            <Field label="Current Password">
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              )}
            </Field>
            <Field label="New Password" hint="At least 8 characters.">
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="new-password"
                  showStrength
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
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
            <label className="text-fg-2 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--brand)]"
              />
              Sign out of every other device after changing it
            </label>
            <Button type="submit" disabled={!valid}>
              Update Password
            </Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Sign Out"
          description="End your session on this device. Your chats and settings stay saved."
          icon={<LogOut className="size-5" />}
          action={
            <Button
              variant="outline"
              loading={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await logout();
                router.replace("/login");
              }}
            >
              Sign Out
            </Button>
          }
        />
      </Card>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        tone="default"
        title="Change Your Password?"
        description={
          signOutOthers
            ? "You'll stay signed in here, and every other device will be signed out."
            : "You'll stay signed in on this device and your other devices."
        }
        confirmLabel="Change Password"
        onConfirm={async () => {
          setError(null);
          try {
            const result = await accountApi.changePassword(current, next, signOutOthers);
            setCurrent("");
            setNext("");
            setConfirm("");
            toast.success(
              "Password Changed",
              result.signed_out_sessions
                ? `Signed out of ${result.signed_out_sessions} other session(s).`
                : undefined,
            );
          } catch (err) {
            setError(
              err instanceof ApiError
                ? err.message
                : "We couldn't change your password. Try again.",
            );
          }
        }}
      />
    </>
  );
}
