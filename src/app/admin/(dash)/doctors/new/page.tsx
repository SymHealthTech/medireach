import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "New doctor" };

export default async function NewDoctorPage() {
  await requireAdminPage(rolesFor("/admin/doctors"));
  return (
    <SectionPlaceholder
      icon={UserPlus}
      intro="A 10-step form with autosave: basics, registration, practice, clinics and timings, contact, about, SEO, business, design, and review and publish."
      emptyTitle="The doctor form arrives with the dashboard features"
      emptyDescription="Sales can create drafts; only admins can publish."
    />
  );
}
