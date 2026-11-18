import { Activity, Baby, Bone, Droplets, Ear, Eye, Flower2, HeartPulse, Hospital, Leaf, Smile, Sparkles, Stethoscope, type LucideIcon } from "lucide-react";
import type { ThemeIconKey } from "@/themes/specialty";

/** Theme icon key → lucide component (kept apart from the config so the config stays plain data). */
export const THEME_ICONS: Record<ThemeIconKey, LucideIcon> = {
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  smile: Smile,
  eye: Eye,
  ear: Ear,
  "heart-pulse": HeartPulse,
  leaf: Leaf,
  droplets: Droplets,
  activity: Activity,
  baby: Baby,
  "flower-2": Flower2,
  bone: Bone,
  hospital: Hospital,
};
