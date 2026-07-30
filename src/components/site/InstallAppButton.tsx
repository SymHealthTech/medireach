"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * "Install app" button for the public site header (spec §3.2 — installable PWA).
 *
 * One button, device-aware behaviour:
 *   • Desktop browsers  → triggers the native install prompt, which adds a
 *     MediReach desktop shortcut / app window.
 *   • Android / Chrome  → native "Add to Home screen" install prompt.
 *   • iOS Safari        → no `beforeinstallprompt` support, so we show the manual
 *     Share → "Add to Home Screen" instructions.
 *   • Already installed → a short confirmation message instead of re-prompting.
 *
 * The site's service worker is only registered inside the app after login, so we
 * register it here too; without a registered SW the browser won't fire
 * `beforeinstallprompt` and there'd be nothing to install.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS exposes `navigator.standalone`; everyone else uses the display-mode query.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !/android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
}

export function InstallAppButton({
  className,
  onAction,
}: {
  className?: string;
  /** Called after a click (e.g. to close the mobile menu panel). */
  onAction?: () => void;
}) {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // Register the service worker so the browser treats the public site as
    // installable. Best-effort — install still degrades to manual instructions.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBeforePrompt = (e: Event) => {
      e.preventDefault(); // stash it; we prompt on the user's click instead
      promptRef.current = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      promptRef.current = null;
      setInstalled(true);
      setMsg("MediReach is installed — open it from your home screen or apps.");
    };

    window.addEventListener("beforeinstallprompt", onBeforePrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Auto-dismiss the feedback message.
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  async function handleClick() {
    onAction?.();

    if (installed || isStandalone()) {
      setInstalled(true);
      setMsg("MediReach is already installed on this device.");
      return;
    }

    const deferred = promptRef.current;
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      promptRef.current = null;
      if (outcome === "accepted") {
        setMsg(isDesktop() ? "Adding MediReach to your desktop…" : "Installing MediReach…");
      } else {
        setMsg("Install cancelled. You can add MediReach anytime from here.");
      }
      return;
    }

    // No native prompt available — give manual instructions per platform.
    if (isIOS()) {
      setMsg("On iPhone/iPad: tap the Share button, then “Add to Home Screen”.");
    } else if (isDesktop()) {
      setMsg("Open your browser menu (⋮) and choose “Install MediReach” to add a desktop shortcut.");
    } else {
      setMsg("Open your browser menu and choose “Install app” / “Add to Home screen”.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-brand bg-transparent px-4 py-2 font-semibold text-brand transition-colors hover:bg-brand/5",
          className,
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        Install app
      </button>

      {msg && (
        <p
          role="status"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-line bg-surface p-3 text-sm text-ink shadow-lg"
        >
          {msg}
        </p>
      )}
    </div>
  );
}
