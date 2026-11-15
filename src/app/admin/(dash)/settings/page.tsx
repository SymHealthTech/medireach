import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/settings"));
  return (
    <SectionPlaceholder
      icon={Settings}
      intro="Prices, Founding Doctor count, contact numbers, GST mode, WhatsApp share text, banned-phrase list and admin users."
      emptyTitle="Settings arrive with the dashboard features"
      emptyDescription="Defaults were created by the seed: ₹1,999 plans, 100 founding spots, GST inclusive."
    />
  );
}
