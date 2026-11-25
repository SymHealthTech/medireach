import Link from "next/link";
import { ProfileEditor } from "@/components/account/ProfileEditor";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { htmlToAbout, type ProfileForm } from "@/lib/doctors/self-profile";

export const dynamic = "force-dynamic";

/** The doctor's own page text (lib/doctors/self-profile.ts); clinics and timings stay on the overview. */
export default async function ProfilePage() {
  const me = await requireDoctorPage();
  const d = me.doctor;
  const initial: ProfileForm = {
    shortBio: d.shortBio ?? "",
    about: htmlToAbout(d.fullBio),
    services: d.services.map((s) => ({ name: s.name, description: s.description ?? "" })),
    conditions: d.conditionsTreated.join("\n"),
    languages: d.languages.join(", "),
    interests: d.interests.join("\n"),
    email: d.email ?? "",
    links: {
      googleBusiness: d.links?.googleBusiness ?? "",
      instagram: d.links?.instagram ?? "",
      facebook: d.links?.facebook ?? "",
      linkedin: d.links?.linkedin ?? "",
      youtube: d.links?.youtube ?? "",
      website: d.links?.website ?? "",
    },
  };
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-body">
          What patients read about you. Changes go live as soon as you save. Clinic timings, fees and phone numbers are on the{" "}
          <Link href="/account" className="font-semibold text-ink underline">
            overview
          </Link>
          ; for your photo, qualifications or registration, use “Request a change” there.
        </p>
      </div>
      <ProfileEditor initial={initial} />
    </main>
  );
}
