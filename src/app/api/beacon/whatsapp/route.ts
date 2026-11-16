import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { connectToDatabase } from "@/lib/db";
import { Lead } from "@/models/Lead";

/**
 * WhatsApp click beacon (navigator.sendBeacon from every WhatsApp button).
 * Records only which button was tapped — no personal data. Always answers
 * 204 so the click itself is never slowed down or blocked.
 */
export async function POST(req: Request) {
  try {
    const text = (await req.text()).slice(0, 200);
    const placement = (() => {
      try {
        const p = (JSON.parse(text) as { placement?: unknown }).placement;
        return typeof p === "string" && /^[a-z0-9_-]{1,40}$/.test(p) ? p : "unknown";
      } catch {
        return "unknown";
      }
    })();
    const { allowed } = await hitRateLimit(`wa-beacon:${clientIpFrom(req.headers)}`, 30, 60 * 60_000);
    if (allowed) {
      await connectToDatabase();
      await Lead.create({ name: "WhatsApp click", phone: "-", source: "whatsapp_click", status: "new", message: placement });
    }
  } catch (err) {
    console.error("[beacon]", err);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
