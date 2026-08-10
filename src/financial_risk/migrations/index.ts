import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { financialRiskMigration } from "./financial_risk_0001.ts";

export { financialRiskMigration } from "./financial_risk_0001.ts";

export const financialRiskMigrations: readonly ContextMigration[] = Object
  .freeze([
    financialRiskMigration,
  ]);
