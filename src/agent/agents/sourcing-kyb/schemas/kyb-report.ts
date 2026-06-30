import { z } from "zod";

export const kybreportSchema = z.object({
  companyName: z.string().describe("Razão social da empresa pesquisada."),
  cnpj: z.string().describe("CNPJ da empresa pesquisada."),
  registrationStatus: z.string().describe("Situação cadastral na Receita Federal (ex: ATIVA)."),
  hasCeisSanction: z.boolean().describe("Se possui alguma sanção ativa no CEIS."),
  hasCnepSanction: z.boolean().describe("Se possui alguma sanção ativa no CNEP."),
  taxDebtAmount: z.number().describe("Valor consolidado de débitos fiscais em CADIN ou PGFN."),
  keyPersonRiskScore: z.number().min(0).max(10).describe("Score de risco de dependência do fundador (0 a 10)."),
  cultureProfile: z.string().describe("Descrição resumida da cultura corporativa mapeada."),
  negotiatorFatigueFlag: z.boolean().describe("Indicador de desgaste ou fadiga de negociação detectado."),
  redFlags: z.array(z.string()).describe("Lista de alertas cadastrais ou riscos relevantes encontrados."),
});
