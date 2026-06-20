import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireActiveDoctor } from "@/lib/api/account";
import { transcribeAudio } from "@/lib/integrations/whisper";

/**
 * Transcribe a dictated audio clip (spec §7.3). Doctor-only; voice is exclusive
 * to the doctor role (§5.2). The audio is processed in-memory and NOT stored —
 * raw dictation is discarded after transcription (§15.10). A transcription
 * failure returns a clear message so the UI can fall back to manual typing.
 */
export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  await requireActiveDoctor(ctx);

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    throw Errors.badRequest("No audio was provided.");
  }
  // Guard against oversized uploads (≈10 MB is plenty for a dictation clip).
  if (file.size > 10 * 1024 * 1024) {
    throw Errors.badRequest("Recording is too large. Please keep clips short.");
  }

  const result = await transcribeAudio(file);
  if (!result.ok) throw Errors.badRequest(result.error ?? "Could not transcribe audio.");

  return jsonOk({ text: result.text });
});
