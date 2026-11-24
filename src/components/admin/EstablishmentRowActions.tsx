"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, Copy, CreditCard, ExternalLink, Eye, IdCard, Link2, MoreHorizontal, Pencil, Send, Undo2, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
  duplicateEstablishmentAction,
  publishEstablishmentAction,
  suspendEstablishmentAction,
  unpublishEstablishmentAction,
} from "@/app/admin/(dash)/establishments/actions";

export interface EstablishmentRowInfo {
  id: string;
  kind: "clinic" | "hospital";
  status: string;
  liveUrl?: string;
  shareUrl?: string;
}

/**
 * Per-clinic / per-hospital actions, matching the doctor list: Edit, Preview,
 * Open live, Copy link, Visiting card, Add doctor portfolio, Payments,
 * Duplicate, Publish/Unpublish, Suspend.
 */
export function EstablishmentRowActions({ site, canPublish, showMoney }: { site: EstablishmentRowInfo; canPublish: boolean; showMoney: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const label = site.kind === "hospital" ? "Hospital" : "Clinic";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong.");
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
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
        {showMoney && (
          <DropdownMenuItem asChild>
            <Link href={`/admin/payments?establishment=${site.id}`}>
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
        {canPublish && (
          <>
            <DropdownMenuSeparator />
            {site.status === "published" ? (
              <DropdownMenuItem onSelect={() => run(() => unpublishEstablishmentAction({ id: site.id }), "Unpublished")}>
                <Undo2 /> Unpublish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => run(() => publishEstablishmentAction({ id: site.id }), "Published")}>
                <Send /> Publish
              </DropdownMenuItem>
            )}
            {site.status !== "suspended" && (
              <DropdownMenuItem className="text-clay-text" onSelect={() => run(() => suspendEstablishmentAction({ id: site.id }), "Suspended — site is offline")}>
                <Ban /> Suspend
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
