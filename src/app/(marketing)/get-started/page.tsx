import type { Metadata } from "next";
import { GetStartedOptions } from "@/components/intake/GetStartedOptions";
import { GET_STARTED_DIALOG as T } from "@/content/marketing";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";

export const metadata: Metadata = {
  title: "Get started",
  description: "Send us your details for a doctor, clinic or hospital website in your own time, or ask us on WhatsApp.",
  alternates: { canonical: "/get-started" },
};

/** The "Get started" choices as a page (the header opens the same list in a dialog). */
export default async function GetStartedPage() {
  const site = await getPublicSiteData();
  return (
    <main className="mr-hero-bg -mt-16 px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.015em] text-ink sm:text-4xl">{T.title}</h1>
        <p className="mt-2 text-body/85">{T.text}</p>
        <GetStartedOptions waHref={whatsappHref(site.whatsappNumber, T.whatsappText)} className="mt-6" />
      </div>
    </main>
  );
}
