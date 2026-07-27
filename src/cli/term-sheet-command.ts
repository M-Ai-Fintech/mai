import {
  CoverageConstraint,
  KycConstraint,
  LeverageConstraint,
  optimizeWithConstraints,
  TermSheetAlternative,
} from "../engines/optimization/index.ts";
import { t } from "../i18n/index.ts";
import { describeCommandError, printSectionHeader } from "./command-output.ts";

interface TermSheetPreferences {
  cash: number;
  equity: number;
  earnOut: number;
  escrow: number;
}

interface TermSheetScenario {
  titleKey: string;
  preferences: TermSheetPreferences;
}

const TERM_SHEET_SCENARIOS: TermSheetScenario[] = [
  {
    titleKey: "cli.messages.alt1Title",
    preferences: { cash: 0.7, equity: 0.1, earnOut: 0.1, escrow: 0.1 },
  },
  {
    titleKey: "cli.messages.alt2Title",
    preferences: { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
  },
  {
    titleKey: "cli.messages.alt3Title",
    preferences: { cash: 0.2, equity: 0.2, earnOut: 0.5, escrow: 0.1 },
  },
];

/**
 * Prints three optimized term-sheet alternatives.
 *
 * @example optimizeTermSheetAlternatives();
 */
export function optimizeTermSheetAlternatives(): void {
  printSectionHeader(t("cli.headers.optimizeTermSheet"));
  console.log(t("cli.spinners.negotiation"));
  try {
    TERM_SHEET_SCENARIOS.forEach(printTermSheetScenario);
  } catch (error) {
    console.error(
      t("cli.messages.geneticSearchError"),
      describeCommandError(error),
    );
  }
}

function printTermSheetScenario(scenario: TermSheetScenario): void {
  const bestAlternative = optimizeScenario(scenario.preferences);
  console.log(t(scenario.titleKey));
  if (!bestAlternative) {
    console.log(t("cli.messages.noViableAlternative"));
    return;
  }
  printAlternativeValues(bestAlternative);
}

function optimizeScenario(
  preferences: TermSheetPreferences,
): TermSheetAlternative | undefined {
  return optimizeWithConstraints({
    profile: { valuationMin: 80, valuationMax: 120, preferences },
    kyc: { kycBlocked: false, sanctionMatch: false, pepExposure: false },
    financial: { ebitda: 5.0, debt: 15.0, interestExpense: 1.0 },
    constraints: [
      new KycConstraint(),
      new LeverageConstraint(4.0),
      new CoverageConstraint(2.5),
    ],
    geneticConfig: { populationSize: 100, generations: 40 },
  })[0];
}

function printAlternativeValues(alternative: TermSheetAlternative): void {
  printAlternativeValue("suggestedValuation", alternative.valuation);
  printAlternativePercent("cashUpfront", alternative.cashPercentage);
  printAlternativePercent("equityRoll", alternative.equityPercentage);
  printAlternativePercent("earnOut", alternative.earnOutPercentage);
  printAlternativePercent("escrowRetention", alternative.escrowPercentage);
  console.log(t("cli.messages.fitnessIndicator", {
    val: alternative.fitness.toFixed(5),
  }));
}

function printAlternativeValue(messageKey: string, value: number): void {
  console.log(t(`cli.messages.${messageKey}`, { val: value.toFixed(2) }));
}

function printAlternativePercent(messageKey: string, value: number): void {
  printAlternativeValue(messageKey, value * 100);
}
