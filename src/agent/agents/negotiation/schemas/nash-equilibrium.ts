import { z } from "zod";

export const nashequilibriumSchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  buyerReservationUtility: z.number().describe("Utilidade de reserva mínima aceitável para o comprador (ex: 0.3)."),
  sellerReservationUtility: z.number().describe("Utilidade de reserva mínima aceitável para o vendedor (ex: 0.3)."),
  payoffMatrix: z.array(
    z.object({
      round: z.number().describe("Número da rodada da negociação."),
      proposal: z.object({
        cashPercentage: z.number().describe("Percentual pago em dinheiro (Cash) no fechamento (ex: 0.6 para 60%)."),
        buyerEquityShare: z.number().describe("Percentual de participação acionária transferida (ex: 0.2 para 20%)."),
        earnOutTargetYears: z.number().describe("Período de metas de earn-out em anos (ex: 3.0 anos)."),
        nonCompeteMonths: z.number().describe("Prazo da cláusula de não-concorrência em meses (ex: 60 meses)."),
      }).describe("Proposta de estrutura da transação avaliada nesta rodada."),
      buyerUtility: z.number().describe("Utilidade calculada para o comprador (0.0 a 1.0)."),
      sellerUtility: z.number().describe("Utilidade calculada para o vendedor (0.0 a 1.0)."),
      fitness: z.number().describe("Fitness de Nash para otimização bilateral (U_B - min)*(U_S - min) ou 0 se inviável."),
    })
  ).describe("Matriz histórica e iterativa das rodadas de negociação e utilidades calculadas."),
  nashEquilibriumAchieved: z.boolean().describe("Informa se um ponto de equilíbrio viável e aceitável por ambas as partes foi atingido."),
  optimalProposal: z.object({
    cashPercentage: z.number().describe("Percentual em dinheiro da melhor proposta encontrada."),
    buyerEquityShare: z.number().describe("Participação societária da melhor proposta encontrada."),
    earnOutTargetYears: z.number().describe("Meta de earn-out em anos da melhor proposta encontrada."),
    nonCompeteMonths: z.number().describe("Prazo de não-concorrência em meses da melhor proposta encontrada."),
  }).describe("A proposta ótima de Term Sheet que maximiza o produto de Nash das utilidades."),
  comments: z.string().optional().describe("Justificativa e notas analíticas sobre a convergência do equilíbrio."),
});
