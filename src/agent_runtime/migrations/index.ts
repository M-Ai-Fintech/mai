import type { ContextMigration } from "../../platform/persistence/migration.ts";
import { agentRuntimeMissionRunMigration } from "./agent_runtime_0001.ts";
import { agentRuntimeDealScopeMigration } from "./agent_runtime_0002_deal_scope.ts";

export { agentRuntimeMissionRunMigration } from "./agent_runtime_0001.ts";
export { agentRuntimeDealScopeMigration } from "./agent_runtime_0002_deal_scope.ts";

export const agentRuntimeMigrations: readonly ContextMigration[] = Object
  .freeze([agentRuntimeMissionRunMigration, agentRuntimeDealScopeMigration]);
