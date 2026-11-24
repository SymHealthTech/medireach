"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UploadSigner } from "@/lib/client/upload-image";
import type { IntakeKind } from "@/lib/constants";

/** Sample visiting cards for one style, server-rendered: a small preview, and the full phone and print cards. */
export interface CardFace {
  thumb: ReactNode;
  phone: ReactNode;
  print: ReactNode;
}

/** What fields deep in the form need from the form itself (uploads, server-rendered card previews). */
export interface IntakeContextValue {
  /** Photos need a saved form; saves it first (false if it can't). */
  ensureSaved: () => Promise<boolean>;
  sign: UploadSigner;
  /** Card style code → sample cards. Without them the picker shows colour swatches. */
  cardFaces?: Record<string, CardFace>;
  errors: Record<string, string>;
  /** Which form this is (picks the suggestion lists). */
  kind?: IntakeKind;
  /** The whole form's answers (suggestions inside a doctor card follow the clinic type or specialty). */
  data?: Record<string, unknown>;
  /** City name → its area names (the admin master lists), for the city and area dropdowns. */
  places?: Record<string, string[]>;
  /** Clinic types from the live category list (value = category slug), with "Other" last. */
  clinicTypes?: readonly { value: string; label: string }[];
}

const Ctx = createContext<IntakeContextValue | null>(null);

export const IntakeContextProvider = Ctx.Provider;

/** The form context, or null outside a form (the pickers on the product pages). */
export const useOptionalIntakeContext = (): IntakeContextValue | null => useContext(Ctx);

export function useIntakeContext(): IntakeContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIntakeContext outside IntakeForm");
  return v;
}
