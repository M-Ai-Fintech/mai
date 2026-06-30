import { z } from "zod";

export const ebitdaSchema = z.object({
  reportedEbitda: z.number().describe("EBITDA contábil declarado nos demonstrativos originais da empresa alvo."),
  proLaboreAdjustment: z.number().describe("Ajuste de pró-labore dos sócios para preço de mercado de contratação executiva."),
  personalExpensesAddback: z.number().describe("Despesas pessoais dos controladores pagas pela empresa (despesas familiares)."),
  pejotizacaoCltProvision: z.number().describe("Provisão de riscos de reclassificação trabalhista de prestadores PJ para regime CLT."),
  relatedPartyRentAdjustment: z.number().describe("Ajuste de aluguel de partes relacionadas para patamar justo de mercado."),
  capexOpexCapitalization: z.number().describe("Normalização de CAPEX indevidamente ativado ou OPEX capitalizado."),
  normalizedEbitda: z.number().describe("EBITDA normalizado resultante após aplicação de todas as linhas de ajuste."),
  redFlags: z.array(z.string()).describe("Lista de inconsistências ou riscos financeiros detectados durante a normalização."),
});
