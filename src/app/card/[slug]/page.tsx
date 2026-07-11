import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/db";
import { loadPublicCard } from "@/lib/visiting-card";
import { PublicCard } from "@/components/card/PublicCard";
import { doctorDisplayName } from "@/lib/doctorName";

/**
 * PUBLIC visiting-card page — `/card/[slug]`. No login required (patients open
 * it). Rendered per-request (force-dynamic) so the signed Cloudinary delivery
 * URLs are always fresh, and so a profile/card edit reflects immediately.
 *
 * It reads ONLY through loadPublicCard(), which selects nothing but the card's
 * own fields plus a whitelist of profile fields — no clinical, patient, billing,
 * verification or auth data can ever surface here.
 *
 * The page forces a clean LIGHT theme (fixed colours, own light background)
 * regardless of the visitor's system dark-mode preference — patients expect a
 * bright, trustworthy medical page.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const card = await loadPublicCard(slug);
  if (!card) return { title: "Card not available — MediReach" };
  const name = doctorDisplayName(card.name);
  return {
    title: `${name}${card.degree ? ` — ${card.degree}` : ""}`,
    description: card.tagline || `${name}${card.clinicName ? ` · ${card.clinicName}` : ""}`,
    robots: { index: true, follow: true },
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen w-full px-4 py-8 sm:py-12"
      style={{
        backgroundColor: "#EEF3F4",
        backgroundImage:
          "radial-gradient(900px 420px at 100% -10%, rgba(14,124,123,0.10), transparent 60%), radial-gradient(700px 420px at -5% 108%, rgba(242,153,74,0.08), transparent 58%)",
      }}
    >
      {children}
    </main>
  );
}

export default async function PublicCardPage({ params }: Params) {
  const { slug } = await params;
  await connectToDatabase();
  const card = await loadPublicCard(slug);

  if (!card) {
    return (
      <Shell>
        <div className="mx-auto mt-10 w-full max-w-[520px] rounded-2xl bg-white p-10 text-center shadow-[0_8px_30px_rgba(2,32,32,0.12)] ring-1 ring-black/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0E7C7B]/10 text-2xl">
            🩺
          </div>
          <h1 className="mt-5 text-xl font-bold text-slate-900">This card is no longer available</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
            The visiting card you&apos;re looking for has been removed or is no longer published.
          </p>
          <p className="mt-8 text-xs font-medium text-slate-400">
            Powered by <span className="text-[#0E7C7B]">MediReach</span>
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PublicCard data={card} />
    </Shell>
  );
}
