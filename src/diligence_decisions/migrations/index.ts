import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { diligenceDecisionsMigration } from "./diligence_decisions_0001.ts";
import { diligenceDecisionsMigration0002 } from "./diligence_decisions_0002.ts";

export const diligenceDecisionsMigrations: readonly ContextMigration[] = Object
  .freeze([diligenceDecisionsMigration, diligenceDecisionsMigration0002]);
