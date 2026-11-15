"use server";

import { z } from "zod";
import { adminAction } from "@/lib/admin/action";
import { createSignedUpload, UPLOAD_PURPOSES } from "@/lib/integrations/cloudinary";

/** Mint signed Cloudinary upload params for a signed-in admin. */
export const signUploadAction = adminAction(
  { schema: z.object({ purpose: z.enum(UPLOAD_PURPOSES) }) },
  async ({ purpose }) => createSignedUpload(purpose),
);
