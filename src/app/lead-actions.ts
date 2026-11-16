"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { connectToDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/integrations/email";
import { optionalEnv } from "@/lib/env";
import { Lead } from "@/models/Lead";

/**
 * Public lead form (homepage, pricing, hospitals, contact). Validated with zod,
 * guarded by a honeypot field and rate limits, saved as a Lead, and emailed to
 * the team via Resend (email failure never loses the lead).
 */

export interface LeadFormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What was submitted, echoed back on error: React resets the form after an action. */
  values?: Record<string, string>;
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+?91)(?=\d{10}$)/, ""))
    .refine((s) => /^[6-9]\d{9}$/.test(s), "Enter a 10-digit mobile number."),
  city: optional(60),
  specialty: optional(80),
  message: optional(1000),
  source: z.enum(["homepage_form", "pricing", "hospitals"]),
  // Honeypot: real people never see or fill this.
  website: z.string().max(0).optional(),
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function submitLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const raw = Object.fromEntries(["name", "phone", "city", "specialty", "message", "source", "website"].map((k) => [k, formData.get(k) ?? undefined]));
  const parsed = schema.safeParse(raw);
  const values = Object.fromEntries(
    ["name", "phone", "city", "specialty", "message"].map((k) => [k, typeof raw[k] === "string" ? raw[k].slice(0, 1000) : ""]),
  );
  if (!parsed.success) {
    // A filled honeypot gets a quiet "success" so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true };
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please check the form.", fieldErrors, values };
  }
  const { website: _hp, ...lead } = parsed.data;

  const ip = clientIpFrom(await headers());
  const [byIp, byPhone] = await Promise.all([
    hitRateLimit(`lead:ip:${ip}`, 5, 60 * 60_000),
    hitRateLimit(`lead:phone:${lead.phone}`, 3, 24 * 60 * 60_000),
  ]);
  if (!byIp.allowed || !byPhone.allowed) {
    return { error: "We've already got your request. We'll be in touch soon, or message us on WhatsApp.", values };
  }

  await connectToDatabase();
  await Lead.create({ ...lead, status: "new" });

  const to = optionalEnv("LEAD_NOTIFY_EMAIL") || optionalEnv("ADMIN_EMAIL");
  if (to) {
    const rows: [string, string | undefined][] = [
      ["Name", lead.name],
      ["Phone", lead.phone],
      ["City", lead.city],
      ["Specialty", lead.specialty],
      ["Message", lead.message],
      ["Source", lead.source],
    ];
    await sendEmail({
      to,
      subject: `New MediReach lead: ${lead.name}`,
      text: rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"),
      html:
        `<h2 style="font-family:system-ui;color:#0E3B3C">New lead</h2><table style="font-family:system-ui;font-size:14px">` +
        rows
          .filter(([, v]) => v)
          .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5D6B6C">${k}</td><td>${escapeHtml(v!)}</td></tr>`)
          .join("") +
        `</table>`,
    });
  }
  return { ok: true };
}
