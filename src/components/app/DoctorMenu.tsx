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
export const DOCTOR_MENU_ITEMS: { href: string; label: string }[] = [
  { href: "/app/profile", label: "Profile" },
  { href: "/app/recent", label: "Records" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/design-prescription", label: "Design Prescription" },
  { href: "/app/emergency-contacts", label: "Emergency Contacts" },
  { href: "/app/staff", label: "Staff" },
  { href: "/app/keywords", label: "Edit Keyword" },
  { href: "/app/whatsapp-default", label: "WhatsApp delivery default" },
  { href: "/app/guide", label: "User Guide" },
  { href: "/medical-disclaimer", label: "Medical Disclaimer" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export function DoctorMenu({ name }: { name: string }) {
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ appId: string | null }>("/api/profile")
      .then((d) => setAppId(d.appId))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Dr. {name}</p>
          <p className="text-sm text-ink-muted">ID: {appId ?? "—"}</p>
        </div>
        <ThemeToggle />
      </Card>

      <Card className="divide-y divide-line p-0">
        {DOCTOR_MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between px-4 py-3.5 text-ink hover:bg-line/30"
          >
            <span className="font-medium">{item.label}</span>
            <span className="text-ink-muted">›</span>
          </Link>
        ))}
      </Card>

      <LogoutButton />

      <p className="text-center text-sm text-ink-muted">
        Need help? <a href="mailto:support@medireach.app" className="text-brand">support@medireach.app</a>
      </p>
    </div>
  );
}
