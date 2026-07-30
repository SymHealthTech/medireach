"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/lib/client/useOnlineStatus";

/**
 * Ambient connectivity banner (Stage 0 offline handling). Shown app-wide so the
 * doctor always knows *why* something isn't loading or saving — instead of a
 * silent failure or a blank screen. Sticks just under the top bar:
 *
 *  - Offline: a persistent amber bar explaining work is kept on the device.
 *  - Reconnected: a brief green confirmation that then auto-dismisses.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    // Only celebrate a reconnect if we were actually offline before.
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowBackOnline(true);
      const t = setTimeout(() => setShowBackOnline(false), 4000);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-[57px] z-20 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-sm font-medium text-amber-700 dark:text-amber-300"
      >
        <span aria-hidden>⚠️</span>
        <span>
          You&rsquo;re offline. Your work is kept on this device — it&rsquo;ll save automatically once you reconnect.
        </span>
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-[57px] z-20 flex items-center justify-center gap-2 border-b border-success/30 bg-success/15 px-4 py-2 text-center text-sm font-medium text-success"
      >
        <span aria-hidden>✅</span>
        <span>Back online.</span>
      </div>
    );
  }

  return null;
}
