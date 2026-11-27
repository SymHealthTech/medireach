import Link from "next/link";
import { UserRound } from "lucide-react";
import { AssignCandidate, AssignSales, type SalesOption } from "@/components/admin/AssignSales";
import { dayLabel } from "@/lib/visits/days";
import { Admin } from "@/models/Admin";
import type { IntakeDoc } from "@/models/Intake";
import { Visit } from "@/models/Visit";

/**
 * The website form's sales executive: who it belongs to and why (the staff ID
 * typed on the form, a matching field visit, or the super admin's choice),
 * the candidates when several executives visited, and (super admin) the
 * control to assign it by name / staff ID.
 */
export interface SalesPanelData {
  current?: SalesOption & { how: string; on: string[]; visitDay?: string };
  candidates: (SalesOption & { on: string[]; day?: string })[];
  team?: SalesOption[];
  nobodyByAdmin: boolean;
}

export async function salesPanelData(doc: Pick<IntakeDoc, "salesAdminId" | "salesMatch" | "salesCandidates">, superadmin: boolean): Promise<SalesPanelData> {
  const team = superadmin ? await Admin.find({ role: "sales" }).select({ name: 1, staffId: 1 }).sort({ name: 1 }).lean() : [];
  const exec = doc.salesAdminId ? await Admin.findById(doc.salesAdminId).select({ name: 1, staffId: 1 }).lean() : null;
  const how = { form: "The applicant named them on the form", visit: "Matched to their field visit", admin: "Assigned by the super admin" }[doc.salesMatch?.by ?? "visit"];
  const visit = doc.salesMatch?.visitId ? await Visit.findById(doc.salesMatch.visitId).select({ day: 1 }).lean() : null;
  return {
    current: exec ? { id: String(exec._id), name: exec.name, staffId: exec.staffId, how, on: (doc.salesMatch?.on ?? []).filter((o) => o !== "assigned by super admin"), visitDay: visit?.day } : undefined,
    candidates: (doc.salesCandidates ?? []).map((c) => ({ id: String(c.salesAdminId), name: c.name, staffId: c.staffId, on: c.on, day: c.day })),
    team: superadmin ? team.map((t) => ({ id: String(t._id), name: t.name, staffId: t.staffId })) : undefined,
    nobodyByAdmin: !exec && doc.salesMatch?.by === "admin",
  };
}

export function SalesPanel({ intakeId, data, typedName, typedId }: { intakeId: string; data: SalesPanelData; typedName: string; typedId: string }) {
  const { current, candidates, team } = data;
  return (
    <section aria-labelledby="sales-exec" className="space-y-3 rounded-xl border border-line bg-card p-5 shadow-soft">
      <h2 id="sales-exec" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <UserRound className="size-4" strokeWidth={1.75} /> Sales executive
      </h2>
      {current ? (
        <p className="text-sm">
          <strong className="text-ink">{current.name}</strong>
          {current.staffId && <span className="ml-1.5 font-mono text-xs text-muted-foreground">{current.staffId}</span>}
          <span className="block text-muted-foreground">
            {current.how}
            {current.visitDay ? ` (visit ${dayLabel(current.visitDay).toLowerCase()})` : ""}
            {current.on.length ? `: matched on ${current.on.join(", ")}.` : "."} The website draft made from this form is theirs.
          </span>
        </p>
      ) : candidates.length > 1 ? (
        <div className="space-y-2 text-sm">
          <p className="text-clay-text">Visited by more than one sales executive. Pick who gets it:</p>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <strong className="text-ink">{c.name}</strong>
                  {c.staffId && <span className="ml-1.5 font-mono text-xs text-muted-foreground">{c.staffId}</span>}
                  <span className="text-muted-foreground">
                    {" "}
                    · visit {c.day ? dayLabel(c.day).toLowerCase() : ""} · matched on {c.on.join(", ")}
                  </span>
                </span>
                {team && <AssignCandidate intakeId={intakeId} candidate={c} />}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {data.nobodyByAdmin
            ? "Not given to any sales executive (the super admin's choice)."
            : "None yet: no logged field visit matches this doctor's name, clinic name or mobile number."}
        </p>
      )}
      {(typedName || typedId) && (
        <p className="text-xs text-muted-foreground">
          The applicant wrote: {[typedName, typedId].filter(Boolean).join(" · ")}
        </p>
      )}
      {team && (
        <div className="space-y-1.5 border-t border-line pt-3">
          <p className="text-xs text-muted-foreground">
            Assign it yourself (by name and staff ID). Your choice is final: automatic matching won&apos;t change it.{" "}
            <Link href="/admin/visits" className="underline underline-offset-2">
              Field visits
            </Link>
          </p>
          <AssignSales target={{ type: "intake", id: intakeId }} team={team} current={current?.id} />
        </div>
      )}
    </section>
  );
}
