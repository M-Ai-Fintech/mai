import { z } from "zod";

export const ebitdaSchema = z.object({
  reportedEbitda: z.number().describe(
    "Accounting EBITDA declared in the original financial statements of the target company.",
  ),
  proLaboreAdjustment: z.number().describe(
    "Adjustment of partners' compensation to market price for executive hiring.",
  ),
  personalExpensesAddback: z.number().describe(
    "Personal expenses of controllers paid by the company (family expenses).",
  ),
  pejotizacaoCltProvision: z.number().describe(
    "Provision for labor reclassification risks from PJ contractors to CLT regime.",
  ),
  relatedPartyRentAdjustment: z.number().describe(
    "Adjustment of rent for related parties to a fair market level.",
  ),
  capexOpexCapitalization: z.number().describe(
    "Normalization of improperly activated CAPEX or capitalized OPEX.",
  ),
  normalizedEbitda: z.number().describe(
    "Resulting normalized EBITDA after applying all adjustment lines.",
  ),
  redFlags: z.array(z.string()).describe(
    "List of inconsistencies or financial risks detected during normalization.",
  ),
});
