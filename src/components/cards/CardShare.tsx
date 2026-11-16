"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

async function nativeShare(url: string, title: string, text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Cancelled.
    }
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
}

function useCopy(url: string) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return false;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    return true;
  }
  return { copied, copy };
}

/**
 * Patient view: one "Share this card" button (the phone's share sheet, or
 * WhatsApp on desktop) and a quiet Copy link.
 */
export function PatientShare({ url, title }: { url: string; title: string }) {
  const { copied, copy } = useCopy(url);
  const text = `${title}: timings, address and contact`;
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => nativeShare(url, title, text)}
        className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-ink px-6 text-base font-semibold text-paper shadow-lift transition hover:bg-ink-700 active:scale-[.98]"
      >
        <Share2 className="size-5" strokeWidth={1.9} />
        Share this card
      </button>
      <button
        type="button"
        onClick={copy}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-lagoon transition hover:bg-surface"
      >
        {copied ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={1.75} />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}

/**
 * Doctor view: the card link with a Copy button, and one-tap sharing (native
 * share sheet, WhatsApp, email).
 */
export function CardShare({ url, title }: { url: string; title: string }) {
  const { copied, copy: copyLink } = useCopy(url);
  const text = `${title}: timings, address and contact`;

  async function copy() {
    // Older browsers: select the field so the user can copy by hand.
    if (!(await copyLink())) (document.getElementById("card-link") as HTMLInputElement | null)?.select();
  }
  const share = () => nativeShare(url, title, text);

  const tile =
    "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-2 text-sm font-semibold text-ink transition hover:border-ink/30 hover:bg-mint active:scale-[.98]";

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-2">
        <label htmlFor="card-link" className="sr-only">
          Card link
        </label>
        <input
          id="card-link"
          readOnly
          value={url.replace(/^https?:\/\//, "")}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 text-[15px] font-medium text-ink"
        />
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98]",
            copied ? "bg-leaf-text text-white" : "bg-ink text-paper hover:bg-ink-700",
          )}
        >
          {copied ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={1.75} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={share} className={tile}>
          <Share2 className="size-5 text-lagoon" strokeWidth={1.75} />
          Share
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener" className={tile}>
          <MessageCircle className="size-5 text-leaf-text" strokeWidth={1.75} />
          WhatsApp
        </a>
        <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`} className={tile}>
          <Mail className="size-5 text-lagoon" strokeWidth={1.75} />
          Email
        </a>
      </div>
    </div>
  );
}
