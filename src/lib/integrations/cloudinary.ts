import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { requireEnv } from "@/lib/env";

/**
 * Cloudinary for portfolio images (doctor photos, gallery, award photos,
 * template previews). These are PUBLIC by design — they appear on public
 * pages and in Google — but uploads are still SIGNED by the server, so only a
 * signed-in admin can upload, only into our folders, and only images.
 *
 * Never upload patient photos or before/after images (NMC); the dashboard
 * says so next to every upload control.
 */

let configured = false;
function configure() {
  if (configured) return;
  cloudinary.config({
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("CLOUDINARY_API_KEY"),
    api_secret: requireEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });
  configured = true;
}

export const UPLOAD_PURPOSES = ["doctor-photo", "gallery", "award", "interests", "template-preview", "logo", "cover", "intake", "blog"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic";

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  allowedFormats: string;
}

/**
 * Params for a direct browser → Cloudinary upload. The signature covers the
 * folder, timestamp and allowed formats, so the client can't change them.
 */
export function createSignedUpload(purpose: UploadPurpose): SignedUploadParams {
  configure();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `medireach-portfolio/${purpose}`;
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp, allowed_formats: ALLOWED_FORMATS },
    requireEnv("CLOUDINARY_API_SECRET"),
  );
  return {
    signature,
    timestamp,
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    folder,
    allowedFormats: ALLOWED_FORMATS,
  };
}

/** Delete an image we no longer reference (best effort). */
export async function deleteImage(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
