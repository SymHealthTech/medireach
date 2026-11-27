"use client";

import { useEffect, useState, useTransition } from "react";
import { Ban, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Result = { ok: boolean; error?: string };

/** The word typed to confirm a permanent delete. */
const DELETE_WORD = "DELETE";

/**
 * Suspend modal: take the website offline for now, delete it for good, or
 * cancel. Deleting asks once more (type DELETE). Opened with `step="delete"`
 * it goes straight to that confirmation (for sites already suspended).
 */
export function SuspendDialog({
  open,
  onOpenChange,
  step: initialStep = "choose",
  what,
  name,
  onSuspend,
  onDelete,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step?: "choose" | "delete";
  /** "page" for doctors, "site" for clinics and hospitals. */
  what: "page" | "site";
  name?: string;
  onSuspend: () => Promise<Result>;
  onDelete: () => Promise<Result>;
  /** After a successful suspend or delete (e.g. refresh the list). */
  onDone: () => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"suspend" | "delete" | null>(null);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setTyped("");
    }
  }, [open, initialStep]);

  const label = name ? `“${name}”` : `this ${what}`;

  function go(kind: "suspend" | "delete", fn: () => Promise<Result>, success: string) {
    setBusy(kind);
    start(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong.");
      toast.success(success);
      onOpenChange(false);
      onDone();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent>
        {step === "choose" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend {label}?</AlertDialogTitle>
              <AlertDialogDescription>Choose what happens to the website.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => go("suspend", onSuspend, `Suspended — ${what} is offline`)}
                className="flex items-start gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:bg-mist disabled:opacity-50"
              >
                {busy === "suspend" ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" /> : <Ban className="mt-0.5 size-4 shrink-0 text-marigold-700" />}
                <span>
                  <span className="block font-semibold text-ink">Suspend temporarily</span>
                  <span className="block text-sm text-muted-foreground">
                    The {what} goes offline. Everything is kept, and you can republish it from the ⋯ menu at any time.
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setStep("delete")}
                className="flex items-start gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:border-destructive/40 hover:bg-destructive/5 disabled:opacity-50"
              >
                <Trash2 className="mt-0.5 size-4 shrink-0 text-clay-text" />
                <span>
                  <span className="block font-semibold text-clay-text">Delete website permanently</span>
                  <span className="block text-sm text-muted-foreground">Removes the {what} and its details for good. This can&apos;t be undone.</span>
                </span>
              </button>
            </div>
            <AlertDialogFooter>
              <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim() === DELETE_WORD) go("delete", onDelete, "Website deleted permanently");
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-clay-text">Delete {label} permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                The {what} goes offline at once and is removed from MediReach, with its links on other pages
                {what === "page" ? ", its enquiries and update requests" : ""}. Payment records are kept. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="grid gap-1.5 text-sm">
              <span>
                Type <span className="font-mono font-semibold">{DELETE_WORD}</span> to confirm
              </span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" disabled={pending} aria-label={`Type ${DELETE_WORD} to confirm`} />
            </label>
            <AlertDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => (initialStep === "delete" ? onOpenChange(false) : setStep("choose"))}
              >
                {initialStep === "delete" ? "Cancel" : "Back"}
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || typed.trim() !== DELETE_WORD}>
                {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete permanently
              </Button>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirm putting a suspended website back online. */
export function RepublishDialog({
  open,
  onOpenChange,
  what,
  name,
  onConfirm,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  what: "page" | "site";
  name?: string;
  onConfirm: () => Promise<Result>;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Republish {name ? `“${name}”` : `this ${what}`}?</AlertDialogTitle>
          <AlertDialogDescription>
            The {what} goes live again at its usual address. It&apos;s checked against the publishing rules first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await onConfirm();
                if (!res.ok) return void toast.error(res.error ?? "Something went wrong.");
                toast.success("Republished — the website is live again");
                onOpenChange(false);
                onDone();
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Send />} Republish
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
