import type { Metadata } from "next";
import { Users } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Leads" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/leads"));
  return (
    <SectionPlaceholder
      icon={Users}
      intro="Leads from the website form, WhatsApp clicks and field visits, with a simple status pipeline."
      emptyTitle="No leads yet"
      emptyDescription="New enquiries will appear here."
    />
  );
}
