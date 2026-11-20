"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { VISITING_CARDS } from "@/content/marketing";

/** Code-name chip with a copy button (visiting card gallery). */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(code).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          },
          () => undefined,
        )
      }
      aria-label={`${VISITING_CARDS.copy}: ${code}`}
      className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-lagoon/50 bg-mint px-3 font-mono text-[15px] font-bold tracking-wide text-ink transition hover:border-lagoon active:scale-[.98]"
    >
      {code}
      {copied ? (
        <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-leaf-text">
          <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
          {VISITING_CARDS.copied}
        </span>
      ) : (
        <Copy aria-hidden className="size-3.5 text-lagoon" strokeWidth={2} />
      )}
    </button>
  );
}
