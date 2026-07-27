import type { Chromosome, TermSheetAlternative } from "./genetic.ts";

export function selectTermSheetAlternatives(
  chromosomes: readonly Chromosome[],
): TermSheetAlternative[] {
  const distinct = distinctAlternatives(chromosomes);
  fillAlternativeSlots(distinct, chromosomes);
  return distinct;
}

function distinctAlternatives(
  chromosomes: readonly Chromosome[],
): TermSheetAlternative[] {
  const alternatives: TermSheetAlternative[] = [];
  for (const chromosome of chromosomes) {
    if (alternatives.length >= 3) break;
    if (isDistinct(chromosome, alternatives)) {
      alternatives.push(toAlternative(chromosome));
    }
  }
  return alternatives;
}

function isDistinct(
  chromosome: Chromosome,
  alternatives: readonly TermSheetAlternative[],
): boolean {
  return alternatives.every((alternative) =>
    percentageDistance(chromosome, alternative) >= 0.1
  );
}

function percentageDistance(
  chromosome: Chromosome,
  alternative: TermSheetAlternative,
): number {
  return Math.abs(chromosome.cash - alternative.cashPercentage) +
    Math.abs(chromosome.equity - alternative.equityPercentage) +
    Math.abs(chromosome.earnOut - alternative.earnOutPercentage) +
    Math.abs(chromosome.escrow - alternative.escrowPercentage);
}

function fillAlternativeSlots(
  alternatives: TermSheetAlternative[],
  chromosomes: readonly Chromosome[],
): void {
  for (const chromosome of chromosomes) {
    if (alternatives.length >= 3) return;
    const included = alternatives.some((alternative) =>
      alternative.cashPercentage === chromosome.cash &&
      alternative.valuation === chromosome.valuation
    );
    if (!included) alternatives.push(toAlternative(chromosome));
  }
}

function toAlternative(chromosome: Chromosome): TermSheetAlternative {
  return {
    valuation: chromosome.valuation,
    cashPercentage: chromosome.cash,
    equityPercentage: chromosome.equity,
    earnOutPercentage: chromosome.earnOut,
    escrowPercentage: chromosome.escrow,
    fitness: chromosome.fitness || 0,
  };
}
