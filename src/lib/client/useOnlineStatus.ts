"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the browser's online/offline state (Stage 0 offline handling).
 *
 * Starts optimistic (`true`) so the offline banner never flashes during SSR /
 * first paint, then syncs to `navigator.onLine` and listens for changes.
 *
 * Note: `navigator.onLine === true` only means the device has a network
 * interface up — it does NOT guarantee our server is reachable. Actual save
 * failures are still caught at the fetch site; this hook drives the ambient
 * "you're offline" messaging so the doctor knows why a save can't complete.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
