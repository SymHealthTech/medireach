"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "@/components/loading/NavigationProgress";
import { useState, useTransition } from "react";
import { Ban, Copy, ExternalLink, Eye, IdCard, Link2, MoreHorizontal, Pencil, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";
import { RepublishDialog, SuspendDialog } from "@/components/admin/SiteStatusDialogs";
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
  suspendDoctorAction,
  unpublishDoctorAction,
} from "@/app/admin/(dash)/doctors/actions";

export interface DoctorRowInfo {
  id: string;
  status: string;
  name?: string;
  liveUrl?: string;
  shareUrl?: string;
}

/**
 * Per-doctor actions (Edit, Preview, Publish/Unpublish, Duplicate, Open live, Copy link, Card, Suspend).
 * Suspend opens a modal (suspend for now / delete for good / cancel); a suspended page gets Republish and Delete permanently.
 */
export function DoctorRowActions({ doctor, canPublish }: { doctor: DoctorRowInfo; canPublish: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"suspend" | "delete" | "republish" | null>(null);
  const suspended = doctor.status === "suspended";

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
          {canPublish && (
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
                    <DropdownMenuItem onSelect={() => run(() => publishDoctorAction({ id: doctor.id }).then((r) => (r.ok && welcomeToast(r.data), r)), "Published")}>
                      <Send /> Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-clay-text" onSelect={() => setDialog("suspend")}>
                    <Ban /> Suspend
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canPublish && (
        <>
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
          <RepublishDialog
            open={dialog === "republish"}
            onOpenChange={(o) => !o && setDialog(null)}
            what="page"
            name={doctor.name}
            onConfirm={() => publishDoctorAction({ id: doctor.id })}
            onDone={() => router.refresh()}
          />
        </>
      )}
    </>
  );
}
