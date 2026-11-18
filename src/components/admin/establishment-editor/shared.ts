import type { AdminRole } from "@/lib/constants";
import type { EstablishmentForm } from "@/lib/establishments/form";
import type { EstablishmentEditorOptions } from "@/lib/establishments/options";

export interface EStepProps {
  form: EstablishmentForm;
  set: (patch: Partial<EstablishmentForm> | ((f: EstablishmentForm) => Partial<EstablishmentForm>)) => void;
  /** Server validation error for a field path, else a compliance issue. */
  err: (path: string) => string | undefined;
  options: EstablishmentEditorOptions;
  readOnly: boolean;
  role: AdminRole;
}
