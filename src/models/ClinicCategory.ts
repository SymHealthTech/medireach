import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ESTABLISHMENT_KINDS, type EstablishmentKind } from "@/lib/constants";
import { THEME_ICON_KEYS, THEME_KEYS, type ThemeIconKey, type ThemeKey } from "@/themes/specialty";

/**
 * Clinic/hospital category master. `name` is the singular used in titles
 * ("Shree Skin Clinic – Skin Clinic in Baner"); `plural` in hub headings
 * ("Skin Clinics in Baner, Pune"); `slug` in /[city]/clinics/[category].
 * New establishments start on the category's `defaultThemeKey`.
 */
export interface ClinicCategoryDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  plural: string;
  kind: EstablishmentKind;
  defaultThemeKey: ThemeKey;
  icon: ThemeIconKey;
  createdAt: Date;
  updatedAt: Date;
}

const clinicCategorySchema = new Schema<ClinicCategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plural: { type: String, required: true, trim: true },
    kind: { type: String, enum: ESTABLISHMENT_KINDS, required: true },
    defaultThemeKey: { type: String, enum: THEME_KEYS, required: true },
    icon: { type: String, enum: THEME_ICON_KEYS, required: true },
  },
  { timestamps: true },
);

clinicCategorySchema.index({ kind: 1, name: 1 });

export const ClinicCategory: Model<ClinicCategoryDoc> =
  (mongoose.models.ClinicCategory as Model<ClinicCategoryDoc>) ||
  mongoose.model<ClinicCategoryDoc>("ClinicCategory", clinicCategorySchema);
