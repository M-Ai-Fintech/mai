import { z } from "zod";
import { matchingCalculationProposalSchema } from "../../../definitions/calculation_inputs.ts";

export const outputSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  redFlags: z.array(z.string()).optional(),
  timestamp: z.string(),
  calculation: matchingCalculationProposalSchema.optional(),
}).strict();
