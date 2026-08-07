import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { dealAccessMigration } from "./deal_access_0001.ts";

export { dealAccessMigration } from "./deal_access_0001.ts";

export const dealAccessMigrations: readonly ContextMigration[] = Object.freeze([
  dealAccessMigration,
]);
