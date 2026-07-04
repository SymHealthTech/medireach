"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/client/api";

interface GrievanceRow {
  id: string;
  contactEmail: string;
  contactName: string | null;
  kind: string;
  message: string;
  status: string;
  createdAt: string;
}

/** DPDP grievance queue (spec §6.4, §15.8). */
export default function AdminGrievancesPage() {
  const [items, setItems] = useState<GrievanceRow[]>([]);

  const load = useCallback(async () => {
    const d = await apiGet<{ grievances: GrievanceRow[] }>("/api/admin/grievances").catch(() => ({ grievances: [] }));
    setItems(d.grievances);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    await apiPost(`/api/admin/grievances/${id}`, { status }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Grievances</h1>
      {items.map((g) => (
        <Card key={g.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-ink">{g.contactName ?? g.contactEmail} · <span className="text-ink-muted">{g.kind}</span></p>
            <select
              value={g.status}
              onChange={(e) => setStatus(g.id, e.target.value)}
              className="h-9 rounded-lg border border-line bg-surface-raised px-2 text-sm text-ink"
            >
              <option value="open">open</option>
              <option value="in-progress">in-progress</option>
              <option value="resolved">resolved</option>
            </select>
          </div>
          <p className="text-sm text-ink">{g.message}</p>
          <p className="text-xs text-ink-muted">{g.contactEmail}</p>
        </Card>
      ))}
      {items.length === 0 && <p className="text-ink-muted">No grievances. Good.</p>}
    </div>
  );
}
