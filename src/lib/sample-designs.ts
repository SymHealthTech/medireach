import type { TemplateKey } from "@/lib/constants";

/** The five portfolio designs shown on sample pages. Flip `ready` as each one is built. */
export const SAMPLE_DESIGNS: { key: TemplateKey; name: string; ready: boolean }[] = [
  { key: "classic", name: "Classic", ready: true },
  { key: "t2", name: "Clinic Modern", ready: false },
  { key: "t3", name: "Minimal Mono", ready: false },
  { key: "t4", name: "Warm Heritage", ready: false },
  { key: "t5", name: "Specialist Pro", ready: false },
];
