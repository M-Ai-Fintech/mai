import { z } from "zod";

export const vdrrequestSchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  requester: z.string().describe("Identidade do agente ou serviço solicitante (ex: LegalDueDiligenceAgent)."),
  requestedCategories: z.array(z.string()).describe("Lista de categorias gerais solicitadas (ex: ['fiscal', 'trabalhista'])."),
  items: z.array(
    z.object({
      categoryId: z.string().describe("ID da pasta ou categoria do VDR."),
      documentName: z.string().describe("Nome ou descrição precisa do documento solicitado (ex: CNDT, Contrato Social)."),
      urgency: z.enum(["low", "medium", "high"]).describe("Nível de prioridade para a análise do documento."),
      status: z.enum(["requested", "received", "rejected"]).describe("Status atual da entrega pelo vendedor no VDR."),
      uploadedAt: z.string().optional().describe("Data do envio do documento no formato ISO (YYYY-MM-DD) se já recebido."),
      notes: z.string().optional().describe("Observações ou justificativas de rejeição ou atraso."),
    })
  ).describe("Detalhamento individualizado de cada item de informação solicitado ao VDR."),
});
