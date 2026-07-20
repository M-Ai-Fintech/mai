import { z } from "zod";
import { termSheetFinancialSchema } from "../../../../shared/schemas/term-sheet.ts";

export const termsheetSchema = termSheetFinancialSchema.extend({
  dealId: z.string().describe("Identificação única da transação."),
  escrowPercentage: z.number().min(0).max(0.5).describe("Percentual do preço de compra retido em conta Escrow."),
  statutoryLimitationsMatching: z.boolean().describe("Se os prazos de liberação do Escrow coincidem com a prescrição fiscal/trabalhista brasileira."),
  arbitrationChamber: z.enum(["CAM-CCBC", "CAM-B3", "CCI", "FGV", "Judicial-Court", "Other"]).describe("Câmara de arbitragem eleita (ex: CAM-CCBC, B3, CCI)."),
  buyerUtility: z.number().describe("Utilidade calculada para o comprador sob o modelo de negociação."),
  sellerUtility: z.number().describe("Utilidade calculada para o vendedor sob o modelo de negociação."),
  redFlags: z.array(z.string()).describe("Alertas estruturais ou riscos contratuais destacados no Term Sheet."),
});
