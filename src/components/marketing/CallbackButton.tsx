"use client";

import { PhoneCall } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CALLBACK } from "@/content/marketing";
import { LeadForm } from "./LeadForm";

/**
 * "Request a call back" button (header + hero). Opens a small dialog with the
 * name + mobile lead form; the team calls back and collects the details.
 */
export function CallbackButton({ className, label = CALLBACK.cta, icon = true }: { className?: string; label?: string; icon?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {icon && <PhoneCall className="size-4" strokeWidth={2} />} {label}
        </button>
      </DialogTrigger>
      {/* The instructions live in the form (hidden after sending), so no Radix description. */}
      <DialogContent aria-describedby={undefined} className="rounded-2xl border-line bg-surface p-6 sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-2xl font-semibold text-ink">{CALLBACK.title}</DialogTitle>
        </DialogHeader>
        <LeadForm source="homepage_form" compact title={<p className="-mt-2 text-body/80">{CALLBACK.text}</p>} />
      </DialogContent>
    </Dialog>
  );
}
