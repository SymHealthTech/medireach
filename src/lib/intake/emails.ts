import { absUrl } from "@/lib/site";

/**
 * Emails for the self-filled website forms. Pure: subject, HTML (inline styles
 * and tables, like lib/auth/login-email.ts) and a plain-text fallback.
 */

const INK = "#0A3F3F";
const PAPER = "#F7F9FA";
const MUTED = "#5B6573";
const LINE = "#E5E7EB";
const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface IntakeEmail {
  subject: string;
  html: string;
  text: string;
}

/** Page where an applicant returns to a saved form. */
export const continueUrl = (email: string) => `${absUrl("/get-started/continue")}?${new URLSearchParams({ email })}`;

function shell(subject: string, bodyHtml: string, button?: { label: string; url: string }): string {
  const btn = button
    ? `<tr><td align="center" style="padding:8px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${INK}" style="border-radius:10px;"><a href="${esc(button.url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(button.label)}</a></td></tr></table></td></tr>`
    : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;">
<tr><td style="padding:28px 32px 0 32px;font-family:${FONT};font-size:24px;font-weight:bold;color:#0E7C7B;">Medi<span style="color:#F2994A">Reach</span></td></tr>
<tr><td style="padding:20px 32px 8px 32px;font-family:${FONT};font-size:16px;line-height:24px;color:#1F2933;">${bodyHtml}</td></tr>
${btn}
<tr><td style="padding:24px 32px 28px 32px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">MediReach · Sym HealthTech, Pune</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const p = (s: string) => `<p style="margin:0 0 14px 0;">${s}</p>`;

/** First save: how to come back to the form. */
export function intakeSavedEmail({ name, email, ref, kindLabel }: { name: string; email: string; ref: string; kindLabel: string }): IntakeEmail {
  const subject = `Your MediReach form is saved (${ref})`;
  const url = continueUrl(email);
  const hello = name ? `Hello ${name},` : "Hello,";
  const html = shell(
    subject,
    p(esc(hello)) +
      p(`We saved your <strong>${esc(kindLabel.toLowerCase())}</strong> form. You can finish it any time: open the link below and log in with this email (<strong>${esc(email)}</strong>). We'll send you a one-time code.`) +
      p(`Your form reference is <strong>${esc(ref)}</strong>. Mention it if you send photos on WhatsApp.`),
    { label: "Continue my form", url },
  );
  const text = [hello, "", `We saved your ${kindLabel.toLowerCase()} form. To finish it, open this link and log in with ${email}:`, url, "", `Form reference: ${ref}`, "", "MediReach · Sym HealthTech, Pune"].join("\n");
  return { subject, html, text };
}

/** One-time code to reopen a saved form. */
export function intakeCodeEmail({ code }: { code: string }): IntakeEmail {
  const subject = `${code} is your MediReach form code`;
  const html = shell(
    subject,
    p("Enter this code to open your saved MediReach website form:") +
      `<div style="display:inline-block;margin:0 0 16px 0;padding:14px 26px;background:#ECF6F5;border:1px solid #CDEAE8;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:10px;color:${INK};">${esc(code)}</div>` +
      `<p style="margin:0 0 8px 0;font-size:14px;color:${MUTED};">The code works once and expires in 10 minutes. Never share it with anyone. Didn't ask for it? Ignore this email.</p>`,
  );
  const text = [`Your MediReach form code is ${code}`, "", "It works once and expires in 10 minutes. Never share it with anyone.", "", "MediReach · Sym HealthTech, Pune"].join("\n");
  return { subject, html, text };
}

/** Sent for review: what happens next. */
export function intakeSubmittedEmail({ name, email, ref, kindLabel }: { name: string; email: string; ref: string; kindLabel: string }): IntakeEmail {
  const subject = `We've received your details (${ref})`;
  const hello = name ? `Hello ${name},` : "Hello,";
  const url = continueUrl(email);
  const html = shell(
    subject,
    p(esc(hello)) +
      p(`Thank you. We've received your <strong>${esc(kindLabel.toLowerCase())}</strong> form (ref <strong>${esc(ref)}</strong>). Our team will check it, add anything that's missing and design your website. We'll contact you before it goes live.`) +
      p(`Need to change something? Log in again with <strong>${esc(email)}</strong> and update the form.`),
    { label: "View or change my form", url },
  );
  const text = [hello, "", `We've received your ${kindLabel.toLowerCase()} form (ref ${ref}). Our team will check it and design your website. We'll contact you before it goes live.`, "", `To change something, log in with ${email}:`, url, "", "MediReach · Sym HealthTech, Pune"].join("\n");
  return { subject, html, text };
}

/** To the team: a form was sent (or changed after sending). */
export function intakeTeamEmail({
  id,
  ref,
  kindLabel,
  name,
  phone,
  email,
  missing,
  updated,
}: {
  id: string;
  ref: string;
  kindLabel: string;
  name: string;
  phone?: string;
  email: string;
  missing: number;
  updated: boolean;
}): IntakeEmail {
  const subject = `${updated ? "Updated" : "New"} website form: ${name || email} (${kindLabel}, ${ref})`;
  const url = absUrl(`/admin/intakes/${id}`);
  const rows: [string, string][] = [
    ["Form", `${kindLabel} · ${ref}`],
    ["Name", name || "—"],
    ["Phone", phone || "—"],
    ["Email", email],
    ["Required items missing", String(missing)],
  ];
  const html = shell(
    subject,
    `<table style="font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:${MUTED}">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>`,
    { label: "Review in dashboard", url },
  );
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), "", url].join("\n");
  return { subject, html, text };
}
