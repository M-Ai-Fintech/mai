import { z } from "zod";

export const termSheetFinancialSchema = z.object({
  cashPercentage: z.number().min(0).max(1).describe("Percentual pago à vista em dinheiro na data de fechamento."),
  buyerEquityShare: z.number().min(0).max(1).describe("Percentual de participação societária do comprador na Target."),
  earnOutTargetYears: z.number().min(0).max(5).describe("Período de vigência do Earn-out em anos."),
  nonCompeteMonths: z.number().min(0).max(60).describe("Período de restrição de não concorrência para fundadores em meses."),
});

export const termSheetCoreSchema = z.object({
  dealId: z.string().describe("Identificação única da transação."),
  buyerName: z.string().describe("Razão social ou nome do comprador (Buy-Side).").optional(),
  sellerName: z.string().describe("Razão social ou nome do vendedor (Sell-Side).").optional(),
  targetName: z.string().describe("Nome ou marca da empresa-alvo da transação.").optional(),
  valuationAmount: z.number().describe("Valor total atribuído para a empresa (Enterprise Value) em milhões de reais (BRL).").optional(),
});
