import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { Grievance } from "@/models/Grievance";

/**
 * Public DPDP grievance intake (spec §15.8, §6.4). A simple data-complaint
 * channel that LANDS in the admin grievance queue (not a dead inbox). Open to
 * anyone (patients/visitors), rate-limited, validated.
 */
const schema = z.object({
  contactEmail: fields.email,
  contactName: z.string().trim().max(120).optional(),
  kind: z.enum(["access", "erasure", "correction", "consent-withdrawal", "other"]).optional().default("other"),
  message: z.string().trim().min(5).max(4000),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`grievance:${clientIp(req)}`, 5, 60_000);

    const data = await parseBody(req, schema);
    await Grievance.create({ ...data, status: "open" });
    return jsonOk({ ok: true }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
