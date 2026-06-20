import "server-only";
import webpush from "web-push";
import { optionalEnv } from "@/lib/env";
import { PushSubscription } from "@/models/PushSubscription";

/**
 * Web Push delivery (spec §10, §14; Change 4). Sends high-priority alert
 * notifications to a doctor's registered devices — the SOLE SOS channel (no
 * SMS). Configured lazily from VAPID env keys; if not configured it no-ops.
 * Dead subscriptions (404/410) are pruned so the store stays clean.
 */
let configured = false;
function configure(): boolean {
  if (configured) return true;
  const publicKey = optionalEnv("VAPID_PUBLIC_KEY");
  const privateKey = optionalEnv("VAPID_PRIVATE_KEY");
  const subject = optionalEnv("VAPID_SUBJECT", "mailto:support@medireach.app");
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  urgent?: boolean;
  /** Collapse-key so rapid repeated triggers replace rather than stack. */
  topic?: string;
  /** Structured data delivered to the service worker (e.g. GPS for a map link). */
  data?: Record<string, unknown>;
}

/**
 * Send a push to every device of the given doctor. Returns how many succeeded.
 * Never throws — a push failure must not break the SOS flow.
 */
export async function pushToDoctor(doctorId: string, payload: PushPayload): Promise<number> {
  if (!configure()) {
    console.warn("[push] VAPID not configured; SOS push cannot be delivered.");
    return 0;
  }

  const subs = await PushSubscription.find({ doctorId }).lean();
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
          {
            urgency: payload.urgent ? "high" : "normal",
            TTL: 60,
            ...(payload.topic ? { topic: payload.topic } : {}),
          },
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => undefined);
        } else {
          console.error("[push] send failed:", status, err);
        }
      }
    }),
  );

  return sent;
}
