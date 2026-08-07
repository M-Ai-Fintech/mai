import type { ContextMigration } from "../../platform/persistence/migration.ts";
import { agentRuntimeMissionRunMigration } from "./agent_runtime_0001.ts";

export { agentRuntimeMissionRunMigration } from "./agent_runtime_0001.ts";

export const agentRuntimeMigrations: readonly ContextMigration[] = Object
  .freeze([agentRuntimeMissionRunMigration]);
