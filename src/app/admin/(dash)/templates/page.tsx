import type { Metadata } from "next";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db";
import { DoctorProfile } from "@/models/DoctorProfile";
import { TemplateSlot } from "@/models/TemplateSlot";
import { TemplateSlotCard, type SlotView } from "./TemplateSlotCard";

export const metadata: Metadata = { title: "Design templates" };

export default async function TemplatesPage() {
  await requireAdminPage(rolesFor("/admin/templates"));
  await connectToDatabase();
  const [slots, portfolioUse, cardUse] = await Promise.all([
    TemplateSlot.find().sort({ type: 1, key: 1 }).lean(),
    DoctorProfile.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$portfolioTemplateId", n: { $sum: 1 } } }]),
    DoctorProfile.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$cardTemplateId", n: { $sum: 1 } } }]),
  ]);

  const view = (type: "portfolio" | "card"): SlotView[] =>
    slots
      .filter((s) => s.type === type)
      .map((s) => ({
        type: s.type,
        key: s.key,
        name: s.name,
        status: s.status,
        isDefault: s.isDefault,
        ...(s.previewImage?.url ? { preview: { publicId: s.previewImage.publicId, url: s.previewImage.url } } : {}),
        doctorsUsing: (type === "portfolio" ? portfolioUse : cardUse).find((u) => u._id === s.key)?.n ?? 0,
        // Previews render the real template (Classic until a slot is designed) with a fictional sample doctor.
        previewHref: `/admin/templates/preview/${s.key}${type === "card" ? "?type=card" : ""}`,
      }));

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-muted-foreground">
        Five portfolio and five visiting-card design slots. Only <strong>ready</strong> designs can be chosen for doctors; the rest show as
        “Coming soon” and fall back to Classic. All designs share the same SEO.
      </p>
      {(["portfolio", "card"] as const).map((type) => (
        <section key={type} className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">{type === "portfolio" ? "Portfolio page designs" : "Visiting card designs"}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {view(type).map((s) => (
              <TemplateSlotCard key={`${s.type}-${s.key}`} slot={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
