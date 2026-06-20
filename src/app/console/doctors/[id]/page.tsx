"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/client/api";

interface DoctorDetail {
  doctor: {
    id: string; name: string; appId: string | null; email: string; mobile: string;
    registrationNumber: string; degree: string; clinicName: string; clinicAddress: string;
    accountStatus: string;
    verificationDocument: { type: string; reviewStatus: string; url: string | null } | null;
  };
  totalPatients: number;
  sponsor: { storeName: string; contactNumber: string; paymentResponsibility: string } | null;
  invoices: { id: string; cycleNumber: number; amount: number; patientCount: number; status: string; payer: string }[];
}

/** Full doctor account view + admin actions (spec §6.1, §6.2). */
export default function AdminDoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DoctorDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await apiGet<DoctorDetail>(`/api/admin/doctors/${id}`).catch(() => null);
    setData(d);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(body: Record<string, unknown>, label: string) {
    setMsg(null);
    try {
      await apiPost(`/api/admin/doctors/${id}/actions`, body);
      setMsg(`${label} done.`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function markPaid(invoiceId: string) {
    try {
      await apiPost(`/api/admin/invoices/${invoiceId}/mark-paid`, { note: "Offline payment" });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!data) return <p className="text-ink-muted">Loading…</p>;
  const d = data.doctor;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.name}</h1>
        <p className="text-sm text-ink-muted">{d.appId} · {d.accountStatus} · {data.totalPatients} patients all-time</p>
      </div>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}

      <Card className="space-y-1 text-sm">
        <p><span className="text-ink-muted">Email:</span> {d.email}</p>
        <p><span className="text-ink-muted">Mobile:</span> {d.mobile}</p>
        <p><span className="text-ink-muted">Reg:</span> {d.registrationNumber} · {d.degree}</p>
        <p><span className="text-ink-muted">Clinic:</span> {d.clinicName}, {d.clinicAddress}</p>
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold text-ink">Verification document</p>
        {d.verificationDocument ? (
          <>
            <p className="text-sm text-ink-muted">
              {d.verificationDocument.type} · status: {d.verificationDocument.reviewStatus}
            </p>
            {d.verificationDocument.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.verificationDocument.url} alt="Verification document" className="max-h-80 rounded-xl border border-line" />
            )}
            <div className="flex gap-2">
              <Button variant="brand" size="md" onClick={() => action({ action: "review-document", status: "reviewed" }, "Marked reviewed")}>
                Mark reviewed
              </Button>
              <Button variant="danger" size="md" onClick={() => action({ action: "review-document", status: "flagged" }, "Flagged")}>
                Flag
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">No document submitted.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold text-ink">Account actions</p>
        <div className="flex flex-wrap gap-2">
          {d.accountStatus === "suspended" ? (
            <Button variant="brand" size="md" onClick={() => action({ action: "reactivate" }, "Reactivated")}>
              Reactivate
            </Button>
          ) : (
            <Button variant="danger" size="md" onClick={() => action({ action: "suspend" }, "Suspended")}>
              Suspend
            </Button>
          )}
          <Button variant="outline" size="md" onClick={() => action({ action: "reset-password" }, "Reset code sent")}>
            Trigger password reset
          </Button>
        </div>
      </Card>

      {data.sponsor && (
        <Card className="text-sm">
          <p className="font-semibold text-ink">Sponsor</p>
          <p className="text-ink-muted">{data.sponsor.storeName} · {data.sponsor.contactNumber} · {data.sponsor.paymentResponsibility}</p>
        </Card>
      )}

      <div className="space-y-2">
        <p className="font-semibold text-ink">Invoices</p>
        {data.invoices.map((inv) => (
          <Card key={inv.id} className="flex items-center justify-between">
            <span className="text-sm text-ink">
              Cycle #{inv.cycleNumber} · ₹{inv.amount} · {inv.patientCount} patients · {inv.status} · {inv.payer}
            </span>
            {(inv.status === "pending" || inv.status === "overdue") && (
              <Button variant="outline" size="md" onClick={() => markPaid(inv.id)}>
                Mark paid
              </Button>
            )}
          </Card>
        ))}
        {data.invoices.length === 0 && <p className="text-sm text-ink-muted">No invoices.</p>}
      </div>
    </div>
  );
}
