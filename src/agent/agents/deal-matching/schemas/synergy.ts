import { z } from "zod";

export const synergySchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  targetCompany: z.string().describe("Nome da empresa-alvo."),
  standaloneValue: z.number().describe("Valor standalone da empresa-alvo em milhões de reais (BRL)."),
  costSynergies: z.array(z.number()).describe("Vetor anual projetado de sinergias de custos em milhões de reais."),
  revenueSynergies: z.array(z.number()).describe("Vetor anual projetado de sinergias de receitas em milhões de reais."),
  integrationCosts: z.array(z.number()).describe("Vetor anual projetado de custos de integração em milhões de reais."),
  wacc: z.number().describe("Custo Médio Ponderado de Capital (WACC) para taxa de desconto (ex: 0.12 para 12%)."),
  taxRate: z.number().describe("Alíquota de imposto corporativo aplicável (ex: 0.34 para 34%)."),
  revenueHaircut: z.number().describe("Desconto de risco aplicado sobre as sinergias de receitas (ex: 0.40 para 40%)."),
  sharingCoefficient: z.number().describe("Coeficiente Alpha de compartilhamento de sinergia com o vendedor (ex: 0.30 para 30%)."),
  netSynergyValue: z.number().describe("Valor presente líquido das sinergias totais combinadas em milhões de reais."),
  sellerPremium: z.number().describe("Prêmio de sinergia a ser pago ao vendedor com base no coeficiente Alpha (milhões de BRL)."),
  recommendedPurchasePrice: z.number().describe("Preço de compra total recomendado (Standalone + Prêmio do Vendedor) em milhões de BRL."),
  isFeasible: z.boolean().describe("Indica se a transação é viável considerando o valor líquido de sinergias positivo."),
  comments: z.string().optional().describe("Notas e observações estratégicas adicionais sobre as sinergias."),
});
