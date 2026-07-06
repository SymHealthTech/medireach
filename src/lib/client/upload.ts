"use client";

import { apiPost } from "@/lib/client/api";

interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  type: "authenticated";
}

/**
 * Upload a file directly from the browser to Cloudinary using server-minted
 * signed params (spec §15.3). The file goes straight to Cloudinary (never
 * through our server), and is stored as an authenticated asset so it can only
 * be retrieved later via a signed, expiring URL. Returns the public_id, which
 * is the only thing we persist.
 */
export async function uploadSigned(
  file: File,
  purpose: "verification" | "profile-photo" | "report" | "card-cover" | "signature",
): Promise<{ publicId: string }> {
  const params = await apiPost<SignedUploadParams>("/api/uploads/sign", { purpose });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", params.apiKey);
  form.append("timestamp", String(params.timestamp));
  form.append("signature", params.signature);
  form.append("folder", params.folder);
  form.append("type", params.type);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    throw new Error("Upload failed. Please check the file and try again.");
  }
  const data = (await res.json()) as { public_id?: string };
  if (!data.public_id) throw new Error("Upload did not return a file id.");
  return { publicId: data.public_id };
}
