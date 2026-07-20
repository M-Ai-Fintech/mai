import { z } from "zod";
import { termSheetCoreSchema, termSheetFinancialSchema } from "../../../../shared/schemas/term-sheet.ts";

export const termsheetSchema = termSheetCoreSchema.extend({
  proposal: termSheetFinancialSchema.describe("Configurações financeiras e operacionais otimizadas para as cláusulas."),
  governingLaw: z.string().default("Brazil").describe("Legislação governante do contrato e foro de eleição."),
  exclusivityPeriodDays: z.number().describe("Prazo concedido de exclusividade para due diligence e negociações (em dias)."),
  confidentialityAgreed: z.boolean().describe("Indica se cláusula estrita de confidencialidade foi incorporada."),
  bindingClauses: z.array(z.string()).describe("Lista de cláusulas com efeito vinculante imediato (ex: exclusividade, confidencialidade, custos)."),
});
