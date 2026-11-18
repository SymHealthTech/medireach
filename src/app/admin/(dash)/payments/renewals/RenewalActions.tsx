"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** "Copy reminder" + "Open WhatsApp" for one site on the Renewals list. Messages are sent by hand. */
export function ReminderButtons({ text, whatsappHref }: { text: string; whatsappHref?: string }) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(
            () => toast.success("Reminder copied"),
            () => toast.error("Couldn't copy. Select the text and copy it by hand."),
          );
        }}
      >
        <Copy /> Copy reminder
      </Button>
      {whatsappHref && (
        <Button asChild size="sm" variant="outline">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle /> WhatsApp
          </a>
        </Button>
      )}
    </>
  );
}
