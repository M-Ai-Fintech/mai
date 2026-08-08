import {
  type AcceptedJobEnvelope,
  API_ERROR_CATALOG,
  createAcceptedJobEnvelope,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  type ErrorEnvelope,
  formatEtag,
} from "../../platform/api/v1.ts";
import type { AggregateVersion } from "../../platform/api/v1.ts";
import { MatchingError } from "../../matching/v1.ts";
import type {
  ActivateCriteriaInput,
  CandidateReadInput,
  CandidateReadView,
  ClearRestrictionInput,
  ConflictCommandInput,
  ConflictReadInput,
  ConflictReadView,
  CreateConflictInput,
  CreateCriteriaInput,
  MatchingService,
  OutreachCommandInput,
  RestrictionCommandInput,
  RevokeOutreachInput,
  RunExecutionInput,
  ShortlistCommandInput,
  StartRunInput,
} from "../../matching/v1.ts";
import type {
  CandidateRestriction,
  MatchingConflict,
  MatchingCriteria,
  MatchingRun,
  OutreachAuthorization,
  ShortlistDecision,
} from "../../matching/v1.ts";

export type MatchingApiResult<T> =
  | { readonly kind: "ok"; readonly value: MatchingApiView<T> }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

export interface MatchingApiView<T> {
  readonly value: T;
  readonly etag: string;
}

export type MatchingContext = Pick<
  CandidateReadInput,
  "context" | "actor"
>;

export class MatchingV1Application {
  constructor(private readonly service: MatchingService) {}

  readCandidate(
    input: CandidateReadInput,
  ): Promise<MatchingApiResult<CandidateReadView>> {
    return this.read(input, () => this.service.readCandidate(input));
  }

  readConflict(
    input: ConflictReadInput,
  ): Promise<MatchingApiResult<ConflictReadView>> {
    return this.read(input, () => this.service.readConflict(input));
  }

  createCriteria(
    input: CreateCriteriaInput,
  ): Promise<MatchingApiResult<MatchingCriteria>> {
    return this.command(input, () => this.service.createCriteria(input));
  }

  activateCriteria(
    input: ActivateCriteriaInput,
  ): Promise<MatchingApiResult<MatchingCriteria>> {
    return this.command(input, () => this.service.activateCriteria(input));
  }

  startRun(
    input: StartRunInput,
  ): Promise<
    MatchingApiResult<
      MatchingRun & {
        readonly job: import("../../matching/v1.ts").MatchingJobReceipt;
      }
    >
  > {
    return this.command(input, async () => {
      const result = await this.service.startRun(input);
      return { ...result.run, job: result.job };
    });
  }

  executeRun(
    input: RunExecutionInput,
  ): Promise<MatchingApiResult<MatchingRun>> {
    return this.command(input, () => this.service.executeRun(input));
  }

  openConflict(
    input: CreateConflictInput,
  ): Promise<MatchingApiResult<MatchingConflict>> {
    return this.command(input, () => this.service.openConflict(input));
  }

  resolveConflict(
    input: ConflictCommandInput,
  ): Promise<MatchingApiResult<MatchingConflict>> {
    return this.command(input, () => this.service.resolveConflict(input));
  }

  openRestriction(
    input: RestrictionCommandInput,
  ): Promise<MatchingApiResult<CandidateRestriction>> {
    return this.command(input, () => this.service.openRestriction(input));
  }

  clearRestriction(
    input: ClearRestrictionInput,
  ): Promise<MatchingApiResult<CandidateRestriction>> {
    return this.command(input, () => this.service.clearRestriction(input));
  }

  decideShortlist(
    input: ShortlistCommandInput,
  ): Promise<MatchingApiResult<ShortlistDecision>> {
    return this.command(input, () => this.service.decideShortlist(input));
  }

  authorizeOutreach(
    input: OutreachCommandInput,
  ): Promise<MatchingApiResult<OutreachAuthorization>> {
    return this.command(input, () => this.service.authorizeOutreach(input));
  }

