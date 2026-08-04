import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { documentsMigration } from "./documents_0001.ts";

export const documentsMigrations: readonly ContextMigration[] = Object.freeze([
  documentsMigration,
]);

export { documentsMigration } from "./documents_0001.ts";
