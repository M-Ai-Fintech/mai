import { z } from "zod";

export const termsheetSchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  buyerName: z.string().describe("Razão social ou nome do comprador (Buy-Side)."),
  sellerName: z.string().describe("Razão social ou nome do vendedor (Sell-Side)."),
  targetName: z.string().describe("Nome ou marca da empresa-alvo da transação."),
  valuationAmount: z.number().describe("Valor total atribuído para a empresa (Enterprise Value) em milhões de reais (BRL)."),
  proposal: z.object({
    cashPercentage: z.number().describe("Percentual pago à vista em dinheiro na data de fechamento."),
    buyerEquityShare: z.number().describe("Participação societária transferida no fechamento."),
    earnOutTargetYears: z.number().describe("Duração total das metas do earn-out em anos."),
    nonCompeteMonths: z.number().describe("Duração da restrição de não-concorrência do fundador em meses."),
  }).describe("Configurações financeiras e operacionais otimizadas para as cláusulas."),
  governingLaw: z.string().default("Brazil").describe("Legislação governante do contrato e foro de eleição."),
  exclusivityPeriodDays: z.number().describe("Prazo concedido de exclusividade para due diligence e negociações (em dias)."),
  confidentialityAgreed: z.boolean().describe("Indica se cláusula estrita de confidencialidade foi incorporada."),
  bindingClauses: z.array(z.string()).describe("Lista de cláusulas com efeito vinculante imediato (ex: exclusividade, confidencialidade, custos)."),
});
