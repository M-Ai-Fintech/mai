import {
  type CorrelationId,
  type IdempotencyKey,
  parseCorrelationId,
  parseIdempotencyKey,
  type ParseResult,
} from "../../shared/contracts/identifiers.ts";

export const CORRELATION_HEADER = "X-Correlation-Id";
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

export interface CorrelationIdGenerator {
  next(): CorrelationId;
}

export function parseCorrelationHeader(
  value: unknown,
): ParseResult<CorrelationId> {
  return parseCorrelationId(value);
}

export function parseIdempotencyHeader(
  value: unknown,
): ParseResult<IdempotencyKey> {
  return parseIdempotencyKey(value);
}
