import type { TemplateKey } from "@/lib/constants";

/**
 * The five portfolio designs shown on sample pages. Flip `ready` as each one is
 * built. `sample` is the example doctor the design gallery opens it with
 * (/sample/{sample}?design={key}); demo doctors live in fixtures/demo-doctors.
 * `colours` / `swatches` describe the design (its visiting card has the same).
 */
export const SAMPLE_DESIGNS: { key: TemplateKey; name: string; ready: boolean; sample: string; colours: string; swatches: [string, string, string] }[] = [
  { key: "classic", name: "Serene Care", ready: true, sample: "rhea-sardesai", colours: "Plum with soft rose", swatches: ["#55275A", "#F6A8BC", "#F5E8F3"] },
  { key: "t2", name: "Clinic Modern", ready: true, sample: "arnav-deshpande", colours: "Navy with teal", swatches: ["#0B2545", "#0D9488", "#F3F8FD"] },
  { key: "t3", name: "Modern Edge", ready: true, sample: "siddharth-rane", colours: "Ink, cobalt and signal orange", swatches: ["#0D1422", "#2445E0", "#E8591F"] },
  { key: "t4", name: "Warm Heritage", ready: true, sample: "prachi-bhave", colours: "Forest green, terracotta and saffron", swatches: ["#1F4A3A", "#B4522C", "#E0A33A"] },
  { key: "t5", name: "Specialist Pro", ready: true, sample: "kunal-bhatia", colours: "Slate with crimson", swatches: ["#0F1B2D", "#C21E3A", "#F3F6FA"] },
];
