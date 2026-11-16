import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/marketing/PageIntro";
import { getPublicSiteData, gstNote, rupees } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Terms of service – MediReach" },
  description: "The terms for MediReach doctor pages and visiting cards: hosting, Founding Doctor hosting, domains, updates, content and GST.",
  alternates: { canonical: absUrl("/terms") },
};

const UPDATED = "16 November 2026";

export default async function TermsPage() {
  const site = await getPublicSiteData();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@medireach.co.in";
  return (
    <main>
      <PageIntro eyebrow="Terms" title="Terms of service">
        <p>Last updated {UPDATED}. Plain-language terms for doctors and hospitals using MediReach.</p>
      </PageIntro>
      <Prose>
        <section>
          <h2>1. Who we are</h2>
          <p>
            MediReach is a service of Sym HealthTech, Pune, Maharashtra. We build and host one-page websites and digital visiting cards for
            doctors. “You” means the doctor or hospital who orders a page.
          </p>
        </section>

        <section>
          <h2>2. What you get</h2>
          <ul>
            <li>A one-page website on medireach.co.in, with your own short link and website address.</li>
            <li>A digital visiting card with a QR code, in print and phone versions.</li>
            <li>Listing on the city, area and specialty pages that match your practice, in alphabetical order.</li>
          </ul>
          <p>We send you a preview, and your page goes live only after you approve it.</p>
        </section>

        <section>
          <h2>3. Price and hosting term</h2>
          <p>
            The setup price is paid once (currently {rupees(site.prices.gp)} for GP and {rupees(site.prices.consultant)} for Consultant pages).
            It covers building your page and card, and hosting for the period stated on your invoice. If hosting is not free for life (see
            Founding Doctors), we remind you before it ends and renewal is at the rate shown on our pricing page at that time. If you choose not
            to renew, we take your page offline.
          </p>
        </section>

        <section>
          <h2>4. Founding Doctors: free hosting forever</h2>
          <p>
            The first {site.foundingTotal} doctors who join as Founding Doctors pay no hosting fee for their page and card on medireach.co.in for
            as long as MediReach runs the service. This covers hosting only. It does not cover own domains, paid updates or new designs, it
            belongs to the individual doctor, and it cannot be transferred. It ends if a page is removed for breaking these terms.
          </p>
        </section>

        <section>
          <h2>5. Own domain</h2>
          <p>
            If you want your own domain (for example drname.in), we buy and connect it for you and charge only what the domain costs, including
            yearly renewals. The domain is registered for you.
          </p>
        </section>

        <section>
          <h2>6. Updates</h2>
          <p>
            You can change your clinic timings, phone numbers, address and fees yourself after logging in. For other changes, our team updates
            your page for {rupees(site.prices.update)} per request. Your first done-for-you update is free.
          </p>
        </section>

        <section>
          <h2>7. Your content and the NMC guidelines</h2>
          <ul>
            <li>You own the text and photos you give us. You let us show them on your page, card and our listing pages while your page is live.</li>
            <li>
              You confirm that your details, qualifications and registration are true and current, and that you have the right to use any photo
              you send.
            </li>
            <li>
              Pages follow the National Medical Commission&apos;s Guidelines on Ethical Advertising. We don&apos;t publish reviews, ratings,
              testimonials, patient photos, before/after images, superlative claims or success rates, and we may edit or decline content that
              doesn&apos;t fit the guidelines. You remain responsible for what your page says about your practice.
            </li>
          </ul>
        </section>

        <section>
          <h2>8. GST and payment</h2>
          <p>
            {gstNote(site.gstMode)}. We issue an invoice for every payment. Payment is by UPI, bank transfer, card or cash, recorded by our team.
          </p>
        </section>

        <section>
          <h2>9. Removing your page</h2>
          <p>
            You can ask us to take your page offline at any time by writing to {email}. We remove it from our site within 7 days and ask search
            engines to drop it. We may suspend a page that breaks these terms or the law.
          </p>
        </section>

        <section>
          <h2>10. Liability</h2>
          <p>
            We work to keep pages online and accurate, but we can&apos;t promise uninterrupted service or any position in search results. Our
            total liability for any claim is limited to the amount you paid us in the 12 months before the claim.
          </p>
        </section>

        <section>
          <h2>11. Law and changes</h2>
          <p>
            These terms are governed by Indian law, and the courts of Pune have jurisdiction. If we change these terms, we update this page and
            tell existing customers about important changes.
          </p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>
            Questions about these terms: <a className="font-semibold text-ink underline" href={`mailto:${email}`}>{email}</a>.
          </p>
        </section>
      </Prose>
    </main>
  );
}
