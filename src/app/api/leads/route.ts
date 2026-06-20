import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { Lead } from "@/models/Lead";

/**
 * Public lead capture (spec §4, §6.5). The 3-field website form lands here and
 * becomes a row in the admin Leads queue for a human to follow up — no
 * automated funnel. Public + rate-limited; validated server-side.
 */
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  clinicName: z.string().trim().max(160).optional().default(""),
  phone: fields.mobile,
  source: z.string().trim().max(40).optional().default("form"),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`lead:${clientIp(req)}`, 5, 60_000);

    const data = await parseBody(req, schema);
    await Lead.create({
      name: data.name,
      clinicName: data.clinicName,
      phone: data.phone,
      source: data.source,
      status: "new",
    });
    return jsonOk({ ok: true }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
