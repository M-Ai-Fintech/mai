import type { AggregateVersion } from "../platform/api/v1.ts";
import { FinancialRiskError } from "./errors.ts";
import type { FinancialRiskInferencePort } from "./ports.ts";
import type {
  FinancialRiskCommandType,
  FinancialRiskIdempotencyClaim,
  FinancialRiskIdempotencyClaimResult,
  FinancialRiskRepository,
} from "./repository.ts";
import { FinancialRiskRepositoryConflictError } from "./repository.ts";
import type { FinancialRiskCommandRequest } from "./application_contracts.ts";
import type {
  FinancialRiskInput,
  FinancialRiskProvenance,
  FinancialRiskResult,
  FinancialRiskScope,
} from "./model.ts";
import { staleVersion } from "./application_support.ts";

export type FinancialRiskClaim = FinancialRiskIdempotencyClaimResult & {
  readonly claim: FinancialRiskIdempotencyClaim;
};

export async function safeInference(
  inference: FinancialRiskInferencePort,
  input: FinancialRiskInput,
): Promise<Awaited<ReturnType<FinancialRiskInferencePort["infer"]>>> {
  try {
    return await inference.infer(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { state: "failed", reason, provenance: failedProvenance(reason) };
  }
}

export async function claim(
  repository: FinancialRiskRepository,
  request: FinancialRiskCommandRequest,
  scope: FinancialRiskScope,
  digest: string,
): Promise<FinancialRiskClaim> {
  const commandClaim = createClaim(request, scope, digest);
  try {
    const value = await repository.claimIdempotency(commandClaim);
    return { ...value, claim: commandClaim };
  } catch (error) {
    if (isIdempotencyConflict(error)) {
      throw new FinancialRiskError("IDEMPOTENCY_CONFLICT", error.message);
    }
    throw error;
  }
}

export async function assertExpectedVersion(
  repository: FinancialRiskRepository,
  scope: FinancialRiskScope,
  assessmentId: FinancialRiskCommandRequest["assessmentId"],
  expectedVersion: AggregateVersion,
): Promise<FinancialRiskResult | undefined> {
  const latest = await repository.findLatest(scope, assessmentId);
  if (latest === undefined && expectedVersion === 1) return latest;
  if (latest !== undefined && latest.version === expectedVersion) {
    return latest;
  }
  throw staleVersion(expectedVersion, latest?.version ?? 0);
}

export async function failVersionClaim(
  repository: FinancialRiskRepository,
  claim: FinancialRiskIdempotencyClaim,
  error: unknown,
): Promise<void> {
  if (!isVersionFailure(error)) return;
  await repository.failIdempotency(claim, error.code);
}

export function normalizeCommandError(error: unknown): unknown {
  if (error instanceof FinancialRiskRepositoryConflictError) {
    return new FinancialRiskError(error.code, error.message);
  }
  if (
    error instanceof FinancialRiskError &&
    error.code === "EXACT_VERSION_MISMATCH"
  ) {
    return new FinancialRiskError("STALE_VERSION", error.message);
  }
  return error;
}

export function commandType(
  request: FinancialRiskCommandRequest,
): FinancialRiskCommandType {
  return "loadInput" in request
    ? "financial-risk.compute"
    : "financial-risk.invalidate";
}

export function executionStatus(
  state: Awaited<ReturnType<FinancialRiskInferencePort["infer"]>>["state"],
): "completed" | "failed" | "cancelled" {
  if (state === "cancelled") return "cancelled";
  if (state === "failed" || state === "unavailable") return "failed";
  return "completed";
}

function createClaim(
  request: FinancialRiskCommandRequest,
  scope: FinancialRiskScope,
  digest: string,
): FinancialRiskIdempotencyClaim {
  return {
    commandType: commandType(request),
    scope,
    actorId: request.actor.id,
    assessmentId: request.assessmentId,
    idempotencyKey: request.idempotencyKey,
    payloadDigest: digest,
  };
}

function isIdempotencyConflict(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith(
    "IDEMPOTENCY_CONFLICT",
  );
}

function isVersionFailure(
  error: unknown,
): error is FinancialRiskError & {
  readonly code: "STALE_VERSION" | "VERSION_CONFLICT";
} {
  return error instanceof FinancialRiskError &&
    (error.code === "STALE_VERSION" || error.code === "VERSION_CONFLICT");
}

function failedProvenance(reason: string): FinancialRiskProvenance {
  return {
    kind: "failed",
    reason,
    readiness: "unavailable",
    runtimeIdentity: "financial-risk-domain",
    adapterIdentity: "financial-risk-port",
  };
}
