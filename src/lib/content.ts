import "server-only";
import { connectToDatabase } from "@/lib/db";
import { Content, type ContentSlug } from "@/models/Content";

/**
 * Site content with hardcoded fallbacks (spec §6.6, §15.10). Admin-editable
 * copy is read from the DB; if a slug hasn't been customized yet, the default
 * below is served so the legally-required pages always exist.
 */
export const CONTENT_DEFAULTS: Record<ContentSlug, { title: string; body: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    body: [
      "MediReach stores patient and clinic information solely to provide clinical record-keeping and prescription services.",
      "",
      "What we collect: patient demographics and vitals you enter, consultation records you create, scanned reports you upload, and account/billing details.",
      "",
      "Retention: patient and visit data is automatically deleted after a maximum of one year, in line with the data-minimisation principle of India's DPDP Act.",
      "",
      "Your rights: you may request access, correction, or erasure of personal data, and withdraw consent at any time, by contacting our grievance channel below. Withdrawal is as easy as giving consent.",
      "",
      "Processors: we use vetted vendors (cloud database, media storage, transcription, AI structuring, payments) under appropriate data-protection terms. We remain the responsible Data Fiduciary.",
      "",
      "Grievances: email admin.medireach@gmail.com. Complaints are tracked to resolution.",
    ].join("\n"),
  },
  "medical-disclaimer": {
    title: "Medical Disclaimer",
    body: [
      "MediReach is a clinical record-keeping and prescription tool for registered medical practitioners. It does not provide medical advice, diagnosis, or treatment.",
      "",
      "AI-assisted structuring of dictation is a convenience feature. Every record must be reviewed and confirmed by the treating doctor before it is finalised or shared; the doctor is solely responsible for all clinical content.",
      "",
      "Prescriptions carry the issuing doctor's registration number per the Telemedicine Practice Guidelines. The SOS feature supplements but does not replace emergency services (dial 112).",
    ].join("\n"),
  },
  "user-guide": {
    title: "User Guide",
    body: [
      "Getting started:",
      "1. The receptionist registers a patient at the front desk and adds them to today's queue.",
      "2. The doctor opens the patient, dictates the consultation, and reviews the AI-filled fields.",
      "3. Press Confirm to finalise, then Send on WhatsApp to share the prescription.",
      "",
      "Tips: set up your shorthand under Edit Keyword; add fellow doctors under Emergency Contacts for the SOS feature.",
    ].join("\n"),
  },
};

export async function getContent(slug: ContentSlug): Promise<{ title: string; body: string }> {
  await connectToDatabase();
  const doc = await Content.findOne({ slug }).lean();
  if (doc) return { title: doc.title, body: doc.body };
  return CONTENT_DEFAULTS[slug];
}
