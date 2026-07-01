import { z } from "zod";

export const valuationSchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  targetCompany: z.string().describe("Nome da empresa-alvo analisada."),
  ebitda: z.number().describe("EBITDA de referência para o valuation em milhões de reais (BRL)."),
  revenue: z.number().describe("Receita líquida de referência em milhões de reais."),
  suggestedMultiple: z.number().describe("Múltiplo de EV/EBITDA sugerido ou praticado para o setor no Brasil."),
  ev: z.number().describe("Enterprise Value estimado resultante em milhões de reais."),
  netDebt: z.number().describe("Dívida líquida atual (Dívida total - Caixa e equivalentes) em milhões de reais."),
  equityValue: z.number().describe("Equity Value resultante (EV - Dívida Líquida) em milhões de reais."),
  valuationMethod: z.enum(["DCF", "Multiples", "LBO", "Asset-Based"]).describe("Método principal de valuation adotado."),
  discountRate: z.number().describe("Taxa de desconto ou WACC utilizada na modelagem (ex: 0.12 para 12%)."),
  perpetualGrowthRate: z.number().describe("Taxa de crescimento na perpetuidade (g) adotada (ex: 0.03 para 3%)."),
  valuationRange: z.object({
    min: z.number().describe("Valor mínimo estimado da faixa de valuation em milhões de reais."),
    max: z.number().describe("Valor máximo estimado da faixa de valuation em milhões de reais."),
  }).describe("Faixa de valuation aceitável para mitigar fadiga de negociação."),
  illiquidityDiscount: z.number().describe("Desconto de iliquidez aplicado ao deal (ex: 0.20 para 20%)."),
  controlPremium: z.number().describe("Prêmio de controle adicionado ao deal (ex: 0.15 para 15%)."),
  notes: z.string().optional().describe("Observações sobre premissas e normalizações de EBITDA (QoE)."),
});
