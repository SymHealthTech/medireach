"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  const { me } = useMe();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ entries: QueueEntry[] }>("/api/queue");
      setEntries(data.entries);
    } catch {
      /* keep last good state on transient errors */
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Today&apos;s patients</h1>
          <p className="text-sm text-ink-muted">
            {entries.length} total · {seen} seen
          </p>
        </div>
        <Link href="/app/register">
          <Button variant="primary" size="lg">
            + Add patient
          </Button>
        </Link>
      </div>

      <Card>
        {me && <PatientSearch role={me.role} onAdded={load} />}
      </Card>

      {me && <QueueList entries={entries} role={me.role} onChanged={load} />}
    </div>
  );
}
