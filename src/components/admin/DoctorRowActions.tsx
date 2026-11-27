"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "@/components/loading/NavigationProgress";
import { useState, useTransition } from "react";
import { Ban, Copy, ExternalLink, Eye, IdCard, Link2, MoreHorizontal, Pencil, RotateCcw, Send, Trash2, Undo2, UserCheck } from "lucide-react";
import { RepublishDialog, SuspendDialog } from "@/components/admin/SiteStatusDialogs";
import { useUnpaidPublish } from "@/components/admin/UnpaidPublishConfirm";
import { AssignSalesDialog, type SalesOption } from "@/components/admin/AssignSales";
import { toast } from "sonner";
import { welcomeToast } from "@/components/admin/welcome-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteDoctorAction,
  duplicateDoctorAction,
  publishDoctorAction,
  submitForReviewAction,
  suspendDoctorAction,
  unpublishDoctorAction,
} from "@/app/admin/(dash)/doctors/actions";
import type { AdminRole } from "@/lib/constants";

export interface DoctorRowInfo {
  id: string;
  status: string;
  name?: string;
  liveUrl?: string;
  shareUrl?: string;
  /** Was ever live (sales executives can't delete it then). */
  everPublished?: boolean;
  /** Its sales executive (dashboard user id). */
  salesAdminId?: string;
}

/**
 * Per-doctor actions. Everyone: Edit, Preview, Open live, Copy link, Card,
 * Duplicate. Super admin: Publish/Unpublish (publish asks first when no payment
 * is recorded), Suspend (modal: suspend for now / delete for good / cancel); a
 * suspended page gets Republish and Delete permanently. Sales executive: Send
 * for review, and Delete for their drafts that were never published.
 */
export function DoctorRowActions({ doctor, role, team = [] }: { doctor: DoctorRowInfo; role: AdminRole; team?: SalesOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"suspend" | "delete" | "republish" | "assign" | null>(null);
  const { publish, dialog: unpaidDialog } = useUnpaidPublish();
  const superadmin = role === "superadmin";
  const suspended = doctor.status === "suspended";
  const salesCanDelete = !superadmin && !doctor.everPublished && doctor.status !== "published";
  const paymentsHref = `/admin/payments?doctor=${doctor.id}`;
  const publishIt = (allowUnpaid?: boolean) => publishDoctorAction({ id: doctor.id, allowUnpaid }).then((r) => (r.ok && welcomeToast(r.data), r));

  function run(fn: () => Promise<{ ok: boolean; error?: string } | null>, success: string) {
    start(async () => {
      const res = await fn();
      if (!res) return; // cancelled
      if (!res.ok) toast.error(res.error ?? "Something went wrong.");
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Doctor actions" disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/doctors/${doctor.id}`}>
              <Pencil /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/admin/preview/${doctor.id}`} target="_blank" rel="noopener">
              <Eye /> Preview
            </a>
          </DropdownMenuItem>
          {doctor.liveUrl && (
            <DropdownMenuItem asChild>
              <a href={doctor.liveUrl} target="_blank" rel="noopener">
                <ExternalLink /> Open live page
              </a>
            </DropdownMenuItem>
          )}
          {doctor.shareUrl && (
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(doctor.shareUrl!).then(() => toast.success("Link copied"));
              }}
            >
              <Link2 /> Copy share link
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/admin/cards?doctor=${doctor.id}`}>
              <IdCard /> Visiting card
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              start(async () => {
                const res = await duplicateDoctorAction({ id: doctor.id });
                if (!res.ok) return void toast.error(res.error);
                toast.success("Duplicated as a new draft");
                startNavigationProgress();
                router.push(`/admin/doctors/${res.data.id}`);
              })
            }
          >
            <Copy /> Duplicate
          </DropdownMenuItem>
          {superadmin && (
            <DropdownMenuItem onSelect={() => setDialog("assign")}>
              <UserCheck /> Assign sales executive
            </DropdownMenuItem>
          )}
          {superadmin ? (
            <>
              <DropdownMenuSeparator />
              {suspended ? (
                <>
                  <DropdownMenuItem onSelect={() => setDialog("republish")}>
                    <RotateCcw /> Republish
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-clay-text" onSelect={() => setDialog("delete")}>
                    <Trash2 /> Delete permanently
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {doctor.status === "published" ? (
                    <DropdownMenuItem onSelect={() => run(() => unpublishDoctorAction({ id: doctor.id }), "Unpublished")}>
                      <Undo2 /> Unpublish
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => run(() => publish(publishIt, { paymentsHref }), "Published")}>
                      <Send /> Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-clay-text" onSelect={() => setDialog("suspend")}>
                    <Ban /> Suspend
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            (doctor.status === "draft" || salesCanDelete) && (
              <>
                <DropdownMenuSeparator />
                {doctor.status === "draft" && (
                  <DropdownMenuItem onSelect={() => run(() => submitForReviewAction({ id: doctor.id }), "Sent to the super admin for review")}>
                    <Send /> Send for review
                  </DropdownMenuItem>
                )}
                {salesCanDelete && (
                  <DropdownMenuItem className="text-clay-text" onSelect={() => setDialog("delete")}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                )}
              </>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {(superadmin || salesCanDelete) && (
        <SuspendDialog
          open={dialog === "suspend" || dialog === "delete"}
          onOpenChange={(o) => !o && setDialog(null)}
          step={dialog === "delete" ? "delete" : "choose"}
          what="page"
          name={doctor.name}
          onSuspend={() => suspendDoctorAction({ id: doctor.id })}
          onDelete={() => deleteDoctorAction({ id: doctor.id })}
          onDone={() => router.refresh()}
        />
      )}
      {superadmin && (
        <RepublishDialog
          open={dialog === "republish"}
          onOpenChange={(o) => !o && setDialog(null)}
          what="page"
          name={doctor.name}
          onConfirm={() => publish(publishIt, { paymentsHref })}
          onDone={() => router.refresh()}
        />
      )}
      {superadmin && (
        <AssignSalesDialog
          open={dialog === "assign"}
          onOpenChange={(o) => !o && setDialog(null)}
          target={{ type: "doctor", id: doctor.id }}
          team={team}
          current={doctor.salesAdminId}
          name={doctor.name}
        />
      )}
      {unpaidDialog}
    </>
  );
}
