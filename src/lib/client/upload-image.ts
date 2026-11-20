"use client";

import { signUploadAction } from "@/app/admin/(dash)/upload-actions";
import type { ActionResult } from "@/lib/admin/action";
import { compressImage, type CompressOptions } from "@/lib/client/compress-image";
import type { SignedUploadParams, UploadPurpose } from "@/lib/integrations/cloudinary";

/** Server action that mints signed upload params (admin by default; doctors use their own). */
export type UploadSigner = (input: { purpose: UploadPurpose }) => Promise<ActionResult<SignedUploadParams>>;

export interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

/** Limit for what is sent to Cloudinary (after compression). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** What we accept from the device before compressing (big phone photos and scans are fine). */
export const MAX_PICKED_BYTES = 40 * 1024 * 1024;

/** Compression per purpose: logos keep transparency, portraits and previews have their own sizes. */
export function compressOptionsFor(purpose: UploadPurpose): CompressOptions {
  switch (purpose) {
    case "logo":
      return { maxSide: 1200, keepAlpha: true };
    case "doctor-photo":
      return { maxSide: 1600 };
    case "template-preview":
      return { maxSide: 2400 };
    default:
      return { maxSide: 2000 };
  }
}

/**
 * Upload an image straight from the browser to Cloudinary with server-signed
 * params (the file never passes through our server). Every image is
 * compressed first (lib/client/compress-image.ts), so people never have to
 * resize photos themselves.
 */
export async function uploadImage(
  file: Blob,
  purpose: UploadPurpose,
  sign: UploadSigner = signUploadAction,
  compress: CompressOptions = compressOptionsFor(purpose),
): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_PICKED_BYTES) throw new Error("Image is too large (max 40 MB).");
  const body = await compressImage(file, compress);
  if (body.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large. Please choose a smaller photo.");

  const signed = await sign({ purpose });
  if (!signed.ok) throw new Error(signed.error);
  const p = signed.data;

  const form = new FormData();
  form.append("file", body);
  form.append("api_key", p.apiKey);
  form.append("timestamp", String(p.timestamp));
  form.append("signature", p.signature);
  form.append("folder", p.folder);
  form.append("allowed_formats", p.allowedFormats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${p.cloudName}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed. Please check the image and try again.");
  const data = (await res.json()) as { public_id?: string; secure_url?: string; width?: number; height?: number };
  if (!data.public_id || !data.secure_url) throw new Error("Upload did not return an image.");
  return { publicId: data.public_id, url: data.secure_url, width: data.width ?? 0, height: data.height ?? 0 };
}
