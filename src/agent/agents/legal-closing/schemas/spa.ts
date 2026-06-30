import { z } from "zod";

export const spaSchema = z.object({
  dealId: z.string().describe("Identificação única da transação."),
  contractType: z.enum(["SPA", "QPA", "Trespasse"]).describe("Tipo de contrato definitivo de fechamento (Contrato de Compra e Venda de Ações/Quotas ou Trespasse)."),
  purchasePriceAdjustmentType: z.enum(["Locked-Box", "Closing-Accounts"]).describe("Mecanismo de ajuste de preço (Preço Fixo / Locked-Box ou Reconciliação pós-fechamento)."),
  repsAndWarrantiesCap: z.number().describe("Limite máximo de indenização (Cap) das R&Ws em milhões."),
  basketThreshold: z.number().describe("Limite mínimo acumulado (Basket) para iniciar pedidos de indenização em milhões."),
  deMinimisThreshold: z.number().describe("Valor mínimo individual (De Minimis) para considerar um pedido de indenização em milhões."),
  escrowRetentionAmount: z.number().describe("Valor retido em conta Escrow ou Conta Notarial Vinculada em milhões."),
  survivalPeriodsMonths: z.object({
    generalCivil: z.number().describe("Prazo de sobrevivência para reclamações cíveis gerais (em meses)."),
    laborClaims: z.number().describe("Prazo de sobrevivência para passivos trabalhistas (em meses)."),
    taxLiabilities: z.number().describe("Prazo de sobrevivência para contingências tributárias (em meses)."),
  }).describe("Prazos de sobrevivência específicos por tipo de contingência."),
  disputeResolutionMethod: z.enum(["CAM-CCBC", "CAM-B3", "CCI", "Judicial-Court"]).describe("Mecanismo de resolução de disputas eleito."),
  closingConditionsPrecedent: z.array(z.string()).describe("Lista de condições precedentes finais essenciais para o fechamento."),
});
