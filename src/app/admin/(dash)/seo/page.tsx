import type { Metadata } from "next";
import { Search } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "SEO" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/seo"));
  return (
    <SectionPlaceholder
      icon={Search}
      intro="Sitemap coverage, pages missing recommended fields, and a button to refresh every public page."
      emptyTitle="SEO tools arrive with the dashboard features"
      emptyDescription="Submit /sitemap_index.xml in Google Search Console."
    />
  );
}
