import type { TemplateKey } from "@/lib/constants";

/**
 * The five portfolio designs shown on sample pages. Flip `ready` as each one is
 * built. `sample` is the example doctor the design gallery opens it with
 * (/sample/{sample}?design={key}); demo doctors live in fixtures/demo-doctors.
 */
export const SAMPLE_DESIGNS: { key: TemplateKey; name: string; ready: boolean; sample: string }[] = [
  { key: "classic", name: "Classic", ready: true, sample: "gp" },
  { key: "t2", name: "Clinic Modern", ready: true, sample: "arnav-deshpande" },
  { key: "t3", name: "Minimal Mono", ready: false, sample: "gp" },
  { key: "t4", name: "Warm Heritage", ready: false, sample: "gp" },
  { key: "t5", name: "Specialist Pro", ready: false, sample: "gp" },
];
