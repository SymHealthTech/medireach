"use client";

import { Copy, Download, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** QR download, copy link, copy/share WhatsApp message, .vcf for one doctor. */
export function CardTools({
  qrSvg,
  fileBase,
  shareUrl,
  message,
  vcfUrl,
}: {
  qrSvg: string;
  fileBase: string;
  shareUrl: string;
  message: string;
  vcfUrl?: string;
}) {
  const copy = (text: string, ok: string) => void navigator.clipboard.writeText(text).then(() => toast.success(ok), () => toast.error("Couldn't copy."));
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`} download={`${fileBase}-qr.svg`}>
          <Download /> QR (SVG)
        </a>
      </Button>
      <Button size="sm" variant="outline" onClick={() => copy(shareUrl, "Link copied")}>
        <Copy /> Copy link
      </Button>
      <Button size="sm" variant="outline" onClick={() => copy(message, "Message copied")}>
        <MessageCircle /> Copy WhatsApp message
      </Button>
      <Button asChild size="sm" variant="ghost">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener">
          Share on WhatsApp
        </a>
      </Button>
      {vcfUrl && (
        <Button asChild size="sm" variant="ghost">
          <a href={vcfUrl} download>
            <UserPlus /> .vcf
          </a>
        </Button>
      )}
    </div>
  );
}
