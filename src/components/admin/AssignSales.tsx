"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/admin/form/fields";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assignIntakeSalesAction } from "@/app/admin/(dash)/intakes/actions";
import { assignSiteSalesAction } from "@/app/admin/(dash)/assign-actions";

/** A sales executive to pick: shown as "Asha Patil · MRS-1001". */
export interface SalesOption {
  id: string;
  name: string;
  staffId?: string;
}
type Target = { type: "intake"; id: string } | { type: "doctor" | "site"; id: string };
type Result = { ok: true; data: { name: string | null } } | { ok: false; error: string };

const optionLabel = (o: SalesOption) => `${o.name}${o.staffId ? ` · ${o.staffId}` : ""}`;

function assign(target: Target, salesAdminId: string | null): Promise<Result> {
  return target.type === "intake" ? assignIntakeSalesAction({ id: target.id, salesAdminId }) : assignSiteSalesAction({ kind: target.type, id: target.id, salesAdminId });
}

/** Super admin: pick the sales executive (by name and staff ID) for a website form or a website. */
export function AssignSales({ target, team, current, onDone }: { target: Target; team: SalesOption[]; current?: string; onDone?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, start] = useTransition();
  const run = (id: string | null) =>
    start(async () => {
      const res = await assign(target, id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.data.name ? `Assigned to ${res.data.name}` : "No sales executive now");
      onDone?.();
      router.refresh();
    });
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(value || null);
      }}
    >
      <NativeSelect aria-label="Sales executive" className="h-9 w-auto min-w-56" value={value} onChange={(e) => setValue(e.target.value)} disabled={pending}>
        <option value="">Nobody</option>
        {team.map((t) => (
          <option key={t.id} value={t.id}>
            {optionLabel(t)}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" variant="outline" disabled={pending || value === (current ?? "")}>
        {pending ? <Loader2 className="animate-spin" /> : <UserCheck />} Assign
      </Button>
    </form>
  );
}

/** One-tap choice between the executives whose visits matched (form visited by several). */
export function AssignCandidate({ intakeId, candidate }: { intakeId: string; candidate: SalesOption }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await assignIntakeSalesAction({ id: intakeId, salesAdminId: candidate.id });
          if (!res.ok) return void toast.error(res.error);
          toast.success(`Assigned to ${candidate.name}`);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <UserCheck />} Give to {candidate.name}
    </Button>
  );
}

/** The same picker in a dialog, opened from a doctor's or site's ⋯ menu. */
export function AssignSalesDialog({
  open,
  onOpenChange,
  target,
  team,
  current,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { type: "doctor" | "site"; id: string };
  team: SalesOption[];
  current?: string;
  name?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sales executive{name ? ` for ${name}` : ""}</DialogTitle>
          <DialogDescription>They will see this website and can work on it (up to review). Pick by name and staff ID.</DialogDescription>
        </DialogHeader>
        <AssignSales target={target} team={team} current={current} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
