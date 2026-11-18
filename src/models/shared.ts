import { Schema } from "mongoose";

/** Sub-schemas shared by DoctorProfile and Establishment. */

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ImageRef {
  publicId: string;
  url: string;
  alt?: string;
}

export interface TimeSlot {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

export interface DayTimings {
  day: number; // 0 = Sunday … 6 = Saturday
  slots: TimeSlot[];
}

export type GalleryItem = ImageRef & { caption: string };

export const imageSchema = new Schema<ImageRef>(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    alt: { type: String, trim: true },
  },
  { _id: false },
);

export const slotSchema = new Schema<TimeSlot>(
  {
    open: { type: String, required: true, match: HHMM },
    close: { type: String, required: true, match: HHMM },
  },
  { _id: false },
);

export const dayTimingsSchema = new Schema<DayTimings>(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    slots: { type: [slotSchema], default: [] },
  },
  { _id: false },
);

export const galleryItemSchema = new Schema<GalleryItem>(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    caption: { type: String, default: "", trim: true },
    alt: { type: String, trim: true },
  },
  { _id: false },
);

export const geoSchema = new Schema(
  { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
  { _id: false },
);

export const complianceIssueSchema = new Schema({ field: String, phrase: String }, { _id: false });

export const currentYear = () => new Date().getFullYear();

/** Only for partial unique indexes on optional string keys (drafts may not have them yet). */
export const hasString = (field: string) => ({ partialFilterExpression: { [field]: { $type: "string" } } });
