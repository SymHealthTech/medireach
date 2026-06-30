"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiPost } from "@/lib/client/api";

const COUNTDOWN_SECONDS = 5;

type Phase = "idle" | "confirm" | "counting" | "done";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [result, setResult] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  // Countdown only runs in the "counting" phase.
  useEffect(() => {
    if (phase !== "counting") return;
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
  }, [phase]);

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
    setPhase("done");
  }

  function cancel() {
    cancelled.current = true;
    if (timer.current) clearInterval(timer.current);
    setPhase("idle");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("confirm")}
        aria-label="Emergency SOS"
        title="Emergency SOS"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-muted hover:border-sos hover:text-sos"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-3z" strokeLinejoin="round" />
        </svg>
      </button>

      {phase !== "idle" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface-raised p-6 text-center shadow-xl">

              {/* Step 1 — confirmation */}
              {phase === "confirm" && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sos/15 text-sos">
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-3z" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-ink">Send SOS Alert?</h2>
                  <p className="text-sm text-ink-muted">
                    This will alert your emergency contacts with your current location. Only proceed if you genuinely need help.
                  </p>
                  <button
                    onClick={() => setPhase("counting")}
                    className="w-full rounded-xl bg-sos py-3 font-bold text-white hover:opacity-90"
                  >
                    Yes, send alert
                  </button>
                  <button
                    onClick={() => setPhase("idle")}
                    className="w-full rounded-xl border border-line py-3 font-semibold text-ink hover:bg-line/40"
                  >
                    Cancel
                  </button>
                </>
              )}

              {/* Step 2 — countdown */}
              {phase === "counting" && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sos/15 text-sos">
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">Sending SOS alert…</h2>
                  <p className="text-sm text-ink-muted">
                    Your emergency contacts will be alerted with your location.
                  </p>
                  <button
                    onClick={cancel}
                    className="w-full rounded-xl border border-line py-3 font-semibold text-ink hover:bg-line/40"
                  >
                    Cancel
                  </button>
                </>
              )}

              {/* Step 3 — result */}
              {phase === "done" && (
                <>
                  <p className="font-semibold text-ink">{result}</p>
                  <button
                    onClick={() => setPhase("idle")}
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
