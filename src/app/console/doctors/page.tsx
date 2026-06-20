"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/client/api";
import { cn } from "@/lib/cn";

interface DoctorRow {
  id: string;
  name: string;
  appId: string | null;
  email: string;
  mobile: string;
  accountStatus: string;
  onboardingComplete: boolean;
  documentStatus: string | null;
  documentType: string | null;
}

const FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "suspended", label: "Suspended" },
  { key: "incomplete-onboarding", label: "Incomplete" },
  { key: "documents", label: "Doc review" },
];

/** Doctor/clinic management + document review queue (spec §6.1). */
export default function AdminDoctorsPage() {
  const [filter, setFilter] = useState("");
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  const load = useCallback(async () => {
    const qs = filter === "documents" ? "documents=submitted" : filter ? `status=${filter}` : "";
    const data = await apiGet<{ doctors: DoctorRow[] }>(`/api/admin/doctors?${qs}`).catch(() => ({ doctors: [] }));
    setDoctors(data.doctors);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Doctors</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              filter === f.key ? "bg-brand text-brand-fg" : "border border-line text-ink-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {doctors.map((d) => (
          <Link key={d.id} href={`/console/doctors/${d.id}`}>
            <Card className="flex items-center justify-between hover:border-brand">
              <div>
                <p className="font-medium text-ink">
                  {d.name} {d.appId && <span className="text-ink-muted">· {d.appId}</span>}
                </p>
                <p className="text-sm text-ink-muted">{d.email} · {d.mobile}</p>
              </div>
              <div className="text-right text-xs">
                <span className="block font-medium text-ink">{d.accountStatus}</span>
                {d.documentStatus && (
                  <span className={cn(d.documentStatus === "submitted" ? "text-action" : "text-ink-muted")}>
                    doc: {d.documentStatus}
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
        {doctors.length === 0 && <p className="text-ink-muted">No doctors match this filter.</p>}
      </div>
    </div>
  );
}
