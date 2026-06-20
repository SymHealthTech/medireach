import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { requireEnv } from "@/lib/env";

/**
 * Cloudinary integration (spec §14, §15.3). Two hard rules:
 *  1. Uploads are SIGNED (server mints a signature) — never an unsigned upload
 *     preset, which anyone could abuse to upload arbitrary content.
 *  2. Stored assets use `type: "authenticated"` and are retrieved only via
 *     short-lived SIGNED URLs — never a plain public link, since these are
 *     real patient lab/imaging documents and doctor verification certificates.
 *
 * We persist only the Cloudinary `public_id`; signed URLs are generated on
 * demand and never stored long-lived (spec §13 Visit note).
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

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  type: "authenticated";
}

/**
 * Mint params for a direct, signed client→Cloudinary upload. The signature
 * covers exactly the params the client must echo back, so the upload can't be
 * tampered to a different folder/type.
 */
export function createSignedUpload(folder: string): SignedUploadParams {
  configure();
  const timestamp = Math.floor(Date.now() / 1000);
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");

  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp, type: "authenticated" },
    requireEnv("CLOUDINARY_API_SECRET"),
  );

  return { signature, timestamp, apiKey, cloudName, folder, type: "authenticated" };
}

/** Generate a short-lived signed delivery URL for an authenticated asset. */
export function signedAssetUrl(publicId: string, expiresInSeconds = 300): string {
  configure();
  return cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    resource_type: "image",
  });
}

/** Permanently delete an asset (used by the 1-year retention purge, §9.3/§15.6). */
export async function deleteAsset(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { type: "authenticated", resource_type: "image" });
}
