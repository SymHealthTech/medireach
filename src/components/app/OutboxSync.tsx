"use client";

import { useEffect, useRef, useState } from "react";
import { flushOutbox, outboxCount, subscribeOutbox } from "@/lib/client/outbox";

/**
 * Drives the offline outbox (Stage 1). Mounted once app-wide so queued visit
 * saves sync no matter which screen the doctor is on when the connection
 * returns. Flushes on mount and on every `online` event, and surfaces a small,
 * honest indicator: how many saves are waiting, that syncing is underway, and a
 * brief confirmation once they land.
 */
export function OutboxSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(0);
  const syncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => setPending(outboxCount());
    const unsub = subscribeOutbox(refresh);
    refresh();

    async function run() {
      if (outboxCount() === 0) return;
      setSyncing(true);
      const { synced } = await flushOutbox();
      setSyncing(false);
      if (synced > 0) {
        setJustSynced(synced);
        if (syncedTimer.current) clearTimeout(syncedTimer.current);
        syncedTimer.current = setTimeout(() => setJustSynced(0), 4000);
      }
    }

    run();
    window.addEventListener("online", run);
    return () => {
      unsub();
      window.removeEventListener("online", run);
      if (syncedTimer.current) clearTimeout(syncedTimer.current);
    };
  }, []);

  let content: React.ReactNode = null;
  if (syncing) {
    content = (
      <>
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden />
        Syncing saved records…
      </>
    );
  } else if (justSynced > 0) {
    content = <>✅ {justSynced} record{justSynced > 1 ? "s" : ""} synced to records.</>;
  } else if (pending > 0) {
    content = <>⏳ {pending} record{pending > 1 ? "s" : ""} waiting to sync.</>;
  }

  if (!content) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6"
    >
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink shadow-lg">
        {content}
      </div>
    </div>
  );
}
