import type { Metadata } from "next";
import { ListTree } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Master lists" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/masters"));
  return (
    <SectionPlaceholder
      icon={ListTree}
      intro="Cities, areas, specialties, degrees and councils, with slug checks against reserved words."
      emptyTitle="Master lists are seeded"
      emptyDescription="Run npm run seed:masters to load Pune, 50 areas, specialties, degrees and councils."
    />
  );
}
