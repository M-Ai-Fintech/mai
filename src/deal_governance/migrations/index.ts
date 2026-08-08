import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { dealGovernanceMigration } from "./deal_governance_0001.ts";
import {
  dealGovernanceConsequencePreviewsMigration,
} from "./deal_governance_0002.ts";

export const dealGovernanceMigrations: readonly ContextMigration[] = Object
  .freeze([
    dealGovernanceMigration,
    dealGovernanceConsequencePreviewsMigration,
  ]);

export { dealGovernanceMigration } from "./deal_governance_0001.ts";
export {
  dealGovernanceConsequencePreviewsMigration,
} from "./deal_governance_0002.ts";
