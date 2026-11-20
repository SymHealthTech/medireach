"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GET_STARTED, GET_STARTED_DIALOG as T } from "@/content/marketing";
import { GetStartedOptions } from "./GetStartedOptions";

/** Header "Get started": opens the options dialog (doctor / clinic / hospital form, or WhatsApp). */
export function GetStartedButton({ waHref, className }: { waHref: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {GET_STARTED}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-line bg-paper p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="font-display text-2xl font-semibold text-ink">{T.title}</DialogTitle>
          <DialogDescription className="text-body/80">{T.text}</DialogDescription>
        </DialogHeader>
        <GetStartedOptions waHref={waHref} onPick={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
