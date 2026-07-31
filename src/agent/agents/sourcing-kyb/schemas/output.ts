import { z } from "zod";
import { targetDossierDraftSchema } from "../../../../shared/schemas/target-dossier.ts";

export const outputSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  redFlags: z.array(z.string()).optional(),
  targetDossierProposal: targetDossierDraftSchema.optional().describe(
    "Typed partial Target Dossier proposal produced by SourcingAndKYBAgent. Non-authoritative until accepted by domain services.",
  ),
  timestamp: z.string(),
});
