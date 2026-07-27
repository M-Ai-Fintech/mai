import type { TargetDossier as DossierType } from "../../../lib/api-client";

export const DOSSIER_TEXT_FIELDS = [
  ["executiveSummary", "Executive Summary"],
  ["corporateStructure", "Corporate Structure"],
  ["financialHealth", "Financial Health"],
  ["litigationRisks", "Litigation Risks"],
  ["marketPosition", "Market Position"],
] as const;

export type DossierTextField = typeof DOSSIER_TEXT_FIELDS[number][0];

export function targetDossierPayload(form: Partial<DossierType>) {
  return Object.fromEntries(
    DOSSIER_TEXT_FIELDS.map(([field]) => [field, form[field]]),
  ) as Pick<DossierType, DossierTextField>;
}
