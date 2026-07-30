/**
 * Versioned public persistence foundation for context migrations,
 * transactions, optimistic concurrency, and idempotency.
 *
 * @example import { defineMigration } from "./src/platform/persistence/v1.ts"
 */
export * from "./migration.ts";
export * from "./migration_runner.ts";
export * from "./transaction.ts";
export * from "./concurrency.ts";
export * from "./idempotency.ts";
export * from "./migrations.ts";
