import { z } from "zod";

export const contractanalysisSchema = z.object({
  contractTitle: z.string().describe("Título ou identificação do contrato analisado."),
  counterparty: z.string().describe("Nome da contraparte no contrato."),
  hasChangeOfControlClause: z.boolean().describe("Se há cláusula expressa de alteração de controle acionário."),
  requiresConsentForAssignment: z.boolean().describe("Se exige consentimento prévio para cessão do contrato."),
  noticePeriodDays: z.number().describe("Prazo mínimo de notificação para encerramento sem justa causa (em dias)."),
  hasNonCompeteOrExclusivity: z.boolean().describe("Se possui cláusula de exclusividade ou restrição de não concorrência."),
  arbitrationChamber: z.string().describe("Câmara arbitral eleita para resolução de disputas (ex: CAM-CCBC, B3)."),
  riskRating: z.enum(["low", "medium", "high", "critical"]).describe("Classificação do nível de risco contratual."),
  recommendations: z.array(z.string()).describe("Lista de recomendações de renegociação ou notificações regulatórias."),
});
