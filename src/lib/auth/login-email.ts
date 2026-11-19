import { absUrl } from "@/lib/site";

/**
 * Branded login emails for doctors and clinic/hospital owners (magic link and login code). Pure: builds subject, HTML and a
 * plain-text fallback. Inline styles and tables only, so it renders in Gmail,
 * Outlook and phone mail apps; the wordmark is text, so it shows even when
 * images are blocked.
 */

const INK = "#0A3F3F";
const PAPER = "#F7F9FA";
const MUTED = "#5B6573";
const LINE = "#E5E7EB";
const ICON_URL = absUrl("/icon-192.png");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface LoginEmail {
  subject: string;
  html: string;
  text: string;
}

export function loginEmail({ name, url, welcome = false }: { name: string; url: string; welcome?: boolean }): LoginEmail {
  const subject = welcome ? "Manage your MediReach page" : "Your MediReach login link";
  const intro = welcome
    ? "Your MediReach site is set up for self-editing. Log in to update your timings, phone numbers and address whenever they change."
    : "Here is your link to log in to MediReach.";
  const n = esc(name);
  const u = esc(url);

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;">
<tr><td style="padding:28px 32px 0 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:24px;font-weight:bold;color:#0E7C7B;">
<img src="${ICON_URL}" width="32" height="32" alt="" style="vertical-align:middle;border:0;margin-right:8px;">Medi<span style="color:#F2994A">Reach</span>
</td></tr>
<tr><td style="padding:24px 32px 0 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:24px;color:#1F2933;">
<p style="margin:0 0 12px 0;">Hello ${n},</p>
<p style="margin:0 0 24px 0;">${esc(intro)}</p>
</td></tr>
<tr><td align="center" style="padding:0 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td align="center" bgcolor="${INK}" style="border-radius:10px;">
<a href="${u}" style="display:inline-block;padding:16px 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">Log in to MediReach</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 32px 0 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:21px;color:${MUTED};">
<p style="margin:0 0 8px 0;">The link works once and expires in 24 hours. If the button doesn't work, copy this link into your browser:</p>
<p style="margin:0 0 20px 0;word-break:break-all;"><a href="${u}" style="color:${INK};">${u}</a></p>
</td></tr>
<tr><td style="padding:16px 32px 28px 32px;border-top:1px solid ${LINE};font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
Didn't request this? Ignore this email. Nobody can log in without this link.<br>MediReach · Sym HealthTech, Pune
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hello ${name},`,
    "",
    intro,
    "",
    "Log in to MediReach:",
    url,
    "",
    "The link works once and expires in 24 hours.",
    "",
    "Didn't request this? Ignore this email. Nobody can log in without this link.",
    "MediReach · Sym HealthTech, Pune",
  ].join("\n");

  return { subject, html, text };
}

/** Login code email (email OTP on /login): the 6-digit code, large, plus a plain-text fallback. */
export function loginCodeEmail({ name, code }: { name: string; code: string }): LoginEmail {
  const subject = `${code} is your MediReach login code`;
  const n = esc(name);
  const c = esc(code);
  const font = "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;">
<tr><td style="padding:28px 32px 0 32px;font-family:${font};font-size:24px;font-weight:bold;color:#0E7C7B;">
<img src="${ICON_URL}" width="32" height="32" alt="" style="vertical-align:middle;border:0;margin-right:8px;">Medi<span style="color:#F2994A">Reach</span>
</td></tr>
<tr><td style="padding:24px 32px 0 32px;font-family:${font};font-size:16px;line-height:24px;color:#1F2933;">
<p style="margin:0 0 12px 0;">Hello ${n},</p>
<p style="margin:0 0 20px 0;">Enter this code on the MediReach login page:</p>
</td></tr>
<tr><td align="center" style="padding:0 32px;">
<div style="display:inline-block;padding:16px 28px;background:#ECF6F5;border:1px solid #CDEAE8;border-radius:12px;font-family:${font};font-size:34px;font-weight:bold;letter-spacing:10px;color:${INK};">${c}</div>
</td></tr>
<tr><td style="padding:20px 32px 0 32px;font-family:${font};font-size:14px;line-height:21px;color:${MUTED};">
<p style="margin:0 0 20px 0;">The code works once and expires in 10 minutes. Never share it with anyone, including anyone who says they are from MediReach.</p>
</td></tr>
<tr><td style="padding:16px 32px 28px 32px;border-top:1px solid ${LINE};font-family:${font};font-size:13px;line-height:20px;color:${MUTED};">
Didn't request this? Ignore this email. Nobody can log in without this code.<br>MediReach · Sym HealthTech, Pune
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hello ${name},`,
    "",
    `Your MediReach login code is ${code}`,
    "",
    "Enter it on the MediReach login page. It works once and expires in 10 minutes.",
    "Never share it with anyone, including anyone who says they are from MediReach.",
    "",
    "Didn't request this? Ignore this email. Nobody can log in without this code.",
    "MediReach · Sym HealthTech, Pune",
  ].join("\n");

  return { subject, html, text };
}
