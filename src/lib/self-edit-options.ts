import "server-only";
import { getEditorOptions, type EditorOptions } from "@/lib/doctors/options";
import { getEstablishmentEditorOptions, type EstablishmentEditorOptions } from "@/lib/establishments/options";

/**
 * Editor options for a doctor's or owner's own dashboard: the same lists the
 * team's editors use, minus anything internal (team names, prices) and minus
 * other customers' unpublished drafts.
 */

export async function getDoctorSelfEditOptions(): Promise<EditorOptions> {
  const o = await getEditorOptions();
  const { Establishment } = await import("@/models/Establishment");
  const live = new Set((await Establishment.find({ status: "published" }).select({ _id: 1 }).lean()).map((e) => String(e._id)));
  return {
    ...o,
    establishments: o.establishments.filter((e) => live.has(e.id)),
    team: [],
    prices: { renewalDoctor: 0, foundingRenewal: 0, doctorSetup: 0, doctorAddon: 0 },
  };
}

export async function getSiteSelfEditOptions(): Promise<EstablishmentEditorOptions> {
  const o = await getEstablishmentEditorOptions();
  return {
    ...o,
    // Only doctors with a live page can be linked; drafts stay private.
    doctors: o.doctors.filter((d) => d.status === "published"),
    team: [],
    prices: { ...o.prices, doctorAddon: 0, renewalClinic: 0, renewalHospital: 0, foundingRenewal: 0, foundingRenewalHospital: 0, clinicSetup: 0, hospitalSetup: 0 },
  };
}
