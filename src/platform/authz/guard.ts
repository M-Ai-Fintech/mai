import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../api/envelopes.ts";
import { evaluateAuthorization } from "./evaluator.ts";
import type {
  ApprovedScopeToken,
  AuthorizationDecision,
  AuthorizationRequest,
} from "./vocabulary.ts";

export interface ScopedLoader<T> {
  load(scope: ApprovedScopeToken): Promise<T | undefined>;
}

export type GuardedLoadResult<T> =
  | {
    readonly kind: "loaded";
    readonly value: T;
    readonly decision: AuthorizationDecision;
  }
  | { readonly kind: "protected_not_found"; readonly response: ErrorEnvelope };

/**
 * Evaluates trusted scope before a protected target can be loaded.
 *
 * @example await guardedLoad(request, scopedDealLoader)
 */
export async function guardedLoad<T>(
  request: AuthorizationRequest,
  loader: ScopedLoader<T>,
): Promise<GuardedLoadResult<T>> {
  const decision = evaluateAuthorization(request);
  if (decision.outcome === "deny") return protectedNotFound(request);
  const value = await loader.load(decision.approvedScope);
  return value === undefined
    ? protectedNotFound(request)
    : { kind: "loaded", value, decision };
}

function protectedNotFound(
  request: AuthorizationRequest,
): GuardedLoadResult<never> {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(request.context.correlationId),
  };
}
