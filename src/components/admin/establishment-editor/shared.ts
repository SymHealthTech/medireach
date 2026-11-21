import type { AdminRole } from "@/lib/constants";
import type { EstablishmentForm } from "@/lib/establishments/form";
import type { EstablishmentEditorOptions } from "@/lib/establishments/options";
import type { SiteFormHints } from "@/lib/intake/hints";
import type { CardFace } from "@/components/intake/IntakeContext";

export interface EStepProps {
  form: EstablishmentForm;
  set: (patch: Partial<EstablishmentForm> | ((f: EstablishmentForm) => Partial<EstablishmentForm>)) => void;
  /** Server validation error for a field path, else a compliance issue. */
  err: (path: string) => string | undefined;
  options: EstablishmentEditorOptions;
  readOnly: boolean;
  role: AdminRole;
  /** Answers from the website form ("Get started") this draft was made from. */
  hints?: SiteFormHints;
  /** Server-rendered sample visiting cards per style code (the Design step's picker). */
  cardFaces?: Record<string, CardFace>;
}
