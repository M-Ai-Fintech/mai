import { analyzeFinancialRisk, FinancialRiskOptions } from "./risk-command.ts";
import { checkCorporateRegistry } from "./registry-command.ts";
import { optimizeAcquisitionPortfolio } from "./portfolio-command.ts";
import { optimizeTermSheetAlternatives } from "./term-sheet-command.ts";
import {
  DocumentGenerationOptions,
  generateTermSheetDocument,
} from "./document-command.ts";

/**
 * Preserves the stable command API while delegating each responsibility.
 *
 * @example await CLICommands.checkRegistry("12345678000199");
 */
export class CLICommands {
  public static checkRegistry(cnpj: string): Promise<void> {
    return checkCorporateRegistry(cnpj);
  }

  public static analyzeRisk(options: FinancialRiskOptions): Promise<void> {
    return analyzeFinancialRisk(options);
  }

  public static optimizePortfolio(
    budget: number,
    riskTolerance: number,
  ): Promise<void> {
    return optimizeAcquisitionPortfolio(budget, riskTolerance);
  }

  public static optimizeTermSheet(): Promise<void> {
    optimizeTermSheetAlternatives();
    return Promise.resolve();
  }

  public static generateDocument(
    options: DocumentGenerationOptions,
  ): Promise<void> {
    return generateTermSheetDocument(options);
  }
}
