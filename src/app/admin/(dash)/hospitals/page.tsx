import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Hospitals" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/hospitals"));
  return (
    <SectionPlaceholder
      icon={Building2}
      intro="Hospital accounts, their visiting consultants and bulk pricing."
      emptyTitle="No hospitals yet"
      emptyDescription="Add a hospital to create pages for its visiting consultants."
    />
  );
}
