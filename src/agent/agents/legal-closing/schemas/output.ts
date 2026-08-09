import { z } from "zod";
import { termSheetCalculationProposalSchema } from "../../../definitions/calculation_inputs.ts";

export const outputSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  redFlags: z.array(z.string()).optional(),
  timestamp: z.string(),
  calculation: termSheetCalculationProposalSchema.optional(),
}).strict();
