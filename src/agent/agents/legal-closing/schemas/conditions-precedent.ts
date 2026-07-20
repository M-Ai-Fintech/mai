import { z } from "zod";
import { domainAreaSchema } from "../../../../shared/schemas/domain-area.ts";

export const conditionsprecedentSchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  conditions: z.array(
    z.object({
      id: z.string().describe("Identificador único da Condição Precedente."),
      description: z.string().describe("Detalhamento literal do evento ou validação exigida (ex: Aprovação no CADE)."),
      category: domainAreaSchema.describe("Categoria regulatória ou operacional da Condição Precedente."),
      responsibleParty: z.enum(["buyer", "seller", "mutual"]).describe("Parte contratante responsável pelo cumprimento da CP."),
      status: z.enum(["pending", "fulfilled", "waived"]).describe("Estado atual de cumprimento da CP."),
      deadline: z.string().optional().describe("Data limite para cumprimento no formato ISO (YYYY-MM-DD) ou prazo contratual."),
      comments: z.string().optional().describe("Notas, anexos de VDR vinculados ou motivos de waiver da CP."),
    })
  ).describe("Checklist estruturado de Condições Precedentes exigidas para o fechamento do deal."),
  allFulfilled: z.boolean().describe("Indica se todas as CPs não canceladas/waived foram totalmente cumpridas, liberando o fechamento do SPA."),
});
