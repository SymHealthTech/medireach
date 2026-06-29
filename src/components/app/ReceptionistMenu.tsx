"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutButton } from "@/components/app/LogoutButton";
import { ReceptionistProfileCard } from "@/components/app/ReceptionistProfileCard";

/**
 * Receptionist's menu (spec §5.2) — deliberately a short, separate list: Mode,
 * User Guide, Privacy Policy, Medical Disclaimer, Logout. Nothing else — no
 * Records, Billing, Design Prescription, Edit Keyword, or Emergency Contacts.
 * This is a genuinely different component from the doctor menu, not the doctor
 * menu with items hidden.
 */
export const RECEPTIONIST_MENU_ITEMS = [
  { href: "/app/guide", label: "User Guide" },
  { href: "/app/privacy-policy", label: "Privacy Policy" },
  { href: "/app/medical-disclaimer", label: "Medical Disclaimer" },
];

export function ReceptionistMenu({ name }: { name: string }) {
  return (
    <div className="space-y-5">
      <Card className="flex items-center justify-between">
        <p className="font-semibold text-ink">Mode</p>
        <ThemeToggle />
      </Card>

      <Card className="divide-y divide-line p-0">
        {RECEPTIONIST_MENU_ITEMS.map((item) => (
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

      <ReceptionistProfileCard name={name} />

      <LogoutButton />
    </div>
  );
}
