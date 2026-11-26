import type { TemplateKey } from "@/lib/constants";

/**
 * The five portfolio designs shown on sample pages. Flip `ready` as each one is
 * built. `sample` is the example doctor the design gallery opens it with
 * (/sample/{sample}?design={key}); demo doctors live in fixtures/demo-doctors.
 */
export const SAMPLE_DESIGNS: { key: TemplateKey; name: string; ready: boolean; sample: string }[] = [
  { key: "classic", name: "Serene Care", ready: true, sample: "rhea-sardesai" },
  { key: "t2", name: "Clinic Modern", ready: true, sample: "arnav-deshpande" },
  { key: "t3", name: "Modern Edge", ready: true, sample: "siddharth-rane" },
  { key: "t4", name: "Warm Heritage", ready: true, sample: "prachi-bhave" },
  { key: "t5", name: "Specialist Pro", ready: true, sample: "kunal-bhatia" },
];
