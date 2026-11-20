"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import type { ActionResult } from "@/lib/admin/action";
import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { normalizeEmail } from "@/lib/auth/login-link";
import { INTAKE_KINDS, type IntakeKind, type IntakeStatus } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/integrations/email";
import { createSignedUpload, type SignedUploadParams } from "@/lib/integrations/cloudinary";
import { checkIntakeCode, createIntakeCode, hitIntakeCodeIpLimit, hitIntakeCodeSendLimit, isIntakeCode } from "@/lib/intake/code";
import { intakeCodeEmail } from "@/lib/intake/emails";
import { intakeName, type IntakeData } from "@/lib/intake/form";
import { clearIntakeSession, getIntakeEmail, setIntakeSession } from "@/lib/intake/session";
import { intakesForEmail, saveIntake, sendIntakeNotifications, toView, type IntakeView, type SaveInput } from "@/lib/intake/server";
import { Intake } from "@/models/Intake";

/**
 * Public actions for the "Get started" website forms. No admin rights: every
 * write is checked against the applicant cookie (lib/intake/session.ts) inside
 * saveIntake, and everything is rate limited per IP.
 */

export type SaveIntakeResult =
  | { ok: true; intake: IntakeView }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; needsCode?: boolean; email?: string; existing?: IntakeView };

const GENERIC = "Something went wrong. Please try again, or message us on WhatsApp.";

async function ip() {
  return clientIpFrom(await headers());
}

/** Email a code if this address has a saved form (silently does nothing otherwise). */
async function sendCodeIfKnown(email: string): Promise<void> {
  await connectToDatabase();
  if (!(await Intake.exists({ email }))) return;
  const code = await createIntakeCode(email);
  await sendEmail({ to: email, ...intakeCodeEmail({ code }) });
}

export async function saveIntakeAction(input: SaveInput): Promise<SaveIntakeResult> {
  try {
    const addr = await ip();
    const limit = await hitRateLimit(`intake:save:ip:${addr}`, 200, 60 * 60_000);
    if (!limit.allowed) return { ok: false, error: "Too many saves from this network. Please wait a few minutes." };
    if (!input?.id) {
      const create = await hitRateLimit(`intake:new:ip:${addr}`, 15, 60 * 60_000);
      if (!create.allowed) return { ok: false, error: "Too many new forms from this network. Please try again later." };
    }

    const out = await saveIntake(input, await getIntakeEmail());
    if (!out.ok) {
      if ("needsCode" in out) {
        const sendLimit = await hitIntakeCodeSendLimit(out.email);
        if (sendLimit.allowed) {
          after(() => sendCodeIfKnown(out.email).catch((err) => console.error("[intake] code email failed", err)));
        }
        return { ok: false, needsCode: true, email: out.email, error: out.error };
      }
      return out;
    }
    if (out.sessionEmail) await setIntakeSession(out.sessionEmail);
    if (out.notify.length) after(() => sendIntakeNotifications(out.intake, out.notify));
    return { ok: true, intake: out.intake };
  } catch (err) {
    console.error("[intake] save failed", err);
    return { ok: false, error: GENERIC };
  }
}

const emailSchema = z.string().trim().toLowerCase().max(254).email();

/**
 * Send a code to reopen saved forms. Same answer whether or not the email has
 * a form, and the email goes out after the response.
 */
export async function requestIntakeCodeAction(input: { email: string }): Promise<{ ok: boolean; error?: string; email?: string }> {
  const parsed = emailSchema.safeParse(input?.email ?? "");
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = normalizeEmail(parsed.data);
  try {
    const [byEmail, byIp] = await Promise.all([hitIntakeCodeSendLimit(email), hitRateLimit(`intake-code:send-ip:${await ip()}`, 10, 15 * 60_000)]);
    if (!byEmail.allowed || !byIp.allowed) return { ok: false, error: "Too many codes requested. Please wait 15 minutes and try again." };
    after(() => sendCodeIfKnown(email).catch((err) => console.error("[intake] code email failed", err)));
    return { ok: true, email };
  } catch (err) {
    console.error("[intake] request code failed", err);
    return { ok: false, error: GENERIC };
  }
}

export interface IntakeSummary {
  id: string;
  kind: IntakeKind;
  ref: string;
  status: IntakeStatus;
  name: string;
  lastSavedAt: string;
}

export type VerifyIntakeResult = { ok: true; forms: IntakeSummary[]; intake?: IntakeView } | { ok: false; error: string };

const WRONG = "That code is wrong or has expired. Check the latest email, or send a new code.";

/**
 * Check the code, start the applicant session and return this email's forms
 * (plus the full form of `kind`, when the caller is on that form's page).
 */
export async function verifyIntakeCodeAction(input: { email: string; code: string; kind?: IntakeKind }): Promise<VerifyIntakeResult> {
  const parsed = emailSchema.safeParse(input?.email ?? "");
  const code = String(input?.code ?? "").replace(/\s/g, "");
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  if (!isIntakeCode(code)) return { ok: false, error: "Enter the 6-digit code from the email." };
  try {
    const limit = await hitIntakeCodeIpLimit(await ip());
    if (!limit.allowed) return { ok: false, error: "Too many tries. Please wait 15 minutes and try again." };
    const email = normalizeEmail(parsed.data);
    if (!(await checkIntakeCode(email, code))) return { ok: false, error: WRONG };
    await setIntakeSession(email);
    const docs = await intakesForEmail(email);
    const kind = input.kind && (INTAKE_KINDS as readonly string[]).includes(input.kind) ? input.kind : undefined;
    const match = kind ? docs.find((d) => d.kind === kind) : undefined;
    return {
      ok: true,
      forms: docs.map((d) => ({
        id: String(d._id),
        kind: d.kind,
        ref: d.ref,
        status: d.status,
        name: intakeName(d.kind, (d.data ?? {}) as IntakeData),
        lastSavedAt: new Date(d.lastSavedAt).toISOString(),
      })),
      ...(match ? { intake: toView(match) } : {}),
    };
  } catch (err) {
    console.error("[intake] verify failed", err);
    return { ok: false, error: GENERIC };
  }
}

/**
 * Signed Cloudinary params for an applicant's photo upload (straight from the
 * browser; the file never passes through us). Needs a saved form.
 */
export async function signIntakeUploadAction(): Promise<ActionResult<SignedUploadParams>> {
  try {
    const email = await getIntakeEmail();
    if (!email) return { ok: false, error: "Please save your form first (your email is needed)." };
    await connectToDatabase();
    if (!(await Intake.exists({ email }))) return { ok: false, error: "Please save your form first (your email is needed)." };
    const limit = await hitRateLimit(`intake:upload:${email}`, 80, 24 * 60 * 60_000);
    if (!limit.allowed) return { ok: false, error: "Upload limit reached for today. Please send the rest on WhatsApp." };
    return { ok: true, data: createSignedUpload("intake") };
  } catch (err) {
    console.error("[intake] sign upload failed", err);
    return { ok: false, error: "Photo upload isn't available right now. Please send your photos on WhatsApp." };
  }
}

/** "Not you?": forget this browser's form session. */
export async function endIntakeSessionAction(): Promise<void> {
  await clearIntakeSession();
}
