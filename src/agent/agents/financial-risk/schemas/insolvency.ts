import { z } from "zod";

export const insolvencySchema = z.object({
  insolvencyRiskScore: z.number().min(0).max(1).describe("Probabilidade calculada de insolvência financeira (de 0 a 1)."),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).describe("Classificação qualitativa do nível de risco financeiro."),
  kanitzTermometroScore: z.number().describe("Resultado numérico do Termômetro de Kanitz (Fator Z)."),
  elizabetskyScore: z.number().describe("Resultado numérico do Fator de Insolvência do Modelo de Elizabetsky."),
  altmanZDoublePrimeScore: z.number().describe("Resultado numérico do Altman Z-Score adaptado para empresas não listadas no Brasil."),
  distressWarning: z.boolean().describe("Indicador de perigo iminente de insolvência ou necessidade de reestruturação/recuperação."),
  mitigations: z.array(z.string()).describe("Ações recomendadas de mitigação de endividamento e renegociação de covenants."),
});
