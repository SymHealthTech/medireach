"use client";

import { useState } from "react";
import { Check, Copy, Fingerprint } from "lucide-react";

/** The website's permanent UID, with a copy button. Quote it when contacting MediReach. */
export function UidBadge({ uid }: { uid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper py-1 pl-3 pr-1 text-sm">
      <Fingerprint aria-hidden className="size-4 text-lagoon" />
      <span className="text-muted-foreground">Website UID</span>
      <span className="font-mono font-semibold text-ink">{uid}</span>
      <button
        type="button"
        aria-label="Copy UID"
        onClick={async () => {
          await navigator.clipboard?.writeText(uid);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-mist hover:text-ink"
      >
        {copied ? <Check className="size-4 text-leaf-text" /> : <Copy className="size-4" />}
      </button>
    </span>
  );
}
