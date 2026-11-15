"use client";

import { Share2 } from "lucide-react";

/** Native share sheet on phones; falls back to WhatsApp share on desktop. */
export function ShareCardButton({ url, title, className }: { url: string; title: string; className?: string }) {
  async function share() {
    const text = `${title} — timings, address and contact`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // cancelled — fall through to nothing
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, "_blank", "noopener");
  }
  return (
    <button type="button" onClick={share} className={className}>
      <Share2 className="size-4" strokeWidth={1.75} /> Share card
    </button>
  );
}
