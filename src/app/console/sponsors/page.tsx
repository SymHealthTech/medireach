"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/client/api";

interface SponsorRow {
  id: string;
  storeName: string;
  contactNumber: string;
  paymentResponsibility: string;
  doctorName: string;
  doctorAppId: string | null;
}

/** Sponsor (medical store) management (spec §6.3). */
export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  useEffect(() => {
    apiGet<{ sponsors: SponsorRow[] }>("/api/admin/sponsors").then((d) => setSponsors(d.sponsors)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Sponsors</h1>
      {sponsors.map((s) => (
        <Card key={s.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink">{s.storeName}</p>
            <p className="text-sm text-ink-muted">{s.contactNumber} · sponsors Dr. {s.doctorName} ({s.doctorAppId})</p>
          </div>
          <span className={s.paymentResponsibility === "active" ? "text-success text-sm" : "text-ink-muted text-sm"}>
            {s.paymentResponsibility}
          </span>
        </Card>
      ))}
      {sponsors.length === 0 && <p className="text-ink-muted">No sponsors yet.</p>}
    </div>
  );
}
