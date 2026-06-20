import "server-only";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { importPKCS8, SignJWT } from "jose";
import { optionalEnv, requireEnv } from "@/lib/env";

/**
 * Speech-to-text (spec §7.3, §14). Transcribes a dictated audio clip via the
 * configured provider (OpenAI Whisper by default, Google Cloud Speech when
 * SPEECH_TO_TEXT_PROVIDER=google). The raw audio is NEVER persisted — it's
 * passed straight through and discarded after transcription (spec §15.10).
 * Errors surface a typed result so the consultation flow can fall back to
 * manual typing rather than crashing (build-prompt: failed AI call must never
 * crash the flow).
 *
 * Google path uses the Speech REST API v1 authenticated with a service account
 * JWT via the jose library (already a project dependency), so no additional
 * npm packages are required.
 */

export interface TranscriptionResult {
  ok: boolean;
  text: string;
  error?: string;
}

// ─── OpenAI Whisper ──────────────────────────────────────────────────────────

async function transcribeWithOpenAI(
  audio: Blob,
  filename: string,
  apiKey: string,
): Promise<TranscriptionResult> {
  try {
    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", "whisper-1");
    // Hindi/Marathi mixed with English is common (spec FAQ §4); let the model
    // auto-detect rather than pinning a single language.

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[whisper] transcription failed:", res.status, detail);
      return {
        ok: false,
        text: "",
        error: "Could not transcribe the recording. Please try again or type.",
      };
    }

    const data = (await res.json()) as { text?: string };
    return { ok: true, text: (data.text ?? "").trim() };
  } catch (err) {
    console.error("[whisper] transcription error:", err);
    return {
      ok: false,
      text: "",
      error: "Transcription service is unavailable. Please type instead.",
    };
  }
}

// ─── Google Cloud Speech-to-Text (REST v1) ───────────────────────────────────

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri: string;
}

/** Exchange a service-account JSON key for a short-lived OAuth2 Bearer token. */
async function getGoogleAccessToken(credentialsPath: string): Promise<string> {
  const raw = await readFile(resolve(credentialsPath), "utf8");
  const creds = JSON.parse(raw) as ServiceAccountCredentials;

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(creds.private_key, "RS256");

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now)
    .setIssuer(creds.client_email)
    .setAudience(creds.token_uri)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenRes = await fetch(creds.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "");
    throw new Error(`[google-stt] token exchange failed (${tokenRes.status}): ${err}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) throw new Error("[google-stt] no access_token in response");
  return tokenData.access_token;
}

async function transcribeWithGoogle(audio: Blob): Promise<TranscriptionResult> {
  try {
    const credentialsPath = optionalEnv("GOOGLE_APPLICATION_CREDENTIALS");
    if (!credentialsPath) {
      return { ok: false, text: "", error: "GOOGLE_APPLICATION_CREDENTIALS is not set." };
    }

    const accessToken = await getGoogleAccessToken(credentialsPath);
    const audioBytes = Buffer.from(await audio.arrayBuffer());

    const res = await fetch("https://speech.googleapis.com/v1/speech:recognize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio: { content: audioBytes.toString("base64") },
        config: {
          // WEBM_OPUS matches browser MediaRecorder output.
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          // en-IN primary; hi-IN / mr-IN handles Hindi/Marathi mix common in
          // Pune clinics (spec FAQ §4). The API picks the best-matching
          // language per utterance automatically.
          languageCode: "en-IN",
          alternativeLanguageCodes: ["hi-IN", "mr-IN"],
          // medical_dictation improves recognition of clinical terminology.
          model: "medical_dictation",
          enableAutomaticPunctuation: true,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[google-stt] request failed:", res.status, detail);
      return {
        ok: false,
        text: "",
        error: "Could not transcribe the recording. Please try again or type.",
      };
    }

    const data = (await res.json()) as {
      results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
    };

    const transcript = (data.results ?? [])
      .map((r) => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim();

    return { ok: true, text: transcript };
  } catch (err) {
    console.error("[google-stt] transcription error:", err);
    return {
      ok: false,
      text: "",
      error: "Transcription service is unavailable. Please type instead.",
    };
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function transcribeAudio(
  audio: Blob,
  filename = "dictation.webm",
): Promise<TranscriptionResult> {
  const provider = optionalEnv("SPEECH_TO_TEXT_PROVIDER", "openai");

  if (provider === "google") {
    return transcribeWithGoogle(audio);
  }

  if (provider === "openai") {
    let apiKey: string;
    try {
      apiKey = requireEnv("SPEECH_TO_TEXT_API_KEY");
    } catch {
      return { ok: false, text: "", error: "Speech-to-text is not configured." };
    }
    return transcribeWithOpenAI(audio, filename, apiKey);
  }

  return { ok: false, text: "", error: `Unsupported STT provider: ${provider}` };
}
