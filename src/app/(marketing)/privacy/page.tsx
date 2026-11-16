import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/marketing/PageIntro";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Privacy policy – MediReach" },
  description: "What MediReach collects, why, who processes it, how long we keep it, and how to ask for access, correction or deletion (DPDP Act 2023).",
  alternates: { canonical: absUrl("/privacy") },
};

const UPDATED = "16 November 2026";

export default function PrivacyPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@medireach.co.in";
  const mail = (
    <a className="font-semibold text-ink underline" href={`mailto:${email}`}>
      {email}
    </a>
  );
  return (
    <main>
      <PageIntro eyebrow="Privacy" title="Privacy policy">
        <p>
          Last updated {UPDATED}. Written to follow India&apos;s Digital Personal Data Protection Act, 2023. MediReach is run by Sym HealthTech,
          Pune, which is the data fiduciary for the personal data described here.
        </p>
      </PageIntro>
      <Prose>
        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>From doctors who order a page:</strong> the details you give us for your page (name, photo, qualifications, registration,
              clinics, timings, contact numbers and links), plus private details we need to serve you (billing, payments and, if you use login,
              your login email).
            </li>
            <li>
              <strong>From people who contact us:</strong> the name, phone number and message you send through our forms.
            </li>
            <li>
              <strong>When you tap a WhatsApp button:</strong> only which button was tapped and when. No name, number or device identifier.
            </li>
            <li>
              <strong>Security logs:</strong> IP addresses, used briefly to stop abuse such as repeated login attempts.
            </li>
          </ul>
          <p>We don&apos;t collect any patient data, and we don&apos;t use advertising or tracking cookies.</p>
        </section>

        <section>
          <h2>Why we use it</h2>
          <ul>
            <li>To build, publish and host your page and visiting card, which are public by design.</li>
            <li>To call you back when you ask us to, and to send invoices and service messages.</li>
            <li>To keep the service secure and to meet legal and tax obligations.</li>
          </ul>
          <p>We use your data only with your consent or where the law allows, and never sell it.</p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We set a cookie only when you log in, to keep you signed in. Public pages work without any cookies. Preferences in the dashboard
            (such as dark mode) are stored in a cookie on your own device.
          </p>
        </section>

        <section>
          <h2>Who processes data for us</h2>
          <ul>
            <li>MongoDB Atlas — database hosting.</li>
            <li>Vercel — website hosting.</li>
            <li>Cloudinary — storing and resizing photos for doctor pages.</li>
            <li>Resend — sending emails such as login links and lead notifications.</li>
          </ul>
          <p>These providers process data only on our instructions. Some may store data outside India, with protections required by law.</p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Doctor page details: while your page is live, and up to 30 days after you ask us to remove it.</li>
            <li>Enquiries from our forms: up to 2 years, or less if you ask us to delete them.</li>
            <li>Invoices and payment records: as long as tax law requires.</li>
            <li>Security logs: up to 90 days.</li>
          </ul>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>You can ask us to:</p>
          <ul>
            <li>show you the personal data we hold about you;</li>
            <li>correct or update it;</li>
            <li>delete it, and remove your page;</li>
            <li>withdraw consent you gave earlier;</li>
            <li>name someone to exercise these rights for you if you can&apos;t.</li>
          </ul>
          <p>Write to {mail}. We reply within 7 days and complete requests within 30 days.</p>
        </section>

        <section>
          <h2>Grievances</h2>
          <p>
            If you have a complaint about how we handle your data, write to our grievance contact at {mail} (Sym HealthTech, Pune, Maharashtra).
            If you are not satisfied with our response, you can approach the Data Protection Board of India.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>If we change this policy, we update this page and the date above.</p>
        </section>
      </Prose>
    </main>
  );
}
