"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "@/components/loading/NavigationProgress";
import { ExternalLink, Loader2, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton, useActionRunner } from "@/components/admin/FormDialog";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { INTAKE_STATUS_LABEL } from "@/lib/admin/labels";
import { INTAKE_STATUSES, type IntakeKind, type IntakeStatus } from "@/lib/constants";
import { createSiteFromIntakeAction, deleteIntakeAction, saveIntakeNotesAction, setIntakeStatusAction } from "../actions";

/** Status, review notes, "Create website draft" and delete for one form. */
export function IntakeReviewControls({
  id,
  status,
  notes: initialNotes,
  draftHref,
  canDelete,
  kind,
}: {
  id: string;
  status: IntakeStatus;
  notes: string;
  draftHref?: string;
  canDelete: boolean;
  kind: IntakeKind;
}) {
  const router = useRouter();
  const { run, pending } = useActionRunner();
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [creating, startCreate] = useTransition();

  return (
    <div className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-[220px_1fr_auto] lg:items-start">
      <Field label="Status" htmlFor="intake-status">
        <NativeSelect
          id="intake-status"
          value={status}
          disabled={pending}
          onChange={(e) => run(() => setIntakeStatusAction({ id, status: e.target.value as IntakeStatus }), "Status updated")}
        >
          {INTAKE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INTAKE_STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Review notes (internal)" htmlFor="intake-notes" help="Saved when you leave the box. Copied into the draft's internal notes.">
        <Textarea
          id="intake-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes === savedNotes) return;
            setSavedNotes(notes);
            run(() => saveIntakeNotesAction({ id, notes }), "Notes saved");
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2 lg:pt-6">
        {draftHref ? (
          <Button asChild>
            <Link href={draftHref}>
              <ExternalLink /> Open website draft
            </Link>
          </Button>
        ) : (
          <Button
            disabled={creating}
            onClick={() =>
              startCreate(async () => {
                const r = await createSiteFromIntakeAction({ id });
                if (!r.ok) return void toast.error(r.error);
                toast.success("Draft created. Remaining items are listed in its internal notes.");
                startNavigationProgress();
                router.push(r.data.href);
              })
            }
          >
            {creating ? <Loader2 className="animate-spin" /> : <Wand2 />} Create {kind} website draft
          </Button>
        )}
        {canDelete && (
          <ConfirmButton
            trigger={
              <Button variant="ghost" className="text-clay-text">
                <Trash2 /> Delete
              </Button>
            }
            title="Delete this form?"
            description="The form and its answers are removed. Use this for spam or duplicates only. A website draft made from it is kept."
            confirmLabel="Delete form"
            onConfirm={() => deleteIntakeAction({ id })}
            successMessage="Form deleted"
            redirectTo="/admin/intakes"
          />
        )}
      </div>
    </div>
  );
}
