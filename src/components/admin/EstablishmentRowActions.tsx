"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, Copy, CreditCard, ExternalLink, Eye, IdCard, Link2, MoreHorizontal, Pencil, RotateCcw, Send, Trash2, Undo2, UserCheck, UserPlus } from "lucide-react";
import { RepublishDialog, SuspendDialog } from "@/components/admin/SiteStatusDialogs";
import { useUnpaidPublish } from "@/components/admin/UnpaidPublishConfirm";
import { AssignSalesDialog, type SalesOption } from "@/components/admin/AssignSales";
import { toast } from "sonner";
import { welcomeToast } from "@/components/admin/welcome-toast";
import { startNavigationProgress } from "@/components/loading/NavigationProgress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteEstablishmentAction,
  duplicateEstablishmentAction,
  publishEstablishmentAction,
  submitEstablishmentForReviewAction,
  suspendEstablishmentAction,
  unpublishEstablishmentAction,
} from "@/app/admin/(dash)/establishments/actions";
import type { AdminRole } from "@/lib/constants";

export interface EstablishmentRowInfo {
  id: string;
  kind: "clinic" | "hospital";
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
 * Per-clinic / per-hospital actions, matching the doctor list. Everyone: Edit,
 * Preview, Open live, Copy link, Visiting card, Add doctor portfolio,
 * Duplicate. Super admin: Payments, Publish/Unpublish (asks first when no
 * payment is recorded), Suspend (modal: suspend for now / delete for good /
 * cancel); a suspended site gets Republish and Delete permanently. Sales
 * executive: Send for review, and Delete for drafts that were never published.
 */
export function EstablishmentRowActions({ site, role, team = [] }: { site: EstablishmentRowInfo; role: AdminRole; team?: SalesOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"suspend" | "delete" | "republish" | "assign" | null>(null);
  const { publish, dialog: unpaidDialog } = useUnpaidPublish();
  const label = site.kind === "hospital" ? "Hospital" : "Clinic";
  const superadmin = role === "superadmin";
  const suspended = site.status === "suspended";
  const salesCanDelete = !superadmin && !site.everPublished && site.status !== "published";
  const paymentsHref = `/admin/payments?establishment=${site.id}`;
  const publishIt = (allowUnpaid?: boolean) => publishEstablishmentAction({ id: site.id, allowUnpaid }).then((r) => (r.ok && welcomeToast(r.data), r));

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
          <Button variant="ghost" size="icon-sm" aria-label={`${label} actions`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/establishments/${site.id}?kind=${site.kind}`}>
              <Pencil /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/admin/preview/site/${site.id}`} target="_blank" rel="noopener">
              <Eye /> Preview
            </a>
          </DropdownMenuItem>
          {site.liveUrl && (
            <DropdownMenuItem asChild>
              <a href={site.liveUrl} target="_blank" rel="noopener">
                <ExternalLink /> Open live page
              </a>
            </DropdownMenuItem>
          )}
          {site.shareUrl && (
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(site.shareUrl!).then(() => toast.success("Link copied"));
              }}
            >
              <Link2 /> Copy share link
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/admin/cards?type=${site.kind}&establishment=${site.id}`}>
              <IdCard /> Visiting card
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/doctors/new?establishment=${site.id}`}>
              <UserPlus /> Add doctor portfolio
            </Link>
          </DropdownMenuItem>
          {superadmin && (
            <DropdownMenuItem asChild>
              <Link href={paymentsHref}>
                <CreditCard /> Payments
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() =>
              start(async () => {
                const res = await duplicateEstablishmentAction({ id: site.id });
                if (!res.ok) return void toast.error(res.error);
                toast.success("Duplicated as a new draft");
                startNavigationProgress();
                router.push(`/admin/establishments/${res.data.id}?kind=${res.data.kind}`);
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
                  {site.status === "published" ? (
                    <DropdownMenuItem onSelect={() => run(() => unpublishEstablishmentAction({ id: site.id }), "Unpublished")}>
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
            (site.status === "draft" || salesCanDelete) && (
              <>
                <DropdownMenuSeparator />
                {site.status === "draft" && (
                  <DropdownMenuItem onSelect={() => run(() => submitEstablishmentForReviewAction({ id: site.id }), "Sent to the super admin for review")}>
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
          what="site"
          name={site.name}
          onSuspend={() => suspendEstablishmentAction({ id: site.id })}
          onDelete={() => deleteEstablishmentAction({ id: site.id })}
          onDone={() => router.refresh()}
        />
      )}
      {superadmin && (
        <RepublishDialog
          open={dialog === "republish"}
          onOpenChange={(o) => !o && setDialog(null)}
          what="site"
          name={site.name}
          onConfirm={() => publish(publishIt, { paymentsHref })}
          onDone={() => router.refresh()}
        />
      )}
      {superadmin && (
        <AssignSalesDialog
          open={dialog === "assign"}
          onOpenChange={(o) => !o && setDialog(null)}
          target={{ type: "site", id: site.id }}
          team={team}
          current={site.salesAdminId}
          name={site.name}
        />
      )}
      {unpaidDialog}
    </>
  );
}
