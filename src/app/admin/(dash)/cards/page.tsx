import type { Metadata } from "next";
import { IdCard } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Visiting cards" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/cards"));
  return (
    <SectionPlaceholder
      icon={IdCard}
      intro="Print and phone-share visiting cards with QR codes, PNG/PDF downloads, .vcf files and WhatsApp share text."
      emptyTitle="No cards yet"
      emptyDescription="A card is created automatically for every doctor."
    />
  );
}
