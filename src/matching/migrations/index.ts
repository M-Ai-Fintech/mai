import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { matchingMigration } from "./matching_0001.ts";

export const matchingMigrations: readonly ContextMigration[] = Object.freeze([
  matchingMigration,
]);

export { matchingMigration } from "./matching_0001.ts";
