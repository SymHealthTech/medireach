"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/client/api";
import { cn } from "@/lib/cn";

interface DoctorRow {
  id: string;
  name: string;
  appId: string | null;
  email: string;
  mobile: string;
  accountStatus: string;
  tier: "starter" | "pro";
  pendingTier: "starter" | "pro" | null;
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
  { key: "tier:starter", label: "Starter" },
  { key: "tier:pro", label: "Pro" },
  { key: "documents", label: "Doc review" },
];

function TierBadge({ tier, pending }: { tier: "starter" | "pro"; pending: "starter" | "pro" | null }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tier === "pro" ? "bg-brand/10 text-brand" : "bg-line/60 text-ink-muted",
      )}>
        {tier === "pro" ? "Pro" : "Starter"}
      </span>
      {pending && pending !== tier && (
        <span className="text-[10px] text-action" title={`Scheduled to switch to ${pending}`}>→ {pending}</span>
      )}
    </span>
  );
}

/** Doctor/clinic management + document review queue (spec §6.1). */
export default function AdminDoctorsPage() {
  const [filter, setFilter] = useState("");
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs =
      filter === "documents" ? "documents=submitted"
      : filter.startsWith("tier:") ? `tier=${filter.slice(5)}`
      : filter ? `status=${filter}`
      : "";
    const data = await apiGet<{ doctors: DoctorRow[] }>(`/api/admin/doctors?${qs}`).catch(() => ({ doctors: [] }));
    setDoctors(data.doctors);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Doctors</h1>

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
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <Card key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-60" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </Card>
          ))
        ) : (
          <>
            {doctors.map((d) => (
              <Link key={d.id} href={`/console/doctors/${d.id}`}>
                <Card className="flex items-center justify-between hover:border-brand">
                  <div>
                    <p className="flex items-center gap-2 font-medium text-ink">
                      {d.name} {d.appId && <span className="text-ink-muted">· {d.appId}</span>}
                      <TierBadge tier={d.tier} pending={d.pendingTier} />
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
          </>
        )}
      </div>
    </div>
  );
}
