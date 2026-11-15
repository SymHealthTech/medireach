import type { Metadata } from "next";
import { Palette } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Design templates" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/templates"));
  return (
    <SectionPlaceholder
      icon={Palette}
      intro="Five portfolio and five visiting-card design slots. Classic is ready; the others are reserved for Phase 2 designs."
      emptyTitle="Template slots arrive with the dashboard features"
      emptyDescription="Classic, Clinic Modern, Minimal Mono, Warm Heritage and Specialist Pro are already seeded."
    />
  );
}
