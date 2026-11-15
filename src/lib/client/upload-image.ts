"use client";

import { signUploadAction } from "@/app/admin/(dash)/upload-actions";
import type { UploadPurpose } from "@/lib/integrations/cloudinary";

export interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Upload an image straight from the browser to Cloudinary with server-signed
 * params (the file never passes through our server).
 */
export async function uploadImage(file: Blob, purpose: UploadPurpose): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large (max 10 MB).");

  const signed = await signUploadAction({ purpose });
  if (!signed.ok) throw new Error(signed.error);
  const p = signed.data;

  const form = new FormData();
  form.append("file", file);
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
