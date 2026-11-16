"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { requestChangeAction } from "@/app/account/actions";
import { Textarea } from "@/components/ui/textarea";

/** "Request a change": anything the doctor can't edit themselves. */
export function ChangeRequestForm({ priceLabel }: { priceLabel: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-leaf/30 bg-leaf/10 p-4 text-body">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" strokeWidth={1.75} />
        <div>
          <p>{done}</p>
          <button type="button" onClick={() => setDone(null)} className="mt-2 text-sm font-medium text-ink underline">
            Request something else
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestChangeAction({ description: text });
          if (res.ok) {
            setText("");
            setError(null);
            setDone(
              res.data.free
                ? "Request sent. This one is free (your first update). We'll make the change and let you know."
                : `Request sent. We'll confirm the change and the ₹${res.data.price.toLocaleString("en-IN")} fee with you on WhatsApp.`,
            );
          } else setError(res.fieldErrors?.description ?? res.error);
        });
      }}
      className="space-y-3"
      noValidate
    >
      <label htmlFor="change-request" className="block text-sm font-medium text-body">
        What would you like to change? <span className="font-normal text-muted-foreground">({priceLabel})</span>
      </label>
      <Textarea
        id="change-request"
        rows={4}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Add a new clinic in Baner, update my photo, add an award…"
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p role="alert" className="text-sm text-clay-text">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-ink px-6 font-semibold text-ink hover:bg-sage disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />} Request a change
      </button>
    </form>
  );
}
