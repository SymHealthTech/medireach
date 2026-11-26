import type { PublicClinic } from "@/templates/types";

/**
 * Splits a doctor's places into the clinics shown in full (their own
 * clinics) and the hospitals they visit as a consultant, which every design
 * lists briefly below (shared/VisitingHospitals). A doctor who only visits
 * hospitals gets the first one shown in full.
 */
export function splitClinics(clinics: PublicClinic[]): { main: PublicClinic[]; visiting: PublicClinic[] } {
  const main = clinics.filter((c) => c.type !== "hospital_visiting");
  const visiting = clinics.filter((c) => c.type === "hospital_visiting");
  if (main.length === 0 && visiting.length > 0) return { main: [visiting[0]!], visiting: visiting.slice(1) };
  return { main, visiting };
}
