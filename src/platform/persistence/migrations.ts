import { ContextMigration } from "./migration.ts";
import { platformIdempotencyMigration } from "./migrations/platform_0001_idempotency.ts";
import { platformOutboxMigration } from "./migrations/platform_0002_outbox.ts";
import { platformInboxMigration } from "./migrations/platform_0003_inbox.ts";
import { platformJobsMigration } from "./migrations/platform_0004_jobs.ts";

export const platformMigrations: readonly ContextMigration[] = Object.freeze([
  platformIdempotencyMigration,
  platformOutboxMigration,
  platformInboxMigration,
  platformJobsMigration,
]);
