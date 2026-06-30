import { z } from "zod";

export const termsheetSchema = z.object({
  dealId: z.string().describe("Identificação única da transação."),
  cashPercentage: z.number().min(0).max(1).describe("Percentual pago à vista em dinheiro na data de fechamento."),
  buyerEquityShare: z.number().min(0).max(1).describe("Percentual de participação societária do comprador na Target."),
  earnOutTargetYears: z.number().min(0).max(5).describe("Período de vigência do Earn-out em anos."),
  nonCompeteMonths: z.number().min(0).max(60).describe("Período de restrição de não concorrência para fundadores em meses."),
  escrowPercentage: z.number().min(0).max(0.5).describe("Percentual do preço de compra retido em conta Escrow."),
  statutoryLimitationsMatching: z.boolean().describe("Se os prazos de liberação do Escrow coincidem com a prescrição fiscal/trabalhista brasileira."),
  arbitrationChamber: z.string().describe("Câmara de arbitragem eleita (ex: CAM-CCBC, B3, CCI)."),
  buyerUtility: z.number().describe("Utilidade calculada para o comprador sob o modelo de negociação."),
  sellerUtility: z.number().describe("Utilidade calculada para o vendedor sob o modelo de negociação."),
  redFlags: z.array(z.string()).describe("Alertas estruturais ou riscos contratuais destacados no Term Sheet."),
});
