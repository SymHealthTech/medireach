"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/client/api";

interface AuditRow {
  id: string;
  actorRole: string;
  action: string;
  targetType: string | null;
  createdAt: string;
}

/** Audit log viewer (spec §6.4, §15.4). */
export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditRow[]>([]);
  useEffect(() => {
    apiGet<{ entries: AuditRow[] }>("/api/admin/audit").then((d) => setEntries(d.entries)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Audit log</h1>
      <Card className="divide-y divide-line p-0">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <span className="font-medium text-ink">{e.action}</span>
              {e.targetType && <span className="text-ink-muted"> · {e.targetType}</span>}
            </div>
            <div className="text-right text-xs text-ink-muted">
              <span className="block">{e.actorRole}</span>
              <span>{new Date(e.createdAt).toLocaleString("en-IN")}</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="p-4 text-ink-muted">No audit entries yet.</p>}
      </Card>
    </div>
  );
}
