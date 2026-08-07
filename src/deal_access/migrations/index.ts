import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { dealAccessMigration } from "./deal_access_0001.ts";
import { dealAccessMigration0002 } from "./deal_access_0002.ts";

export { dealAccessMigration } from "./deal_access_0001.ts";
export { dealAccessMigration0002 } from "./deal_access_0002.ts";

export const dealAccessMigrations: readonly ContextMigration[] = Object.freeze([
  dealAccessMigration,
  dealAccessMigration0002,
]);
