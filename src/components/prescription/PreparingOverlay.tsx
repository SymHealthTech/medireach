"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/**
 * Full-screen "preparing prescription…" overlay shown in-app while the PDF
 * rasterises and uploads, right before WhatsApp opens. This replaces the old
 * approach of pre-opening a blank browser tab and painting a loader into it —
 * which surfaced as a jarring black `about:blank` page and left the Send button
 * stuck if the doctor closed the tab. Here the doctor stays inside the app and
 * sees clear, branded progress; WhatsApp opens the moment the PDF is ready.
 */
export function PreparingOverlay({ open }: { open: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparing prescription"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-surface/95 px-6 text-center backdrop-blur-sm"
    >
      {/* WhatsApp-green ring so the doctor connects this wait to the send. */}
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-line/60" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#25D366]" />
        <span className="text-2xl">💬</span>
      </span>
      <div className="max-w-xs space-y-1.5">
        <h2 className="text-lg font-semibold text-ink">Preparing prescription…</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Building the PDF and opening WhatsApp. This takes a few seconds — please stay on this screen.
        </p>
      </div>
    </div>,
    document.body,
  );
}
