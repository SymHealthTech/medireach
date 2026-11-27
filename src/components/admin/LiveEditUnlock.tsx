"use client";

import { useEffect, useState, useTransition } from "react";
import { KeyRound, Loader2, Lock, LockOpen, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemEditCodeAction, sendEditCodeAction } from "@/app/admin/(dash)/edit-unlock-actions";

/**
 * Shown to a sales executive on a live website. They can't change it until
 * the owner agrees: "Email the code" sends a 6-digit code to the doctor's /
 * owner's login email, the owner reads it out, and a correct code opens the
 * editor for a couple of hours. While open, it says until when.
 */
export function LiveEditUnlock({
  kind,
  id,
  owner,
  until,
  onUnlocked,
}: {
  kind: "doctor" | "site";
  id: string;
  /** "the doctor" / "the owner". */
  owner: string;
  until?: string;
  onUnlocked: (until: string) => void;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [, tick] = useState(0);
  const open = until && new Date(until).getTime() > Date.now();

  // Close the editor again when the time is up.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [open]);

  if (open) {
    const time = new Date(until).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    return (
      <div className="flex items-start gap-3 rounded-xl border border-leaf/30 bg-leaf/10 p-4 text-sm">
        <LockOpen className="mt-0.5 size-4 shrink-0 text-leaf-text" />
        <p>
          This website is live. {owner[0]!.toUpperCase() + owner.slice(1)} approved changes with their code: you can update it until <strong>{time}</strong>. Every save
          goes live at once.
        </p>
      </div>
    );
  }

  const send = () =>
    start(async () => {
      setError(undefined);
      const res = await sendEditCodeAction({ kind, id });
      if (!res.ok) return void toast.error(res.error);
      setSentTo(res.data.to);
      toast.success(`Code emailed to ${res.data.to}`);
    });

  const redeem = () =>
    start(async () => {
      setError(undefined);
      const res = await redeemEditCodeAction({ kind, id, code });
      if (!res.ok) return void setError(res.error);
      toast.success("Unlocked — you can update the website now");
      setCode("");
      onUnlocked(res.data.until);
    });

  return (
    <div className="space-y-3 rounded-xl border border-line bg-muted p-4 text-sm">
      <p className="flex items-start gap-3">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <span>
          This website is live. To update it, {owner} must agree: we email them a 6-digit code, and you type it here. The super admin can update it directly.
        </span>
      </p>
      <div className="flex flex-wrap items-end gap-2 pl-7">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={send}>
          {pending && !sentTo ? <Loader2 className="animate-spin" /> : <Mail />} {sentTo ? "Send a new code" : `Email the code to ${owner}`}
        </Button>
        {sentTo && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              redeem();
            }}
          >
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Code sent to {sentTo}</span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                aria-label="Code from the owner"
                aria-invalid={error ? true : undefined}
                className="h-8 w-36 bg-card font-mono tracking-widest"
              />
            </label>
            <Button type="submit" size="sm" disabled={pending || code.length !== 6}>
              {pending && sentTo ? <Loader2 className="animate-spin" /> : <KeyRound />} Unlock
            </Button>
          </form>
        )}
      </div>
      {error && <p className="pl-7 text-clay-text">{error}</p>}
    </div>
  );
}
