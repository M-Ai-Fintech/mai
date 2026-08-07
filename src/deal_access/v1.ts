/**
 * Versioned Deal Access contracts for participation, purpose-bound grants,
 * and safe external portal access.
 *
 * @example import { DealAccessService } from "./src/deal_access/v1.ts";
 */
export * from "./ids.ts";
export * from "./errors.ts";
export * from "./model.ts";
export * from "./lifecycle.ts";
export * from "./portal_fields.ts";
export * from "./policy.ts";
export * from "./projection.ts";
export * from "./portal.ts";
export * from "./events.ts";
export * from "./repository.ts";
export * from "./repository_postgres.ts";
export * from "./service.ts";
export * from "./migrations/index.ts";

export const DEAL_ACCESS_API_VERSION = "v1" as const;
export const DEAL_ACCESS_EVENT_SCHEMA_VERSION = 1 as const;
