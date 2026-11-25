/**
 * Default one-line descriptions (and an icon) for common services, so a
 * doctor's website reads well when the doctor gave only the service names.
 * The doctor's own description always wins. Matched on the service name,
 * first match wins; plain and factual (NMC: no claims).
 */

export type ServiceIcon =
  | "stethoscope"
  | "droplet"
  | "heart"
  | "syringe"
  | "clipboard"
  | "thermometer"
  | "apple"
  | "users"
  | "activity"
  | "baby"
  | "bone"
  | "eye"
  | "smile"
  | "brain"
  | "wind"
  | "sparkles"
  | "home"
  | "pill";

export const SERVICE_DEFAULTS: readonly { match: RegExp; icon: ServiceIcon; text: string }[] = [
  { match: /diabet|sugar|hba1c/i, icon: "droplet", text: "Regular sugar and HbA1c reviews, medicine adjustment, diet guidance and yearly check-ups for complications." },
  { match: /blood pressure|\bbp\b|hypertens/i, icon: "activity", text: "Blood pressure checks, home-reading reviews and long-term follow-up to keep it in range." },
  { match: /heart|cardi|ecg|echo/i, icon: "heart", text: "Assessment of heart health with ECG and tests as needed, and ongoing care for heart conditions." },
  { match: /vaccin|immuni/i, icon: "syringe", text: "Vaccines for children and adults with a written schedule and reminders for the next dose." },
  { match: /check-?up|screening|preventive|health check/i, icon: "clipboard", text: "Age-appropriate health check-ups with tests explained clearly in one visit." },
  { match: /thyroid|hormone|endocrin/i, icon: "pill", text: "Testing, treatment and follow-up for thyroid and hormone conditions." },
  { match: /diet|nutrition|lifestyle|weight|obesity/i, icon: "apple", text: "Practical advice on food, activity, sleep and weight that fits everyday life." },
  { match: /fever|infection|seasonal|dengue|malaria|typhoid/i, icon: "thermometer", text: "Diagnosis and care for fevers and infections, with tests when needed." },
  { match: /home visit|elder|senior|geriatric/i, icon: "home", text: "Regular reviews for senior citizens, and home visits by appointment where available." },
  { match: /child|paediatric|pediatric|newborn|baby|infant/i, icon: "baby", text: "Care for babies and children, from routine check-ups and growth monitoring to illnesses." },
  { match: /pregnan|antenatal|prenatal|maternity|obstetric/i, icon: "users", text: "Care through pregnancy with regular check-ups, scans and guidance at each stage." },
  { match: /bone|joint|knee|back|spine|fracture|ortho|arthritis/i, icon: "bone", text: "Assessment and treatment for bone, joint and back problems, with exercises and follow-up." },
  { match: /eye|vision|cataract|retina|spectacle/i, icon: "eye", text: "Eye examinations, vision tests and treatment of common eye conditions." },
  { match: /dental|teeth|tooth|root canal|gum|braces|implant/i, icon: "smile", text: "Dental check-ups, cleaning and treatment explained step by step." },
  { match: /skin|derma|acne|hair|cosmetic/i, icon: "sparkles", text: "Diagnosis and treatment of skin, hair and nail conditions." },
  { match: /asthma|lung|breath|copd|allerg/i, icon: "wind", text: "Care for asthma, allergies and breathing problems, including inhaler guidance." },
  { match: /mental|anxiety|depress|stress|counsel|psych/i, icon: "brain", text: "Confidential consultations for stress, anxiety, low mood and sleep problems." },
  { match: /family|general|consult|opd/i, icon: "stethoscope", text: "Consultations for everyday illnesses and long-term health concerns for the whole family." },
];

/** The description to show (the doctor's own, else a default, else a plain line) and an icon. */
export function describeService(name: string, own?: string): { text: string; icon: ServiceIcon } {
  const hit = SERVICE_DEFAULTS.find((d) => d.match.test(name));
  return {
    text: own?.trim() || hit?.text || `Consultation, treatment and follow-up for ${name.toLowerCase()}.`,
    icon: hit?.icon ?? "stethoscope",
  };
}
