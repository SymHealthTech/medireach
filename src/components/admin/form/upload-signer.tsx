"use client";

import { createContext, useContext } from "react";
import type { UploadSigner } from "@/lib/client/upload-image";

/**
 * Which server action signs image uploads for the editor components below it.
 * The admin dashboard needs nothing (uploadImage defaults to the admin
 * signer); a doctor's or owner's own dashboard wraps the shared editor steps
 * in a provider with their signer.
 */
const UploadSignerContext = createContext<UploadSigner | undefined>(undefined);

export const UploadSignerProvider = UploadSignerContext.Provider;

export function useUploadSigner(): UploadSigner | undefined {
  return useContext(UploadSignerContext);
}
