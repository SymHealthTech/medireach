"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, Copy, ExternalLink, Eye, IdCard, Link2, MoreHorizontal, Pencil, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  duplicateDoctorAction,
  publishDoctorAction,
  suspendDoctorAction,
  unpublishDoctorAction,
} from "@/app/admin/(dash)/doctors/actions";

export interface DoctorRowInfo {
  id: string;
  status: string;
  liveUrl?: string;
  shareUrl?: string;
}

/** Per-doctor actions (Edit, Preview, Publish/Unpublish, Duplicate, Open live, Copy link, Card, Suspend). */
export function DoctorRowActions({ doctor, canPublish }: { doctor: DoctorRowInfo; canPublish: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

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
              router.push(`/admin/doctors/${res.data.id}`);
            })
          }
        >
          <Copy /> Duplicate
        </DropdownMenuItem>
        {canPublish && (
          <>
            <DropdownMenuSeparator />
            {doctor.status === "published" ? (
              <DropdownMenuItem onSelect={() => run(() => unpublishDoctorAction({ id: doctor.id }), "Unpublished")}>
                <Undo2 /> Unpublish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => run(() => publishDoctorAction({ id: doctor.id }), "Published")}>
                <Send /> Publish
              </DropdownMenuItem>
            )}
            {doctor.status !== "suspended" && (
              <DropdownMenuItem className="text-clay-text" onSelect={() => run(() => suspendDoctorAction({ id: doctor.id }), "Suspended — page is offline")}>
                <Ban /> Suspend
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
