import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Prose } from "@/components/marketing/PageIntro";
import { getPublicSiteData, rupees } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Terms of service – MediReach" },
  description: "The terms for MediReach doctor, clinic and hospital websites and visiting cards: setup, yearly renewal, domains, updates and content.",
  alternates: { canonical: absUrl("/terms") },
};

const UPDATED = "19 November 2026";

export default async function TermsPage() {
  const site = await getPublicSiteData();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@medireach.co.in";
  return (
    <main>
      <PageIntro eyebrow="Terms" title="Terms of service">
        <p>Last updated {UPDATED}. Plain-language terms for doctors, clinics and hospitals using MediReach.</p>
      </PageIntro>
      <Prose>
        <section>
          <h2>1. Who we are</h2>
          <p>
            MediReach is a service of Sym HealthTech, Pune, Maharashtra. We build and host websites and digital visiting cards for doctors,
            clinics and small hospitals (up to 10 beds). “You” means the doctor, clinic or hospital who orders a site.
          </p>
        </section>

        <section>
          <h2>2. What you get</h2>
          <ul>
            <li>
              A website on medireach.co.in with its own address (for example yourclinic.medireach.co.in): a one-page portfolio for a doctor, or a
              clinic or hospital website in a design made for your specialty.
            </li>
            <li>A digital visiting card with a QR code, in print and phone versions, with every plan.</li>
            <li>Listing on the city, area, specialty and category pages that match your practice, in alphabetical order.</li>
          </ul>
          <p>
            Specialty designs are shared: other clinics of your specialty may use the same design style, with their own name, logo, colours,
            photos and details. We send you a preview, and your site goes live only after you approve it.
          </p>
        </section>

        <section>
          <h2>3. Setup and yearly renewal</h2>
          <p>
            You pay a setup price once, and a yearly renewal from the second year. Current prices are on our{" "}
            <Link href="/pricing">pricing page</Link>:
          </p>
          <ul>
            <li>
              Doctor portfolio: {rupees(site.prices.doctorSetup)} setup, then {rupees(site.prices.renewalDoctor)} a year.
            </li>
            <li>
              Clinic website: {rupees(site.prices.clinicSetup)} setup, then {rupees(site.prices.renewalClinic)} a year.
            </li>
            <li>
              Small hospital website (up to 10 beds): {rupees(site.prices.hospitalSetup)} setup, then {rupees(site.prices.renewalHospital)} a
              year.
            </li>
          </ul>
          <p>
            The renewal is due one year after your setup payment, and every year after that. It covers hosting on medireach.co.in, security
            and the changes you make yourself after logging in. It does not cover own domains or done-for-you updates. We remind you before the
            renewal is due.
          </p>
        </section>

        <section>
          <h2>4. If a renewal is not paid</h2>
          <p>
            Your site stays live for {site.renewalGraceDays} days after the renewal date. After that it is not deleted: it shows a short
            “temporarily unavailable” notice with our contact details and is hidden from search engines. Paying the renewal restores it at once.
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
            your page for {rupees(site.prices.updatePrice)} per request. Your first done-for-you update is free.
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
          <h2>8. Removing your page</h2>
          <p>
            You can ask us to take your site offline at any time by writing to {email}. We remove it within 7 days and ask search engines to
            drop it. We may suspend a site that breaks these terms or the law.
          </p>
        </section>

        <section>
          <h2>9. Liability</h2>
          <p>
            We work to keep pages online and accurate, but we can&apos;t promise uninterrupted service or any position in search results. Our
            total liability for any claim is limited to the amount you paid us in the 12 months before the claim.
          </p>
        </section>

        <section>
          <h2>10. Law and changes</h2>
          <p>
            These terms are governed by Indian law, and the courts of Pune have jurisdiction. If we change these terms, we update this page and
            tell existing customers about important changes.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            Questions about these terms: <a className="font-semibold text-ink underline" href={`mailto:${email}`}>{email}</a>.
          </p>
        </section>
      </Prose>
    </main>
  );
}
