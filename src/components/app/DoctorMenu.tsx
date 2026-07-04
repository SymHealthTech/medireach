"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutButton } from "@/components/app/LogoutButton";
import { apiGet } from "@/lib/client/api";

/**
 * Doctor's full menu (spec §12). The header shows the doctor's app ID
 * prominently. Items link to their respective screens; some land in later build
 * phases. This is a distinct component from the receptionist menu (§5.2), not a
 * filtered version of it.
 */
/** Primary menu items, shown in order (spec §12). */
export const DOCTOR_MENU_ITEMS: { href: string; label: string }[] = [
  { href: "/app/recent", label: "Records" },
  { href: "/app/revenue", label: "Revenue" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/keywords", label: "Edit Keyword" },
  { href: "/app/staff", label: "Staff" },
  { href: "/app/emergency-contacts", label: "Emergency Contacts" },
  { href: "/app/design-prescription", label: "Design Prescription" },
  { href: "/app/profile", label: "Profile" },
];

/** Secondary items, hidden behind "Show more" by default. */
export const DOCTOR_MENU_MORE_ITEMS: { href: string; label: string }[] = [
  { href: "/app/whatsapp-default", label: "WhatsApp delivery default" },
  { href: "/app/guide", label: "User Guide" },
  { href: "/app/medical-disclaimer", label: "Medical Disclaimer" },
  { href: "/app/privacy-policy", label: "Privacy Policy" },
];

export function DoctorMenu({ name }: { name: string }) {
  const [appId, setAppId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    apiGet<{ appId: string | null }>("/api/profile")
      .then((d) => setAppId(d.appId))
      .catch(() => {});
  }, []);

  const linkClass =
    "flex items-center justify-between px-4 py-3.5 text-ink hover:bg-line/30";

  return (
    <div className="space-y-5">
      <Card className="divide-y divide-line p-0">
        {DOCTOR_MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            <span className="font-medium">{item.label}</span>
            <span className="text-ink-muted">›</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={`${linkClass} w-full text-left`}
          aria-expanded={showMore}
        >
          <span className="font-medium">{showMore ? "Show less" : "More"}</span>
          <span className="text-ink-muted">{showMore ? "⌃" : "⌄"}</span>
        </button>

        {showMore &&
          DOCTOR_MENU_MORE_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              <span className="font-medium">{item.label}</span>
              <span className="text-ink-muted">›</span>
            </Link>
          ))}
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-ink">Dr. {name}</p>
          <p className="text-sm text-ink-muted">ID: {appId ?? "—"}</p>
        </div>
        <ThemeToggle />
      </Card>

      <LogoutButton />

      <p className="text-center text-sm text-ink-muted">
        Need help? <a href="mailto:admin.medireach@gmail.com" className="text-brand">admin.medireach@gmail.com</a>
      </p>
    </div>
  );
}
