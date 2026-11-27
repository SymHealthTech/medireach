import { getCurrentAdmin } from "@/lib/auth/admin";
import type { SearchParams } from "@/lib/admin/list";
import { PAYMENT_MODE_LABEL, PAYMENT_PURPOSE_LABEL } from "@/lib/admin/labels";
import { paymentFilter } from "@/lib/admin/payments";
import { audit } from "@/lib/api/audit";
import { toDateInput } from "@/lib/format";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";

/** CSV export of payments (same filters as the list). Admins only. */

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "superadmin") {
    return new Response("Forbidden", { status: 403 });
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams) as SearchParams;
  const { filter } = paymentFilter(sp);
  const payments = await Payment.find(filter).sort({ date: -1 }).limit(20000).lean();
  const [doctors, establishments] = await Promise.all([
    DoctorProfile.find({ _id: { $in: payments.map((p) => p.doctorId).filter(Boolean) } }).select({ title: 1, firstName: 1, lastName: 1 }).lean(),
    Establishment.find({ _id: { $in: payments.map((p) => p.establishmentId ?? p.hospitalId).filter(Boolean) } }).select({ name: 1 }).lean(),
  ]);
  const dn = new Map(doctors.map((d) => [String(d._id), `${d.title || "Dr."} ${d.firstName} ${d.lastName}`]));
  const en = new Map(establishments.map((e) => [String(e._id), e.name]));

  const header = ["Date", "Invoice no.", "Doctor", "Clinic / hospital", "Purpose", "Mode", "Amount (INR)", "GST included", "Notes"];
  const lines = payments.map((p) =>
    [
      toDateInput(p.date),
      p.invoiceNo,
      p.doctorId ? dn.get(String(p.doctorId)) : "",
      p.establishmentId ?? p.hospitalId ? en.get(String(p.establishmentId ?? p.hospitalId)) : "",
      PAYMENT_PURPOSE_LABEL[p.purpose],
      PAYMENT_MODE_LABEL[p.mode],
      p.amount,
      p.gstIncluded ? "Yes" : "No",
      p.notes,
    ]
      .map(csvCell)
      .join(","),
  );
  await audit({ userId: admin.id, role: admin.role, name: admin.name }, "payment.export", { diff: { rows: payments.length } });

  return new Response(`﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="medireach-payments-${toDateInput(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
