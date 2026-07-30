/**
 * Versioned public architecture-contract imports for MAI backend contexts.
 *
 * Future contexts import only from this module. Use its identifier parsers for
 * wire values, parseRequestContext for data-only scope, typed ports for
 * application calls, and envelope factories/parsers for `/api/v1` DTOs.
 *
 * Pagination cursors remain opaque, correlation propagates through
 * X-Correlation-Id, mutating commands carry Idempotency-Key, and mutable
 * aggregates use strong `ETag: "v<version>"` with a single If-Match value.
 * This additive surface does not migrate MVP routes; adoption is reversible by
 * removing consumer imports.
 *
 * @see backlog/docs/decisions/proposed-api-contracts/doc-33 - Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
 */
export * from "../../shared/contracts/identifiers.ts";
export * from "../../shared/contracts/request_context.ts";
export * from "../../shared/contracts/ports.ts";
export * from "../../shared/contracts/aggregate_version.ts";
export * from "../../shared/contracts/validation.ts";
export * from "./concurrency.ts";
export * from "./envelopes.ts";
export * from "./headers.ts";