  revokeOutreach(
    input: RevokeOutreachInput,
  ): Promise<MatchingApiResult<OutreachAuthorization>> {
    return this.command(input, () => this.service.revokeOutreach(input));
  }

  private async read<T extends { readonly version: number }>(
    input: { readonly context: CandidateReadInput["context"] },
    operation: () => Promise<T>,
  ): Promise<MatchingApiResult<T>> {
    try {
      const value = await operation();
      return {
        kind: "ok",
        value: { value, etag: formatEtag(versionOf(value)) },
      };
    } catch (error) {
      return {
        kind: "error",
        error: mapMatchingError(error, input.context.correlationId),
      };
    }
  }

  private async command<T extends { readonly version: number }>(
    input: { readonly context: CandidateReadInput["context"] },
    operation: () => Promise<T>,
  ): Promise<MatchingApiResult<T>> {
    try {
      const value = await operation();
      return {
        kind: "ok",
        value: { value, etag: formatEtag(versionOf(value)) },
      };
    } catch (error) {
      return {
        kind: "error",
        error: mapMatchingError(error, input.context.correlationId),
      };
    }
  }
}

export function matchingResponse<T>(
  result: MatchingApiResult<T>,
  status: number,
  correlationId: import("../../shared/contracts/identifiers.ts").CorrelationId =
    "cor_route" as import("../../shared/contracts/identifiers.ts").CorrelationId,
): Response {
  if (result.kind === "error") {
    return Response.json(result.error, {
      status: API_ERROR_CATALOG[result.error.error.code].httpStatus,
    });
  }
  return Response.json(
    createSuccessEnvelope(result.value.value, {
      correlationId,
    }),
    { status, headers: { ETag: result.value.etag } },
  );
}

export function matchingAcceptedResponse(
  result: MatchingApiResult<
    MatchingRun & {
      readonly job: import("../../matching/v1.ts").MatchingJobReceipt;
    }
  >,
  correlationId: import("../../shared/contracts/identifiers.ts").CorrelationId,
): Response {
  if (result.kind === "error") {
    return Response.json(result.error, {
      status: API_ERROR_CATALOG[result.error.error.code].httpStatus,
    });
  }
  const accepted: AcceptedJobEnvelope = createAcceptedJobEnvelope({
    operationId: result.value.value.job.operationId,
    jobId: result.value.value.job.jobId,
    status: "accepted",
    correlationId,
  });
  return Response.json(accepted, {
    status: 202,
    headers: { ETag: result.value.etag },
  });
}

function versionOf(value: { readonly version: number }): AggregateVersion {
  return value.version as AggregateVersion;
}

function mapMatchingError(
  error: unknown,
  correlationId: import("../../shared/contracts/identifiers.ts").CorrelationId,
): ErrorEnvelope {
  if (error instanceof MatchingError && error.code === "PROTECTED_NOT_FOUND") {
    return createProtectedNotFoundError(correlationId);
  }
  const code = matchingApiErrorCode(error);
  const message = error instanceof Error
    ? error.message
    : "Matching request failed.";
  return { error: { code, message, correlationId, retryable: false } };
}

function matchingApiErrorCode(
  error: unknown,
): Exclude<
  import("../../platform/api/v1.ts").ApiErrorCode,
  "PROTECTED_NOT_FOUND"
> {
  if (!(error instanceof MatchingError)) return "VALIDATION_FAILED";
  if (error.code === "VERSION_CONFLICT") return "VERSION_CONFLICT";
  if (error.code === "IDEMPOTENCY_CONFLICT") return "IDEMPOTENCY_CONFLICT";
  if (
    error.code === "INVALID_TRANSITION" || error.code === "CONFLICT_BLOCKING" ||
    error.code === "RESTRICTION_BLOCKING"
  ) return "INVALID_TRANSITION";
  if (
    error.code === "ACTION_FORBIDDEN" ||
    error.code === "HUMAN_AUTHORITY_REQUIRED"
  ) return "ACTION_FORBIDDEN";
  if (error.code === "DEPENDENCY_UNAVAILABLE") return "DEPENDENCY_UNAVAILABLE";
  return "VALIDATION_FAILED";
}
