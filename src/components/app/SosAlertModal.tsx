"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SosAlert {
  title: string;
  body: string;
  gps: { lat: number; lng: number } | null;
  clinicAddress: string;
}

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
    beep(hi ? 1000 : 700);
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

export function SosAlertModal() {
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [flash, setFlash] = useState(false);
  const stopAlarm = useRef<(() => void) | null>(null);

  // Listen for SOS messages from the service worker.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "SOS_ALERT") return;
      setAlert({
        title: event.data.title ?? "🚨 SOS Alert",
        body: event.data.body ?? "",
        gps: event.data.gps ?? null,
        clinicAddress: event.data.clinicAddress ?? "",
      });
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  // Start / stop alarm and flash when alert changes.
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
    stopAlarm.current?.();
    stopAlarm.current = null;
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
        {/* Flashing icon */}
        <div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl transition-colors duration-300"
          style={{ backgroundColor: flash ? "#dc2626" : "#b91c1c" }}
        >
          🚨
        </div>

        <h2 className="text-xl font-bold text-white">{alert.title}</h2>

        {alert.body ? (
          <p className="mt-2 text-sm text-red-100">{alert.body}</p>
        ) : null}

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
