import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { valuationMigration } from "./valuation_0001.ts";

export { valuationMigration } from "./valuation_0001.ts";

export const valuationMigrations: readonly ContextMigration[] = Object.freeze([
  valuationMigration,
]);
