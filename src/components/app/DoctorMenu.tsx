"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutButton } from "@/components/app/LogoutButton";
import { apiGet } from "@/lib/client/api";

/** Leading icon per menu destination — keeps the menu scannable (Phase 3). */
const MENU_ICONS: Record<string, string> = {
  "/app/recent": "📁",
  "/app/records/certificates": "📄",
  "/app/dues": "💸",
  "/app/revenue": "💰",
  "/app/billing": "🧾",
  "/app/keywords": "⌨️",
  "/app/staff": "👥",
  "/app/emergency-contacts": "🚑",
  "/app/design-prescription": "📝",
  "/app/visiting-card": "💳",
  "/app/profile": "👤",
  "/app/whatsapp-default": "💬",
  "/app/guide": "📖",
  "/app/medical-disclaimer": "⚕️",
  "/app/privacy-policy": "🔒",
};

/**
 * Doctor's full menu (spec §12). The header shows the doctor's app ID
 * prominently. Items link to their respective screens; some land in later build
 * phases. This is a distinct component from the receptionist menu (§5.2), not a
 * filtered version of it.
 */
/** Primary menu items, shown in order (spec §12). */
export const DOCTOR_MENU_ITEMS: { href: string; label: string }[] = [
  { href: "/app/recent", label: "Records" },
  { href: "/app/records/certificates", label: "Certificate Records" },
  { href: "/app/dues", label: "Patient Dues" },
  { href: "/app/revenue", label: "Revenue" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/keywords", label: "Edit Keyword" },
  { href: "/app/staff", label: "Staff" },
  { href: "/app/emergency-contacts", label: "Emergency Contacts" },
  { href: "/app/design-prescription", label: "Design Prescription" },
  { href: "/app/visiting-card", label: "Digital Visiting Card" },
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
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    apiGet<{ appId: string | null; clinicName?: string | null }>("/api/profile")
      .then((d) => {
        setAppId(d.appId);
        setClinicName(d.clinicName ?? null);
      })
      .catch(() => {});
  }, []);

  const linkClass =
    "flex items-center gap-3 px-4 py-3.5 text-ink transition-colors hover:bg-brand/5";

  const renderRow = (item: { href: string; label: string }) => (
    <Link key={item.href} href={item.href} className={linkClass}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-base"
        aria-hidden
      >
        {MENU_ICONS[item.href] ?? "•"}
      </span>
      <span className="flex-1 font-medium">{item.label}</span>
      <span className="text-ink-muted">›</span>
    </Link>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Menu" />

      <Card className="divide-y divide-line p-0">
        {DOCTOR_MENU_ITEMS.map(renderRow)}

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={`${linkClass} w-full text-left`}
          aria-expanded={showMore}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-line/40 text-base"
            aria-hidden
          >
            {showMore ? "⌃" : "⌄"}
          </span>
          <span className="flex-1 font-medium">{showMore ? "Show less" : "More"}</span>
        </button>

        {showMore && DOCTOR_MENU_MORE_ITEMS.map(renderRow)}
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-ink">Dr. {name}</p>
          <p className="text-sm text-ink-muted">ID: {appId ?? "—"}</p>
          {clinicName && <p className="text-sm text-ink-muted">{clinicName}</p>}
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
