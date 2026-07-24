import { z } from "zod";
import {
  termSheetCoreSchema,
  termSheetFinancialSchema,
} from "../../../../shared/schemas/term-sheet.ts";

export const termsheetSchema = termSheetCoreSchema.extend({
  proposal: termSheetFinancialSchema.describe(
    "Financial terms of the proposal.",
  ),
  governingLaw: z.string().default("Brazil").describe(
    "Governing law and jurisdiction.",
  ),
  exclusivityPeriodDays: z.number().describe(
    "Number of days for exclusivity period.",
  ),
  confidentialityAgreed: z.boolean().describe(
    "Whether confidentiality is agreed.",
  ),
  bindingClauses: z.array(z.string()).describe("Clauses that are binding."),
});
