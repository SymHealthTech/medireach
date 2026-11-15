import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { SectionPlaceholder } from "@/components/admin/SectionPlaceholder";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Payments" };

export default async function Page() {
  await requireAdminPage(rolesFor("/admin/payments"));
  return (
    <SectionPlaceholder
      icon={CreditCard}
      intro="Record payments by UPI, cash, bank or card, see monthly totals and export CSV."
      emptyTitle="No payments recorded"
      emptyDescription="Payments you record will appear here with monthly totals."
    />
  );
}
