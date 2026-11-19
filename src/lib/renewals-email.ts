import { dateIN, RENEWAL_PRODUCT_LABEL, type ReminderDay, type RenewalProduct } from "@/lib/renewals";

/**
 * Renewal emails (plain, factual, no exclamation marks). Pure functions so
 * they can be tested; the daily job (lib/renewals-job.ts) sends them.
 */

export interface RenewalSite {
  name: string;
  product: RenewalProduct;
  due: Date;
  price: number;
  /** Public address of the site. */
  link?: string;
}

export interface MediReachContact {
  /** Digits with country code. */
  whatsapp: string;
  phone?: string;
  email: string;
}

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const phoneText = (digits: string) => {
  const m = /^91(\d{5})(\d{5})$/.exec(digits.replace(/\D/g, ""));
  return m ? `+91 ${m[1]} ${m[2]}` : `+${digits.replace(/\D/g, "")}`;
};

function contactLines(c: MediReachContact): string[] {
  return [`WhatsApp: ${phoneText(c.whatsapp)}`, ...(c.phone ? [`Phone: ${phoneText(c.phone)}`] : []), `Email: ${c.email}`];
}

function layout(paragraphs: string[], c: MediReachContact): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("");
  const contact = contactLines(c).map(esc).join("<br>");
  return `<!doctype html><html><body style="margin:0;background:#F7F9FA;font-family:Arial,Helvetica,sans-serif;color:#1F2933">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#0E7C7B">Medi<span style="color:#F2994A">Reach</span></p>
<div style="background:#ffffff;border:1px solid #E5E7EB;border-radius:12px;padding:22px;font-size:15px;line-height:1.55">${body}
<p style="margin:18px 0 0;font-size:14px;color:#5B6573">${contact}</p></div>
<p style="margin:16px 0 0;font-size:12px;color:#5B6573">MediReach, a Sym HealthTech product, Pune.</p>
</div></body></html>`;
}

/** Reminder to the site owner, 30 / 7 / 0 days before the due date (or after it, if the due-date one was missed). */
export function ownerReminderEmail(site: RenewalSite, days: ReminderDay, contact: MediReachContact, now: Date = new Date()): Email {
  const what = RENEWAL_PRODUCT_LABEL[site.product];
  const when = dateIN(site.due);
  const past = site.due.getTime() < now.getTime() && days === 0;
  const subject =
    days === 30
      ? `Your MediReach renewal is due on ${when}`
      : days === 7
        ? `Reminder: your MediReach renewal is due in 7 days`
        : past
          ? `Your MediReach renewal was due on ${when}`
          : `Your MediReach renewal is due today`;
  const lines = [
    `Hello ${site.name},`,
    `The yearly renewal for your ${what}${site.link ? ` (${site.link})` : ""} ${past ? "was due" : "is due"} on ${when}: ${rupees(site.price)}.`,
    "The renewal covers hosting, security, your visiting card link and the changes you make yourself.",
    "You can pay by UPI or bank transfer. Reply to this email or message us on WhatsApp and we'll send the details.",
    past ? "Your site stays live for now. If the renewal isn't paid during the grace period, the site is paused until it is." : "",
    "Thank you,\nMediReach",
  ].filter(Boolean);
  return {
    subject,
    text: [...lines, "", ...contactLines(contact)].join("\n\n"),
    html: layout(lines.map((l) => esc(l).replace(/\n/g, "<br>")), contact),
  };
}

/** Sent to the owner when the grace period ends and the site is paused. */
export function ownerLapsedEmail(site: RenewalSite, contact: MediReachContact): Email {
  const what = RENEWAL_PRODUCT_LABEL[site.product];
  const lines = [
    `Hello ${site.name},`,
    `The renewal for your ${what}${site.link ? ` (${site.link})` : ""} was due on ${dateIN(site.due)} and has not been paid, so the site is now paused.`,
    "Nothing has been deleted. Visitors see a short notice with our contact details, and search engines are asked not to show the page.",
    `Pay the renewal (${rupees(site.price)}) and your site is live again straight away.`,
    "Thank you,\nMediReach",
  ];
  return {
    subject: "Your MediReach site is paused until the renewal is paid",
    text: [...lines, "", ...contactLines(contact)].join("\n\n"),
    html: layout(lines.map((l) => esc(l).replace(/\n/g, "<br>")), contact),
  };
}

export interface DigestItem {
  name: string;
  product: RenewalProduct;
  due: Date;
  price: number;
  days?: ReminderDay;
  ownerEmailed: boolean;
}

/** One email a day to the MediReach team: reminders sent, sites paused, failures. */
export function adminDigestEmail(d: { reminders: DigestItem[]; lapsed: DigestItem[]; failures: string[]; adminUrl: string }): Email {
  const parts = [
    d.reminders.length ? `${d.reminders.length} reminder${d.reminders.length === 1 ? "" : "s"}` : "",
    d.lapsed.length ? `${d.lapsed.length} site${d.lapsed.length === 1 ? "" : "s"} paused` : "",
    d.failures.length ? `${d.failures.length} email failure${d.failures.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const row = (i: DigestItem) =>
    `${i.name} (${RENEWAL_PRODUCT_LABEL[i.product]}) · due ${dateIN(i.due)} · ${rupees(i.price)}${i.days !== undefined ? ` · ${i.days === 0 ? "due-date" : `${i.days}-day`} reminder` : ""}${i.ownerEmailed ? "" : " · no owner email: send the WhatsApp reminder"}`;
  const sections: [string, string[]][] = [
    ["Reminders", d.reminders.map(row)],
    ["Paused (grace period over)", d.lapsed.map(row)],
    ["Email failures (will retry tomorrow)", d.failures],
  ];
  const text = [
    `Renewals today: ${parts.join(", ") || "nothing to do"}.`,
    ...sections.filter(([, rows]) => rows.length).map(([h, rows]) => `${h}\n${rows.map((r) => `- ${r}`).join("\n")}`),
    `Payments & renewals: ${d.adminUrl}`,
  ].join("\n\n");
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1F2933;font-size:14px;line-height:1.5">
<p><strong>Renewals today:</strong> ${esc(parts.join(", ") || "nothing to do")}.</p>
${sections
  .filter(([, rows]) => rows.length)
  .map(([h, rows]) => `<p style="margin:16px 0 4px"><strong>${esc(h)}</strong></p><ul style="margin:0;padding-left:18px">${rows.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`)
  .join("")}
<p style="margin-top:18px"><a href="${esc(d.adminUrl)}">Open Payments &amp; renewals</a></p></body></html>`;
  return { subject: `MediReach renewals: ${parts.join(", ") || "nothing to do"}`, text, html };
}
