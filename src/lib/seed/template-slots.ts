import { TemplateSlot } from "@/models/TemplateSlot";
import type { SiteTemplateType, TemplateKey } from "@/lib/constants";

/**
 * Bring an existing database's design slots in line with the designs that
 * are built (`seedMasters` only sets names and status on insert).
 *
 *  - Renames a slot only while it still has its OLD default name, so a name
 *    typed in Dashboard → Design templates is never overwritten.
 *  - Marks built designs "ready"; never moves a slot back to coming soon.
 *
 * Safe to run again. `npm run sync:templates`.
 */
const BUILT: { type: SiteTemplateType; key: TemplateKey; name: string; oldNames: string[] }[] = [
  { type: "portfolio", key: "classic", name: "Serene Care", oldNames: ["Classic"] },
  { type: "portfolio", key: "t2", name: "Clinic Modern", oldNames: [] },
  { type: "portfolio", key: "t3", name: "Modern Edge", oldNames: ["Minimal Mono"] },
  { type: "card", key: "t2", name: "Clinic Modern", oldNames: ["Ink Bold"] },
  { type: "card", key: "t3", name: "Modern Edge", oldNames: ["Minimal"] },
];

export interface SlotChange {
  slot: string;
  renamed?: { from: string; to: string };
  madeReady?: boolean;
}

export async function syncTemplateSlots(): Promise<SlotChange[]> {
  const changes: SlotChange[] = [];
  for (const b of BUILT) {
    const slot = await TemplateSlot.findOne({ type: b.type, key: b.key });
    if (!slot) continue; // masters not seeded: seedMasters will insert it with the new name
    const change: SlotChange = { slot: `${b.type}/${b.key}` };
    if (b.oldNames.includes(slot.name)) {
      change.renamed = { from: slot.name, to: b.name };
      slot.name = b.name;
    }
    if (slot.status !== "ready") {
      slot.status = "ready";
      change.madeReady = true;
    }
    if (change.renamed || change.madeReady) {
      await slot.save();
      changes.push(change);
    }
  }
  return changes;
}
