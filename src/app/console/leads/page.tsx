"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/client/api";
import { LEAD_STATUSES } from "@/lib/constants";

interface LeadRow {
  id: string;
  name: string;
  clinicName: string;
  phone: string;
  source: string;
  status: string;
  createdAt: string;
}

/** Lead tracking (spec §6.5): lead → demo → converted. */
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);

  const load = useCallback(async () => {
    const d = await apiGet<{ leads: LeadRow[] }>("/api/admin/leads").catch(() => ({ leads: [] }));
    setLeads(d.leads);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    await apiPost(`/api/admin/leads/${id}`, { status }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Leads</h1>
      {leads.map((l) => (
        <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-ink">{l.name} · {l.clinicName}</p>
            <p className="text-sm text-ink-muted">{l.phone} · via {l.source}</p>
          </div>
          <select
            value={l.status}
            onChange={(e) => setStatus(l.id, e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Card>
      ))}
      {leads.length === 0 && <p className="text-ink-muted">No leads yet.</p>}
    </div>
  );
}
