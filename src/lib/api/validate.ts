import "server-only";
import type { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";
import { Errors } from "@/lib/api/errors";

/**
 * Parse + validate a JSON request body against a Zod schema (spec §15.5).
 * Rejects malformed JSON and invalid shapes with a 400 before any DB access,
 * so raw client input is never interpolated into a query (NoSQL-injection
 * defense — Zod coerces to known primitive types).
 *
 * Returns the schema's OUTPUT type (post-transform/default), so callers get the
 * resolved shape (e.g. defaulted "" strings) rather than the looser input type.
 */
export async function parseBody<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw Errors.badRequest("Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw Errors.badRequest(first ? `${first.path.join(".")}: ${first.message}` : "Invalid input.");
  }
  return result.data;
}

/** Common reusable field schemas. */
export const fields = {
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // Indian mobile: 10 digits, optional +91 / 91 prefix, normalized to 10 digits.
  mobile: z
    .string()
    .trim()
    .transform((s) => s.replace(/^\+?91/, "").replace(/\D/g, ""))
    .refine((s) => /^[6-9]\d{9}$/.test(s), "Enter a valid 10-digit mobile number."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  objectId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id."),
};
