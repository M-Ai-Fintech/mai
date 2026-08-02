import type { ContextMigration } from "../../platform/persistence/migration.ts";
import { auditActivityEventsMigration } from "./audit_0001_events_and_redactions.ts";

export { auditActivityEventsMigration } from "./audit_0001_events_and_redactions.ts";

export const auditActivityMigrations: readonly ContextMigration[] = Object
  .freeze([
    auditActivityEventsMigration,
  ]);
