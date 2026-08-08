import type { ContextMigration } from "../../platform/persistence/migration.ts";
import { deliverablesMigration } from "./deliverables_0001.ts";

export { deliverablesMigration } from "./deliverables_0001.ts";

export const deliverablesMigrations: readonly ContextMigration[] = Object
  .freeze([
    deliverablesMigration,
  ]);
