"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiPost } from "@/lib/client/api";

/**
 * Discreet SOS trigger (spec §10). Deliberately small (not a big "HELP" button)
 * so activating it doesn't escalate the situation. Tapping opens a short
 * countdown with a clear Cancel, preventing accidental sends — a few false
 * alarms would make colleagues ignore the alert. After the window it captures a
 * one-time GPS fix (clinic address fallback server-side) and sends. A one-tap
 * Call 112 is provided alongside; messaging makes clear it supplements, not
 * replaces, emergency services.
 */
const COUNTDOWN_SECONDS = 5;

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 },
    );
  });
}

export function SosButton() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [result, setResult] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!open) return;
    cancelled.current = false;
    setResult(null);
    setCount(COUNTDOWN_SECONDS);
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          void fire();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fire() {
    if (cancelled.current) return;
    const pos = await getPosition();
    if (cancelled.current) return;
    try {
      const res = await apiPost<{ notified: number }>("/api/sos/trigger", pos ?? {});
      setResult(`Alert sent to ${res.notified} contact${res.notified === 1 ? "" : "s"}.`);
    } catch (e) {
      setResult((e as Error).message);
    }
  }

  function cancel() {
    cancelled.current = true;
    if (timer.current) clearInterval(timer.current);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Emergency SOS"
        title="Emergency SOS"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-muted hover:border-sos hover:text-sos"
      >
        {/* small shield glyph — discreet */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-3z" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface-raised p-6 text-center shadow-xl">
              {result === null ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sos/15 text-sos">
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">Sending SOS alert…</h2>
                  <p className="text-sm text-ink-muted">
                    Your accepted emergency contacts will be alerted with your location. Tap cancel if
                    this was accidental.
                  </p>
                  <button
                    onClick={cancel}
                    className="w-full rounded-xl border border-line py-3 font-semibold text-ink hover:bg-line/40"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-ink">{result}</p>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full rounded-xl border border-line py-3 font-medium text-ink"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
