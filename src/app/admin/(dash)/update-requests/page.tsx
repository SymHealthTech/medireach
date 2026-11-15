import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Update requests" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/update-requests"));
  return (
    <SectionPlaceholder
      icon={Wrench}
      intro="Done-for-you page updates (₹299; the first one per doctor is free)."
      emptyTitle="No update requests"
      emptyDescription="Requests from doctors and the team will show up here."
    />
  );
}
