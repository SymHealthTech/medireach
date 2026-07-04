"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { QueueList, type QueueEntry } from "@/components/app/QueueList";
import { PatientSearch } from "@/components/app/PatientSearch";
import { apiGet } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";

/**
 * Today's Patients — the default landing screen for both roles (spec §7.1).
 * Polls the server every 7s (spec §3.2) so a patient the receptionist just
 * registered appears for the doctor without a manual refresh.
 */
export default function QueuePage() {
  const { me, loading: meLoading } = useMe();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ entries: QueueEntry[] }>("/api/queue");
      setEntries(data.entries);
    } catch {
      /* keep last good state on transient errors */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 7000); // queue sync, §3.2
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const seen = entries.filter((e) => e.status === "confirmed").length;

  if (!loaded || meLoading) return <QueueSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex items-center justify-between lg:w-1/2 lg:shrink-0">
          <div className="border-l-4 border-brand pl-3">
            <h1 className="text-xl font-semibold tracking-tight text-ink">Today&apos;s patients</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {entries.length} total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {seen} seen
              </span>
            </div>
          </div>
          <Link href="/app/register" className="shrink-0 lg:hidden">
            <Button variant="primary" size="sm">
              + Add patient
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2 lg:w-1/2 lg:justify-end">
          {me && (
            <div className="flex-1">
              <PatientSearch role={me.role} onAdded={load} />
            </div>
          )}
          <Link href="/app/register" className="hidden shrink-0 lg:block">
            <Button variant="primary" size="sm">
              + Add patient
            </Button>
          </Link>
        </div>
      </div>

      {me && <QueueList entries={entries} role={me.role} onChanged={load} />}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex items-center justify-between lg:w-1/2 lg:shrink-0">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl lg:hidden" />
        </div>
        <div className="flex items-center gap-2 lg:w-1/2 lg:justify-end">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="hidden h-9 w-28 rounded-xl lg:block" />
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-line bg-surface-raised p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-xl" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
