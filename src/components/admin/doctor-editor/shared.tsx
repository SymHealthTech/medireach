"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminRole } from "@/lib/constants";
import type { DoctorForm } from "@/lib/doctors/form";
import type { EditorOptions } from "@/lib/doctors/options";
import type { DoctorFormHints } from "@/lib/intake/hints";

export interface StepProps {
  form: DoctorForm;
  set: (patch: Partial<DoctorForm> | ((f: DoctorForm) => Partial<DoctorForm>)) => void;
  /** Error for a field path: server validation error, else a compliance issue. */
  err: (path: string) => string | undefined;
  options: EditorOptions;
  readOnly: boolean;
  role: AdminRole;
  doctorId?: string;
  /** Answers from the website form ("Get started") this draft was made from. */
  hints?: DoctorFormHints;
}

/** A titled group inside a step. */
export function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-line bg-card p-4 shadow-soft sm:p-6">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** One item in a repeatable list (qualification, clinic, award…). */
export function RepeatItem({
  title,
  onRemove,
  disabled,
  children,
}: {
  title: string;
  onRemove: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-line bg-background p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled} className="text-clay-text">
          <Trash2 /> Remove
        </Button>
      </div>
      {children}
    </div>
  );
}

export function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={disabled}>
      <Plus /> {children}
    </Button>
  );
}

export const grid2 = "grid gap-4 sm:grid-cols-2";

/** Immutable list helpers. */
export const updateAt = <T,>(list: T[], i: number, patch: Partial<T>): T[] => list.map((x, j) => (j === i ? { ...x, ...patch } : x));
export const removeAt = <T,>(list: T[], i: number): T[] => list.filter((_, j) => j !== i);
