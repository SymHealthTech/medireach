"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { WhatsAppIcon, WhatsAppLink } from "./WhatsAppLink";

/**
 * Floating WhatsApp button, mobile only, hidden while the hero's own CTA is
 * on screen (DESIGN_BRIEF.md §3).
 */
export function FloatingWhatsApp({ href, watchId }: { href: string; watchId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return setShow(true);
    const io = new IntersectionObserver(([e]) => setShow(!e!.isIntersecting));
    io.observe(target);
    return () => io.disconnect();
  }, [watchId]);

  return (
    <WhatsAppLink
      href={href}
      placement="floating"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "fixed bottom-5 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#1f8f4e] text-white shadow-soft transition-[opacity,transform] duration-200 md:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <WhatsAppIcon className="size-7" />
    </WhatsAppLink>
  );
}
