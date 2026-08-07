import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { dealGovernanceMigration } from "./deal_governance_0001.ts";

export const dealGovernanceMigrations: readonly ContextMigration[] = Object
  .freeze([
    dealGovernanceMigration,
  ]);

export { dealGovernanceMigration } from "./deal_governance_0001.ts";
