// src/engines/optimization/genetic.ts

export class TermSheetGeneticOptimizer {
  /**
   * Otimiza cláusulas do Term Sheet utilizando algoritmo genético.
   * Executa de forma assíncrona yieldable para não bloquear a thread principal e permitir atualização do spinner.
   * Suporta três tipos de preferências estratégicas: balanced (padrão), liquidity (foco do vendedor em caixa)
   * e retention (foco em earn-outs e retenção de risco).
   */
  public static async optimizeTermSheet(params: {
    minBuyerReservationUtility: number;
    minSellerReservationUtility: number;
    populationSize: number;
    generations: number;
    mutationRate: number;
    crossoverRate: number;
    preference?: "liquidity" | "balanced" | "retention";
  }) {
    const {
      minBuyerReservationUtility,
      minSellerReservationUtility,
      populationSize,
      generations,
      mutationRate,
      preference = "balanced",
    } = params;

    const calculateUtilities = (c: {
      cashPercentage: number;
      buyerEquityShare: number;
      earnOutTargetYears: number;
      nonCompeteMonths: number;
    }) => {
      let uS = 0.4 * c.cashPercentage +
               0.3 * (1 - c.buyerEquityShare) +
               0.15 * ((5 - c.earnOutTargetYears) / 4) +
               0.15 * ((60 - c.nonCompeteMonths) / 48);
      let uB = 0.35 * (1 - c.cashPercentage) +
               0.35 * c.buyerEquityShare +
               0.15 * ((c.earnOutTargetYears - 1) / 4) +
               0.15 * ((c.nonCompeteMonths - 12) / 48);

      if (preference === "liquidity") {
        // Seller strongly values cash percentage, buyer values lower cash upfront
        uS = 0.7 * c.cashPercentage +
             0.1 * (1 - c.buyerEquityShare) +
             0.1 * ((5 - c.earnOutTargetYears) / 4) +
             0.1 * ((60 - c.nonCompeteMonths) / 48);
        uB = 0.5 * (1 - c.cashPercentage) +
             0.3 * c.buyerEquityShare +
             0.1 * ((c.earnOutTargetYears - 1) / 4) +
             0.1 * ((c.nonCompeteMonths - 12) / 48);
      } else if (preference === "retention") {
        // Higher utility for longer earn-outs, non-competes, and buyer equity share
        uS = 0.2 * c.cashPercentage +
             0.3 * (1 - c.buyerEquityShare) +
             0.25 * ((5 - c.earnOutTargetYears) / 4) +
             0.25 * ((60 - c.nonCompeteMonths) / 48);
        uB = 0.2 * (1 - c.cashPercentage) +
             0.2 * c.buyerEquityShare +
             0.3 * ((c.earnOutTargetYears - 1) / 4) +
             0.3 * ((c.nonCompeteMonths - 12) / 48);
      }

      return { uS, uB };
    };

    const fitness = (c: {
      cashPercentage: number;
      buyerEquityShare: number;
      earnOutTargetYears: number;
      nonCompeteMonths: number;
    }) => {
      const { uS, uB } = calculateUtilities(c);
      if (uS < minSellerReservationUtility || uB < minBuyerReservationUtility) {
        return 0;
      }
      return (uS - minSellerReservationUtility) * (uB - minBuyerReservationUtility);
    };

    const rand = () => ({
      cashPercentage: 0.1 + Math.random() * 0.9,
      buyerEquityShare: 0.1 + Math.random() * 0.9,
      earnOutTargetYears: 1.0 + Math.random() * 4.0,
      nonCompeteMonths: Math.floor(12 + Math.random() * 49),
    });

    let pop = Array.from({ length: populationSize }, () => {
      const c = rand();
      return { c, f: fitness(c) };
    });

    for (let g = 0; g < generations; g++) {
      // Yield periodicamente para o Deno Event Loop (a cada 10 gerações) para não bloquear spinners
      if (g % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      pop.sort((a, b) => b.f - a.f);
      const next: typeof pop = pop.slice(0, Math.floor(populationSize * 0.2));
      while (next.length < populationSize) {
        const pA = pop[Math.floor(Math.random() * pop.length * 0.5)].c;
        const pB = pop[Math.floor(Math.random() * pop.length * 0.5)].c;
        const child = {
          cashPercentage: (pA.cashPercentage + pB.cashPercentage) / 2,
          buyerEquityShare: (pA.buyerEquityShare + pB.buyerEquityShare) / 2,
          earnOutTargetYears: (pA.earnOutTargetYears + pB.earnOutTargetYears) / 2,
          nonCompeteMonths: Math.round((pA.nonCompeteMonths + pB.nonCompeteMonths) / 2),
        };
        if (Math.random() < mutationRate) child.cashPercentage = Math.min(1.0, Math.max(0.1, child.cashPercentage + (Math.random() - 0.5) * 0.2));
        if (Math.random() < mutationRate) child.buyerEquityShare = Math.min(1.0, Math.max(0.1, child.buyerEquityShare + (Math.random() - 0.5) * 0.2));
        if (Math.random() < mutationRate) child.earnOutTargetYears = Math.min(5.0, Math.max(1.0, child.earnOutTargetYears + (Math.random() - 0.5) * 1.0));
        if (Math.random() < mutationRate) child.nonCompeteMonths = Math.min(60, Math.max(12, Math.round(child.nonCompeteMonths + (Math.random() - 0.5) * 12)));
        next.push({ c: child, f: fitness(child) });
      }
      pop = next;
    }

    pop.sort((a, b) => b.f - a.f);
    const best = pop[0];
    const { uS, uB } = calculateUtilities(best.c);

    return {
      bestProposal: {
        cashPercentage: parseFloat(best.c.cashPercentage.toFixed(2)),
        buyerEquityShare: parseFloat(best.c.buyerEquityShare.toFixed(2)),
        earnOutTargetYears: parseFloat(best.c.earnOutTargetYears.toFixed(1)),
        nonCompeteMonths: best.c.nonCompeteMonths,
      },
      buyerUtility: parseFloat(uB.toFixed(3)),
      sellerUtility: parseFloat(uS.toFixed(3)),
      fitness: parseFloat(best.f.toFixed(4)),
    };
  }
}
