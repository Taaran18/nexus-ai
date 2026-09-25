"use client";

import { Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/chat/copy-button";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export function ProfileSection() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const dirty = name.trim() !== (user?.name ?? "") && name.trim().length > 0;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      setUser(await accountApi.update({ name: name.trim() }));
      toast.success("Profile Updated", "Your name has been saved.");
    } catch (error) {
      toast.error(
        "Couldn't Save Your Profile",
        error instanceof ApiError ? error.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Profile"
          description="How Nexus greets you."
          icon={<UserRound className="size-5" />}
        />
        <CardBody>
          <form onSubmit={save} className="space-y-5">
            <Field label="Display Name">
              {(props) => (
                <Input
                  {...props}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={!dirty || saving}
                onClick={() => setName(user?.name ?? "")}
              >
                Discard
              </Button>
              <Button type="submit" loading={saving} disabled={!dirty}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Email Address"
          description="Used to sign in and to reset your password."
          icon={<Mail className="size-5" />}
          action={
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              Change Email
            </Button>
          }
        />
        <CardBody>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="bg-bg-subtle rounded-2xl px-4 py-3">
              <dt className="text-muted text-xs font-bold tracking-wider uppercase">Email</dt>
              <dd className="text-fg mt-1 truncate text-sm font-semibold">{user?.email}</dd>
            </div>
            <div className="bg-bg-subtle rounded-2xl px-4 py-3">
              <dt className="text-muted text-xs font-bold tracking-wider uppercase">
                Member Since
              </dt>
              <dd className="text-fg mt-1 text-sm font-semibold">
                {user ? formatDate(user.created_at) : "—"}
              </dd>
            </div>
            <div className="bg-bg-subtle rounded-2xl px-4 py-3">
              <dt className="text-muted text-xs font-bold tracking-wider uppercase">Account ID</dt>
              <dd className="text-fg mt-0.5 flex items-center gap-1 text-sm font-semibold">
                <span className="truncate font-mono text-xs">{user?.id}</span>
                {user && <CopyButton text={user.id} label="Copy account ID" />}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>
      {emailOpen && <ChangeEmailDialog onClose={() => setEmailOpen(false)} />}
    </>
  );
}

function ChangeEmailDialog({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid =
    /\S+@\S+\.\S+/.test(email) && email.trim().toLowerCase() !== user?.email && password.length > 0;

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      setUser(await accountApi.changeEmail(email.trim(), password));
      toast.success("Email Updated", `You'll sign in with ${email.trim()} from now on.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't change your email. Try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      title="Change Your Email?"
      description={
        <>
          You currently sign in with <strong className="text-fg">{user?.email}</strong>. Confirm
          your password to switch to a new address.
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy} disabled={!valid}>
            Update Email
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="New Email" error={error}>
          {(props) => (
            <Input
              {...props}
              data-autofocus
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Current Password">
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
