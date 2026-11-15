import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Doctors" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/doctors"));
  return (
    <SectionPlaceholder
      icon={UserRound}
      intro="Every doctor profile, from first draft to published page. Search, filter by city, area, specialty, status, plan and source."
      emptyTitle="No doctors yet"
      emptyDescription="Add your first doctor to start building their page and visiting card."
      action={{ label: "New doctor", href: "/admin/doctors/new" }}
    />
  );
}
