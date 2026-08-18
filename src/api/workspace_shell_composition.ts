import {
  createDealManagementComposition,
  type DealManagementComposition,
  type DealManagementCompositionConfig,
  type DealManagementCompositionResult,
} from "../deal_management/composition.ts";
import type { WorkspaceShellRouteDependencies } from "./workspace_shell_routes.ts";

export type DealManagementInput =
  | DealManagementComposition
  | DealManagementCompositionConfig
  | DealManagementCompositionResult
  | undefined;

/** Normalizes Deal configuration before composing authenticated API routes. */
export function resolveDealManagementComposition(
  value: DealManagementInput,
): DealManagementCompositionResult {
  if (value === undefined) {
    return {
      kind: "unavailable",
      reason: "missing_configuration",
      message: "Deal Management is not configured.",
    };
  }
  if (isCompositionResult(value)) return value;
  if (isComposition(value)) return { kind: "configured", composition: value };
  return createDealManagementComposition(value);
}

/** Reuses the configured Deal authentication, policy, clock, and pool. */
export function configuredWorkspaceShell(
  dealManagement: DealManagementCompositionResult,
): WorkspaceShellRouteDependencies | undefined {
  if (dealManagement.kind !== "configured") return undefined;
  const composition = dealManagement.composition;
  return {
    authentication: composition.http.authentication,
    authorization: composition.authorization,
    query: composition.pool,
    now: composition.http.now,
    nextCorrelationId: composition.http.nextCorrelationId,
  };
}

function isCompositionResult(
  value: DealManagementInput,
): value is DealManagementCompositionResult {
  return typeof value === "object" && value !== null && "kind" in value;
}

function isComposition(
  value: DealManagementInput,
): value is DealManagementComposition {
  return typeof value === "object" && value !== null && "http" in value &&
    "pool" in value;
}
