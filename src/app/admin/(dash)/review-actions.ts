"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx } from "@/lib/admin/action";
import { ownsRecord } from "@/lib/admin/scope";
import type { CurrentAdmin } from "@/lib/auth/admin";
import { audit } from "@/lib/api/audit";
import { formatDate, toDateInput } from "@/lib/format";
import { sendEmail } from "@/lib/integrations/email";
import { createPreviewToken, PREVIEW_LINK_DAYS, previewUrl } from "@/lib/preview-link";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { ensureUid } from "@/lib/uid";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";

/**
 * The Review step's helpers, shared by the doctor, clinic and hospital
 * editors: the preview link sent for approval, this site's payments, and the
 * setup/renewal dates after a payment is recorded.
 */

const target = z.object({ kind: z.enum(["doctor", "site"]), id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.") });
const ADMINS = ["superadmin"] as const;

const digits = (s?: string) => (s ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The doctor or site, its contact and UID (sales executives: only their own). */
async function who(kind: "doctor" | "site", id: string, admin: CurrentAdmin) {
  if (kind === "doctor") {
    const d = await DoctorProfile.findById(id).select({ uid: 1, title: 1, firstName: 1, lastName: 1, displayName: 1, mobile: 1, whatsapp: 1, email: 1, ownerEmail: 1, salesAdminId: 1 }).lean();
    if (!d || !ownsRecord(admin, d)) throw new ActionError("This doctor no longer exists.");
    return {
      uid: await ensureUid(DoctorProfile as never, d, "doctor"),
      name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      what: "website",
      phone: digits(d.whatsapp) || digits(d.mobile),
      email: d.ownerEmail || d.email || "",
    };
  }
  const e = await Establishment.findById(id).select({ uid: 1, name: 1, kind: 1, contact: 1, contactPerson: 1, ownerEmail: 1, salesAdminId: 1 }).lean();
  if (!e || !ownsRecord(admin, e)) throw new ActionError("This clinic or hospital no longer exists.");
  return {
    uid: await ensureUid(Establishment as never, e, e.kind === "hospital" ? "hospital" : "clinic"),
    name: e.name,
    what: e.kind === "hospital" ? "hospital website" : "clinic website",
    phone: digits(e.contact?.whatsapp) || digits(e.contactPerson?.phone) || digits(e.contact?.phones?.[0]),
    email: e.ownerEmail || e.contactPerson?.email || e.contact?.email || "",
  };
}

const messageFor = (name: string, what: string, url: string) =>
  `Hello ${name},\n\nHere is a preview of your ${what} and visiting card on MediReach:\n${url}\n\nPlease check it and reply to approve it, or tell us what to change. The link works for ${PREVIEW_LINK_DAYS} days.`;

/** A signed preview link, with who to send it to (WhatsApp number, email) and a ready message. */
export const createPreviewLinkAction = adminAction({ schema: target }, async ({ kind, id }, admin) => {
  const w = await who(kind, id, admin);
  const url = previewUrl(await createPreviewToken({ kind, id }));
  return { url, name: w.name, phone: w.phone.length === 10 ? w.phone : "", email: w.email, message: messageFor(w.name, w.what, url), days: PREVIEW_LINK_DAYS };
});

/** Email the preview link (to the address typed, usually the owner's). */
export const emailPreviewLinkAction = adminAction(
  { schema: target.extend({ to: z.string().trim().toLowerCase().email("Enter a valid email address.") }) },
  async ({ kind, id, to }, admin) => {
    const w = await who(kind, id, admin);
    const url = previewUrl(await createPreviewToken({ kind, id }));
    const text = messageFor(w.name, w.what, url);
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0a3f3f">
<p>Hello ${esc(w.name)},</p>
<p>Here is a preview of your ${esc(w.what)} and visiting card on MediReach.</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#0E7C7B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open the preview</a></p>
<p>Please check it and reply to approve it, or tell us what to change. The link works for ${PREVIEW_LINK_DAYS} days.</p>
<p>MediReach</p></div>`;
    const res = await sendEmail({ to, subject: `Preview of your ${w.what} – MediReach`, html, text });
    if (!res.ok) throw new ActionError("The email couldn't be sent. Copy the link and send it on WhatsApp instead.");
    await audit(auditCtx(admin), kind === "doctor" ? "doctor.preview_link.email" : "site.preview_link.email", { entity: kind === "doctor" ? "DoctorProfile" : "Establishment", entityId: id, diff: { to } });
    return { to };
  },
);

/** This doctor's or site's payments, newest first, and the setup/renewal dates they set. */
export const reviewPaymentsAction = adminAction({ schema: target, roles: ADMINS }, async ({ kind, id }) => {
  const filter = kind === "doctor" ? { doctorId: id } : { $or: [{ establishmentId: id }, { hospitalId: id }] };
  const [payments, doc] = await Promise.all([
    Payment.find(filter).sort({ date: -1 }).limit(20).select({ amount: 1, date: 1, purpose: 1, mode: 1, invoiceNo: 1 }).lean(),
    kind === "doctor"
      ? DoctorProfile.findById(id).select({ setupPaidAt: 1, renewalDueDate: 1, renewalStatus: 1, renewalPrice: 1 }).lean()
      : Establishment.findById(id).select({ setupPaidAt: 1, renewalDueDate: 1, renewalStatus: 1, renewalPrice: 1 }).lean(),
  ]);
  if (!doc) throw new ActionError("Not found.");
  return {
    payments: payments.map((p) => ({ id: String(p._id), amount: p.amount, date: formatDate(p.date), purpose: String(p.purpose), mode: p.mode, invoiceNo: p.invoiceNo ?? "" })),
    business: {
      setupPaidAt: toDateInput(doc.setupPaidAt),
      renewalDueDate: toDateInput(doc.renewalDueDate),
      renewalStatus: doc.renewalStatus,
      renewalPrice: doc.renewalPrice ?? undefined,
    },
  };
});

/** The live address once published: the own subdomain if set, else the MediReach page. */
async function liveUrlOf(kind: "doctor" | "site", id: string): Promise<string> {
  const d =
    kind === "doctor"
      ? await DoctorProfile.findById(id).select({ status: 1, subdomain: 1, slug: 1, citySlug: 1 }).lean()
      : await Establishment.findById(id).select({ status: 1, kind: 1, subdomain: 1, slug: 1, citySlug: 1 }).lean();
  if (!d) throw new ActionError("Not found.");
  if (d.status !== "published" || !d.slug || !d.citySlug) throw new ActionError("Publish first, then send the live link.");
  if (d.subdomain) return subdomainUrl(d.subdomain);
  const path = kind === "doctor" ? paths.doctor(d.citySlug, d.slug) : ("kind" in d && d.kind === "hospital" ? paths.hospital : paths.clinic)(d.citySlug, d.slug);
  return absUrl(path);
}

const liveMessageFor = (name: string, what: string, url: string, uid: string) =>
  `Hello ${name},\n\nYour ${what} is now live on MediReach:\n${url}\n\nYour website UID: ${uid}\nPlease save it. Quote it whenever you contact us, and we can find your website at once.\n\nPlease open it and check everything. You can update everything on it yourself from your dashboard, and share this link with your patients, on WhatsApp and on social media.`;

/** The live link, with who to send it to (WhatsApp number, email) and a ready message. */
export const createLiveLinkAction = adminAction({ schema: target }, async ({ kind, id }, admin) => {
  const [w, url] = await Promise.all([who(kind, id, admin), liveUrlOf(kind, id)]);
  return { url, name: w.name, phone: w.phone.length === 10 ? w.phone : "", email: w.email, message: liveMessageFor(w.name, w.what, url, w.uid) };
});

/** Email the live link (to the address typed, usually the owner's). */
export const emailLiveLinkAction = adminAction(
  { schema: target.extend({ to: z.string().trim().toLowerCase().email("Enter a valid email address.") }) },
  async ({ kind, id, to }, admin) => {
    const [w, url] = await Promise.all([who(kind, id, admin), liveUrlOf(kind, id)]);
    const text = liveMessageFor(w.name, w.what, url, w.uid);
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0a3f3f">
<p>Hello ${esc(w.name)},</p>
<p>Your ${esc(w.what)} is now live on MediReach.</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#0E7C7B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open your ${esc(w.what)}</a></p>
<p>${esc(url)}</p>
<p style="padding:12px 16px;background:#ECF6F5;border-radius:8px">Your website UID: <strong style="font-family:monospace;font-size:16px">${esc(w.uid)}</strong><br>Please save it. Quote it whenever you contact us, and we can find your website at once.</p>
<p>Please open it and check everything. You can share this link with your patients, on WhatsApp and on social media.</p>
<p>MediReach</p></div>`;
    const res = await sendEmail({ to, subject: `Your ${w.what} is live – MediReach`, html, text });
    if (!res.ok) throw new ActionError("The email couldn't be sent. Copy the link and send it on WhatsApp instead.");
    await audit(auditCtx(admin), kind === "doctor" ? "doctor.live_link.email" : "site.live_link.email", { entity: kind === "doctor" ? "DoctorProfile" : "Establishment", entityId: id, diff: { to } });
    return { to };
  },
);
