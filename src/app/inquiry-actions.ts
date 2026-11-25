"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { connectToDatabase } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { INQUIRY_FIELDS, inquirySchema, preferredLabel, type InquiryFormState } from "@/lib/inquiries";
import { sendEmail } from "@/lib/integrations/email";
import { PUBLISHED_ROUTABLE } from "@/lib/public/data";
import { absUrl } from "@/lib/site";
import { DEMO_DOCTORS } from "@/fixtures/demo-doctors";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Inquiry } from "@/models/Inquiry";

/**
 * Contact / appointment form on doctor pages (portfolio design 2 and any
 * design that adds the form). Validated with zod, guarded by a honeypot and
 * rate limits, saved as an Inquiry for the doctor's account page, and emailed
 * to the doctor (an email failure never loses the request).
 *
 * Demo pages send `demo-{key}`: stored against that demo doctor when it has
 * been seeded (`npm run seed:demo`), otherwise accepted without storing.
 */

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendInquiryAction(_prev: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  const raw = Object.fromEntries(INQUIRY_FIELDS.map((k) => [k, formData.get(k) ?? undefined]));
  const values = Object.fromEntries(
    ["name", "phone", "email", "clinicId", "preferredDate", "preferredTime", "message"].map((k) => [k, typeof raw[k] === "string" ? raw[k].slice(0, 1000) : ""]),
  );
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    // A filled honeypot gets a quiet "success" so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true };
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please check the highlighted fields.", fieldErrors, values };
  }
  const input = parsed.data;

  const ip = clientIpFrom(await headers());
  const [byIp, byPhone] = await Promise.all([
    hitRateLimit(`inquiry:ip:${ip}`, 6, 60 * 60_000),
    hitRateLimit(`inquiry:phone:${input.doctorId}:${input.phone}`, 3, 24 * 60 * 60_000),
  ]);
  if (!byIp.allowed || !byPhone.allowed) {
    return { error: "Your request has already reached the clinic. They will call you back soon, or you can call the clinic directly.", values };
  }

  await connectToDatabase();
  const demo = input.doctorId.startsWith("demo-") ? DEMO_DOCTORS.find((d) => `demo-${d.key}` === input.doctorId) : undefined;
  const filter = demo
    ? { subdomain: demo.subdomain }
    : Types.ObjectId.isValid(input.doctorId)
      ? { _id: new Types.ObjectId(input.doctorId), ...PUBLISHED_ROUTABLE, renewalStatus: { $ne: "lapsed" } }
      : null;
  const doctor = filter
    ? await DoctorProfile.findOne(filter).select({ firstName: 1, lastName: 1, displayName: 1, title: 1, email: 1, ownerEmail: 1, clinics: 1 }).lean()
    : null;
  if (!doctor) {
    if (demo) return { ok: true, demo: true };
    return { error: "This page can't take requests right now. Please call the clinic instead.", values };
  }

  // Demo pages send the fixture's clinic ids ("demo-clinic-1"); real pages send the clinic's _id.
  const demoIndex = input.clinicId?.match(/^demo-clinic-(\d+)$/)?.[1];
  const clinic = demoIndex !== undefined ? doctor.clinics[Number(demoIndex)] : doctor.clinics.find((c) => String(c._id) === input.clinicId);

  const inquiry = await Inquiry.create({
    doctorId: doctor._id,
    name: input.name,
    phone: input.phone,
    ...(input.email ? { email: input.email } : {}),
    ...(clinic ? { clinicId: clinic._id, clinicName: clinic.name } : {}),
    ...(input.preferredDate ? { preferredDate: input.preferredDate } : {}),
    ...(input.preferredTime ? { preferredTime: input.preferredTime } : {}),
    ...(input.message ? { message: input.message } : {}),
    status: "new",
    via: demo ? "demo" : "page",
  });

  const to = doctor.ownerEmail || doctor.email;
  if (to) {
    const doctorName = doctor.displayName || [doctor.title || "Dr.", doctor.firstName, doctor.lastName].join(" ");
    const when = preferredLabel(input.preferredDate, input.preferredTime);
    const wa = `https://wa.me/91${input.phone}?text=${encodeURIComponent(`Hello ${input.name}, this is ${doctorName}'s clinic about your appointment request.`)}`;
    const rows: [string, string | undefined][] = [
      ["Name", input.name],
      ["Mobile", formatPhone(`91${input.phone}`)],
      ["Email", input.email],
      ["Clinic", clinic?.name],
      ["Preferred", when || undefined],
      ["Message", input.message],
    ];
    const accountUrl = absUrl("/account/inquiries");
    after(async () => {
      const res = await sendEmail({
        to,
        subject: `New appointment request from ${input.name}`,
        text: `${rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nCall: +91${input.phone}\nWhatsApp: ${wa}\nAll requests: ${accountUrl}`,
        html:
          `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:auto;color:#1c2a3a">` +
          `<div style="background:#0b2545;color:#fff;padding:20px 24px;border-radius:14px 14px 0 0"><div style="font-size:13px;opacity:.75;letter-spacing:.08em;text-transform:uppercase">Website enquiry</div><div style="font-size:20px;font-weight:700;margin-top:4px">New appointment request</div></div>` +
          `<div style="border:1px solid #dfe7f1;border-top:0;padding:20px 24px;border-radius:0 0 14px 14px">` +
          `<table style="font-size:15px;border-collapse:collapse;width:100%">` +
          rows
            .filter(([, v]) => v)
            .map(([k, v]) => `<tr><td style="padding:8px 16px 8px 0;color:#5a6b80;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;white-space:pre-wrap">${escapeHtml(v!)}</td></tr>`)
            .join("") +
          `</table>` +
          `<p style="margin:20px 0 0"><a href="tel:+91${input.phone}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Call ${escapeHtml(input.name)}</a> ` +
          `<a href="${wa}" style="display:inline-block;background:#1f9d55;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;margin-left:6px">WhatsApp</a></p>` +
          `<p style="margin:20px 0 0;font-size:14px"><a href="${accountUrl}" style="color:#1f6fd1">See all requests in your account</a></p>` +
          `</div><p style="font-size:12px;color:#5a6b80;text-align:center">Sent from your website by MediReach. Please reply to the patient directly.</p></div>`,
      });
      if (res.ok) await Inquiry.updateOne({ _id: inquiry._id }, { $set: { emailedAt: new Date() } });
    });
  }
  return { ok: true };
}
