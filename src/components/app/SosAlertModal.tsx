"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiGet } from "@/lib/client/api";

interface SosAlert {
  id: string | null;
  title: string;
  body: string;
  gps: { lat: number; lng: number } | null;
  clinicAddress: string;
}

// ---------------------------------------------------------------------------
// Dismissed-ID tracking (localStorage) — prevents re-showing after dismiss.
// IDs older than 10 minutes are pruned automatically.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "sos-dismissed";
const DISMISSED_TTL = 10 * 60 * 1000;

function getDismissed(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string, number][] = JSON.parse(raw);
    const now = Date.now();
    return new Map(entries.filter(([, t]) => now - t < DISMISSED_TTL));
  } catch {
    return new Map();
  }
}

function markDismissed(id: string) {
  const map = getDismissed();
  map.set(id, Date.now());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map.entries()]));
  } catch {}
}

function isDismissed(id: string | null): boolean {
  if (!id) return false;
  return getDismissed().has(id);
}

// ---------------------------------------------------------------------------
// Web Audio alarm — alternating tones, stops when the returned fn is called.
// ---------------------------------------------------------------------------
function startAlarm(): () => void {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  let stopped = false;
  let timerId: ReturnType<typeof setInterval>;

  function beep(freq: number) {
    if (stopped || ctx.state === "closed") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.38);
  }

  ctx.resume().then(() => {
    let hi = true;
    beep(1000);
    timerId = setInterval(() => {
      hi = !hi;
      beep(hi ? 1000 : 700);
    }, 450);
  });

  return () => {
    stopped = true;
    clearInterval(timerId);
    ctx.close();
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SosAlertModal() {
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [flash, setFlash] = useState(false);
  const stopAlarm = useRef<(() => void) | null>(null);
  // Track the ID of the currently shown alert to avoid re-triggering.
  const shownId = useRef<string | null>(null);

  function showAlert(next: SosAlert) {
    const key = next.id ?? `nokey-${next.title}`;
    if (isDismissed(next.id)) return;
    if (shownId.current === key) return; // already showing this one
    shownId.current = key;
    setAlert(next);
  }

  // -- API poll: check for pending SOS events (covers app-closed → opened case)
  async function checkPending() {
    try {
      const data = await apiGet<{ alerts: (SosAlert & { id: string })[] }>("/api/sos/pending");
      for (const a of data.alerts) {
        if (!isDismissed(a.id)) {
          showAlert(a);
          break; // show one at a time; others will surface after dismiss
        }
      }
    } catch {
      // non-critical; ignore network errors
    }
  }

  useEffect(() => {
    // 1. Check immediately on mount (handles: app opened from notification tap).
    checkPending();

    // 2. Check again whenever the tab becomes visible (handles: tab was backgrounded).
    function onVisibility() {
      if (document.visibilityState === "visible") checkPending();
    }
    document.addEventListener("visibilitychange", onVisibility);

    // 3. Listen for SW postMessage (handles: app already open when SOS fires).
    function onSwMessage(event: MessageEvent) {
      if (event.data?.type !== "SOS_ALERT") return;
      showAlert({
        id: event.data.id ?? null,
        title: event.data.title ?? "🚨 SOS Alert",
        body: event.data.body ?? "",
        gps: event.data.gps ?? null,
        clinicAddress: event.data.clinicAddress ?? "",
      });
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start / stop alarm and flash whenever the active alert changes.
  useEffect(() => {
    if (!alert) {
      stopAlarm.current?.();
      stopAlarm.current = null;
      return;
    }
    stopAlarm.current = startAlarm();
    const flashId = setInterval(() => setFlash((f) => !f), 600);
    return () => {
      stopAlarm.current?.();
      stopAlarm.current = null;
      clearInterval(flashId);
    };
  }, [alert]);

  function dismiss() {
    if (alert?.id) markDismissed(alert.id);
    stopAlarm.current?.();
    stopAlarm.current = null;
    shownId.current = null;
    setAlert(null);
  }

  if (!alert) return null;

  const mapsUrl = alert.gps
    ? `https://maps.google.com/?q=${alert.gps.lat},${alert.gps.lng}`
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-colors duration-300"
      style={{ backgroundColor: flash ? "rgba(185,28,28,0.92)" : "rgba(220,38,38,0.85)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl transition-colors duration-300"
        style={{ backgroundColor: flash ? "#7f1d1d" : "#991b1b" }}
      >
        <div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl transition-colors duration-300"
          style={{ backgroundColor: flash ? "#dc2626" : "#b91c1c" }}
        >
          🚨
        </div>

        <h2 className="text-xl font-bold text-white">{alert.title}</h2>

        {alert.body && <p className="mt-2 text-sm text-red-100">{alert.body}</p>}

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-xl bg-white/20 py-2 text-sm font-semibold text-white hover:bg-white/30"
          >
            Open in Maps
          </a>
        )}

        {!mapsUrl && alert.clinicAddress && (
          <p className="mt-3 text-sm font-medium text-red-100">{alert.clinicAddress}</p>
        )}

        <button
          onClick={dismiss}
          className="mt-5 w-full rounded-xl bg-white py-3 font-bold text-red-700 hover:bg-red-50"
        >
          Dismiss
        </button>
      </div>
    </div>,
    document.body,
  );
}
