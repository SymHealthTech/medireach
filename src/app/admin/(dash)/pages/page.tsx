import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Portfolio pages" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/pages"));
  return (
    <SectionPlaceholder
      icon={Globe}
      intro="All portfolio pages with their status, canonical URL, short link, design and SEO health."
      emptyTitle="No pages yet"
      emptyDescription="Pages appear here once a doctor profile is created."
      action={{ label: "New doctor", href: "/admin/doctors/new" }}
    />
  );
}
