import {
  type AggregateVersion,
  createApiError,
  createSuccessEnvelope,
  type ErrorEnvelope,
  parseIdempotencyHeader,
  parseIfMatch,
} from "../../platform/api/v1.ts";
import { parseCorrelationHeader } from "../../platform/api/headers.ts";
import type {
  CorrelationId,
  IdempotencyKey,
} from "../../shared/contracts/identifiers.ts";
import type { GovernanceAction } from "../../deal_governance/model.ts";
import type { ConsequencePreview } from "../../deal_governance/model.ts";
import type { DeletionImpact } from "../../deal_governance/deletion.ts";
import type { ErasureGate } from "../../deal_governance/orchestration.ts";
import {
  type DeletionRequestId,
  deletionRequestId,
  type LegalHoldId,
  legalHoldId,
  type OrchestrationId,
  orchestrationId,
} from "../../deal_governance/ids.ts";
import type { RetentionAssignment } from "../../deal_governance/retention.ts";
import type { GovernanceCommandContext } from "../../deal_governance/service_contracts.ts";
import {
  type DealGovernanceApiCommand,
  DealGovernanceV1Application,
  etagForGovernanceValue,
} from "./deal_governance.ts";

const BASE_PATH = "/api/v1/deal-governance";

export interface DealGovernanceRequestContextPort {
  contextFor(
    request: Request,
  ): Promise<GovernanceCommandContext> | GovernanceCommandContext;
}

export interface DealGovernanceV1RouteDependencies {
  readonly context: DealGovernanceRequestContextPort;
  readonly application: DealGovernanceV1Application;
}

export async function handleDealGovernanceV1Route(
  request: Request,
  dependencies: DealGovernanceV1RouteDependencies,
): Promise<Response | null> {
  const route = parseRoute(new URL(request.url).pathname);
  if (route === undefined) return null;
  const context = await requestContext(request, dependencies.context);
  if (context.kind === "error") return errorResponse(context.error);
  if (route.kind === "read") {
    if (request.method === "GET") {
      return resultResponse(
        await dependencies.application.read(context.value),
        context.value,
      );
    }
    if (request.method === "POST") {
      const result = await runPost(
        request,
        context.value,
        { kind: "create" },
        dependencies.application,
      );
      return result instanceof Response
        ? result
        : resultResponse(result, context.value, 201);
    }
    return methodNotAllowed(["GET"]);
  }
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  const result = await runPost(
    request,
    context.value,
    route,
    dependencies.application,
  );
  return result instanceof Response ? result : resultResponse(
    result,
    context.value,
    route.kind === "create" ? 201 : 200,
  );
}

type Route =
  | { readonly kind: "read" }
  | { readonly kind: "create" }
  | { readonly kind: "preview"; readonly action: GovernanceAction }
  | { readonly kind: "transition"; readonly action: GovernanceAction }
  | { readonly kind: "retention" }
  | { readonly kind: "place_hold" }
  | { readonly kind: "release_hold"; readonly holdId: LegalHoldId }
  | { readonly kind: "create_deletion" }
  | { readonly kind: "assess_impact"; readonly requestId: DeletionRequestId }
  | { readonly kind: "submit_deletion"; readonly requestId: DeletionRequestId }
  | { readonly kind: "decide_deletion"; readonly requestId: DeletionRequestId }
  | { readonly kind: "cancel_deletion"; readonly requestId: DeletionRequestId }
  | { readonly kind: "start_orchestration" }
  | {
    readonly kind: "resume_orchestration";
    readonly orchestrationId: OrchestrationId;
  };

async function runPost(
  request: Request,
  context: GovernanceCommandContext,
  route: Exclude<Route, { readonly kind: "read" }>,
  application: DealGovernanceV1Application,
): Promise<
  Response | Awaited<ReturnType<DealGovernanceV1Application["command"]>>
> {
  if (route.kind === "preview") {
    return await application.command(context, {
      kind: "preview",
      action: route.action,
    });
  }
  const idempotency = parseIdempotencyHeader(
    request.headers.get("Idempotency-Key"),
  );
  if (!idempotency.ok) {
    return validationResponse(
      context,
      "Idempotency-Key",
      "Expected a valid idempotency key.",
    );
  }
  const body = await requestBody(request);
  if (body === undefined) {
    return validationResponse(
      context,
      "body",
      "Expected a JSON object payload.",
    );
  }
  const command = commandForRoute(request, route, idempotency.value, body);
  if (command.kind === "error") {
    return errorResponse(
      withCorrelation(command.error, context.request.correlationId),
    );
  }
  return await application.command(context, command.value);
}

function commandForRoute(
  request: Request,
  route: Exclude<Route, { readonly kind: "read" | "preview" }>,
  idempotencyKey: IdempotencyKey,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  if (route.kind === "create") {
    return { kind: "ok", value: { kind: "create", idempotencyKey } };
  }
  if (route.kind === "place_hold") {
    return placeHoldCommand(idempotencyKey, body);
  }
  if (route.kind === "start_orchestration") {
    return startOrchestrationCommand(idempotencyKey, body);
  }
  if (route.kind === "create_deletion") {
    return createDeletionCommand(request, idempotencyKey, body);
  }
  if (route.kind === "retention") {
    return retentionCommand(request, idempotencyKey, body);
  }
  if (route.kind === "transition") {
    return transitionCommand(request, idempotencyKey, route.action, body);
  }
  if (route.kind === "release_hold") {
    return releaseHoldCommand(request, idempotencyKey, route.holdId);
  }
  if (route.kind === "assess_impact") {
    return impactCommand(request, idempotencyKey, route.requestId, body);
  }
  if (route.kind === "submit_deletion") {
    return versionedCommand(
      request,
      idempotencyKey,
      "submit_deletion",
      route.requestId,
    );
  }
  if (route.kind === "cancel_deletion") {
    return versionedCommand(
      request,
      idempotencyKey,
      "cancel_deletion",
      route.requestId,
    );
  }
  if (route.kind === "decide_deletion") {
    return decisionCommand(request, idempotencyKey, route.requestId, body);
  }
  return resumeCommand(request, idempotencyKey, route.orchestrationId);
}

function placeHoldCommand(
  idempotencyKey: IdempotencyKey,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const categories = textArray(body.categories, "categories");
  const reason = textValue(body.reason, "reason");
  if (categories === undefined || reason === undefined) {
    return invalidPayload("categories and reason are required.");
  }
  const reviewAt = optionalText(body.reviewAt, "reviewAt");
  return {
    kind: "ok",
    value: {
      kind: "place_hold",
      idempotencyKey,
      categories,
      reason,
      ...(reviewAt === undefined ? {} : { reviewAt }),
    },
  };
}

function startOrchestrationCommand(
  idempotencyKey: IdempotencyKey,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const requestId = parseDeletionRequestId(body.requestId);
  const categories = textArray(body.categories, "categories");
  if (requestId === undefined || categories === undefined) {
    return invalidPayload("requestId and categories are required.");
  }
  const gate = optionalGate(body.gate);
  if (body.gate !== undefined && gate === undefined) {
    return invalidPayload(
      "gate must contain boolean policy and infrastructure approvals.",
    );
  }
  return {
    kind: "ok",
    value: {
      kind: "start_orchestration",
      idempotencyKey,
      requestId,
      categories,
      ...(gate === undefined ? {} : { gate }),
    },
  };
}

function createDeletionCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  const reason = textValue(body.reason, "reason");
  const typedConfirmation = textValue(
    body.typedConfirmation,
    "typedConfirmation",
  );
  const expectedConfirmation = textValue(
    body.expectedConfirmation,
    "expectedConfirmation",
  );
  if (
    reason === undefined || typedConfirmation === undefined ||
    expectedConfirmation === undefined
  ) return invalidPayload("reason and exact confirmation fields are required.");
  const requiredApprovalCount = optionalPositiveInteger(
    body.requiredApprovalCount,
  );
  if (
    body.requiredApprovalCount !== undefined &&
    requiredApprovalCount === undefined
  ) return invalidPayload("requiredApprovalCount must be a positive integer.");
  return {
    kind: "ok",
    value: {
      kind: "create_deletion",
      idempotencyKey,
      requestedGovernanceVersion: version.value,
      reason,
      typedConfirmation,
      expectedConfirmation,
      ...(requiredApprovalCount === undefined ? {} : { requiredApprovalCount }),
    },
  };
}

function retentionCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  const policySource = textValue(body.policySource, "policySource");
  const policyVersion = textValue(body.policyVersion, "policyVersion");
  const retainedCategories = textArray(
    body.retainedCategories,
    "retainedCategories",
  );
  const retentionStartEvent = retentionStartEventValue(
    body.retentionStartEvent,
  );
  const retentionUntil = textValue(body.retentionUntil, "retentionUntil");
  const disposition = retentionDispositionValue(body.disposition);
  if (
    policySource === undefined || policyVersion === undefined ||
    retainedCategories === undefined || retentionStartEvent === undefined ||
    retentionUntil === undefined || disposition === undefined
  ) return invalidPayload("retention policy fields are incomplete or invalid.");
  const mandatory = optionalBoolean(body.mandatory);
  if (body.mandatory !== undefined && mandatory === undefined) {
    return invalidPayload("mandatory must be boolean.");
  }
  return {
    kind: "ok",
    value: {
      kind: "retention",
      idempotencyKey,
      expectedVersion: version.value,
      policySource,
      policyVersion,
      retainedCategories,
      retentionStartEvent,
      retentionUntil,
      disposition,
      ...(mandatory === undefined ? {} : { mandatory }),
    },
  };
}

function transitionCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  action: GovernanceAction,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  if (!isRecord(body.preview)) {
    return invalidPayload(
      "preview must be the consequence preview returned for this action.",
    );
  }
  return {
    kind: "ok",
    value: {
      kind: "transition",
      idempotencyKey,
      action,
      expectedVersion: version.value,
      preview: body.preview as unknown as ConsequencePreview,
    },
  };
}

function releaseHoldCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  holdId: LegalHoldId,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  return {
    kind: "ok",
    value: {
      kind: "release_hold",
      idempotencyKey,
      holdId,
      expectedVersion: version.value,
    },
  };
}

function impactCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  requestId: DeletionRequestId,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  const impact = parseImpact(body);
  if (impact === undefined) {
    return invalidPayload(
      "impact must include categories, recordCounts, retainedCategories, excludedRecords, irreversibleConsequences, and assessedAt.",
    );
  }
  return {
    kind: "ok",
    value: {
      kind: "assess_impact",
      idempotencyKey,
      requestId,
      expectedVersion: version.value,
      impact,
    },
  };
}

function versionedCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  kind: "submit_deletion" | "cancel_deletion",
  requestId: DeletionRequestId,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  return {
    kind: "ok",
    value: { kind, idempotencyKey, requestId, expectedVersion: version.value },
  };
}

function decisionCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  requestId: DeletionRequestId,
  body: Readonly<Record<string, unknown>>,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  const role = textValue(body.role, "role");
  const decision = body.decision === "approve" || body.decision === "reject"
    ? body.decision
    : undefined;
  const waitingPeriodMs = optionalNonNegativeInteger(body.waitingPeriodMs);
  if (role === undefined || decision === undefined) {
    return invalidPayload(
      "role and decision must be provided; decision must be approve or reject.",
    );
  }
  if (body.waitingPeriodMs !== undefined && waitingPeriodMs === undefined) {
    return invalidPayload("waitingPeriodMs must be a non-negative integer.");
  }
  return {
    kind: "ok",
    value: {
      kind: "decide_deletion",
      idempotencyKey,
      requestId,
      expectedVersion: version.value,
      role,
      decision,
      ...(waitingPeriodMs === undefined ? {} : { waitingPeriodMs }),
    },
  };
}

function resumeCommand(
  request: Request,
  idempotencyKey: IdempotencyKey,
  orchestrationId: OrchestrationId,
): CommandResult {
  const version = ifMatch(request);
  if (version.kind === "error") return version;
  return {
    kind: "ok",
    value: {
      kind: "resume_orchestration",
      idempotencyKey,
      orchestrationId,
      expectedVersion: version.value,
    },
  };
}

type CommandResult =
  | { readonly kind: "ok"; readonly value: DealGovernanceApiCommand }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

type VersionResult =
  | { readonly kind: "ok"; readonly value: AggregateVersion }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

function ifMatch(request: Request): VersionResult {
  const parsed = parseIfMatch(request.headers.get("If-Match"));
  if (parsed.ok) return { kind: "ok", value: parsed.value };
  return invalidPayload('Expected a strong If-Match ETag such as "v1".');
}

function parseRoute(path: string): Route | undefined {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized === BASE_PATH) return { kind: "read" };
  if (!normalized.startsWith(`${BASE_PATH}/`)) return undefined;
  const parts = normalized.slice(BASE_PATH.length + 1).split("/").map(
    decodePart,
  );
  if (parts.length === 1 && parts[0] === "initialize") {
    return { kind: "create" };
  }
  if (parts.length === 2 && parts[0] === "preview") {
    const action = governanceAction(parts[1]);
    return action === undefined ? undefined : { kind: "preview", action };
  }
  if (parts.length === 2 && parts[0] === "transition") {
    const action = governanceAction(parts[1]);
    return action === undefined ? undefined : { kind: "transition", action };
  }
  if (parts.length === 1 && parts[0] === "retention") {
    return { kind: "retention" };
  }
  if (parts.length === 1 && parts[0] === "legal-holds") {
    return { kind: "place_hold" };
  }
  if (
    parts.length === 3 && parts[0] === "legal-holds" && parts[2] === "release"
  ) {
    const holdId = parseLegalHoldId(parts[1]);
    return holdId === undefined ? undefined : { kind: "release_hold", holdId };
  }
  if (parts.length === 1 && parts[0] === "deletion-requests") {
    return { kind: "create_deletion" };
  }
  const deletion = deletionRoute(parts);
  if (deletion !== undefined) return deletion;
  if (parts.length === 1 && parts[0] === "orchestrations") {
    return { kind: "start_orchestration" };
  }
  if (
    parts.length === 3 && parts[0] === "orchestrations" && parts[2] === "resume"
  ) {
    const id = parseOrchestrationId(parts[1]);
    return id === undefined
      ? undefined
      : { kind: "resume_orchestration", orchestrationId: id };
  }
  return undefined;
}

function deletionRoute(parts: readonly string[]): Route | undefined {
  if (parts.length !== 3 || parts[0] !== "deletion-requests") return undefined;
  const requestId = parseDeletionRequestId(parts[1]);
  if (requestId === undefined) return undefined;
  if (parts[2] === "impact") return { kind: "assess_impact", requestId };
  if (parts[2] === "submit") return { kind: "submit_deletion", requestId };
  if (parts[2] === "decision") return { kind: "decide_deletion", requestId };
  if (parts[2] === "cancel") return { kind: "cancel_deletion", requestId };
  return undefined;
}

function governanceAction(
  value: string | undefined,
): GovernanceAction | undefined {
  return value === "pause" || value === "archive" || value === "restore" ||
      value === "terminate"
    ? value
    : undefined;
}

function parseLegalHoldId(value: string | undefined): LegalHoldId | undefined {
  return parseScopedId(value, legalHoldId);
}

function parseDeletionRequestId(value: unknown): DeletionRequestId | undefined {
  return parseScopedId(
    typeof value === "string" ? value : undefined,
    deletionRequestId,
  );
}

function parseOrchestrationId(
  value: string | undefined,
): OrchestrationId | undefined {
  return parseScopedId(value, orchestrationId);
}

function parseScopedId<T extends string>(
  value: string | undefined,
  parser: (value: string) => T,
): T | undefined {
  if (value === undefined) return undefined;
  try {
    return parser(value);
  } catch (_error) {
    return undefined;
  }
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return "";
  }
}

async function requestBody(
  request: Request,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  try {
    const value: unknown = await request.json();
    return isRecord(value) ? value : undefined;
  } catch (_error) {
    return undefined;
  }
}

function textValue(value: unknown, _field: string): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return textValue(value, field);
}

function textArray(
  value: unknown,
  _field: string,
): readonly string[] | undefined {
  if (
    !Array.isArray(value) || value.length === 0 ||
    value.some((item) => textValue(item, "item") === undefined)
  ) return undefined;
  return value as string[];
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) > 0
    ? value as number
    : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? value as number
    : undefined;
}

function retentionStartEventValue(
  value: unknown,
): RetentionAssignment["retentionStartEvent"] | undefined {
  return value === "archive" || value === "termination" ||
      value === "legal_completion" || value === "last_external_distribution"
    ? value
    : undefined;
}

function retentionDispositionValue(
  value: unknown,
): RetentionAssignment["disposition"] | undefined {
  const values = [
    "retain_complete_record",
    "retain_metadata_only",
    "anonymize_personal_data",
    "delete_selected_source_copies",
    "permanently_delete_eligible_records",
    "manual_review",
  ] as const;
  return values.includes(value as typeof values[number])
    ? value as RetentionAssignment["disposition"]
    : undefined;
}

function optionalGate(value: unknown): ErasureGate | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.policyApproved !== "boolean" ||
    typeof value.infrastructureApproved !== "boolean" ||
    typeof value.physicalErasureEnabled !== "boolean"
  ) return undefined;
  return {
    policyApproved: value.policyApproved,
    infrastructureApproved: value.infrastructureApproved,
    physicalErasureEnabled: value.physicalErasureEnabled,
  };
}

function parseImpact(
  value: Readonly<Record<string, unknown>>,
): DeletionImpact | undefined {
  const categories = textArray(value.categories, "categories");
  const retainedCategories = textArray(
    value.retainedCategories,
    "retainedCategories",
  );
  const excludedRecords = textArray(value.excludedRecords, "excludedRecords");
  const irreversibleConsequences = textArray(
    value.irreversibleConsequences,
    "irreversibleConsequences",
  );
  const assessedAt = textValue(value.assessedAt, "assessedAt");
  if (
    categories === undefined || retainedCategories === undefined ||
    excludedRecords === undefined || irreversibleConsequences === undefined ||
    assessedAt === undefined || !isRecord(value.recordCounts)
  ) return undefined;
  const counts = Object.values(value.recordCounts);
  if (
    counts.some((count) =>
      !Number.isSafeInteger(count) || (count as number) < 0
    )
  ) return undefined;
  return {
    categories,
    recordCounts: value.recordCounts as Record<string, number>,
    retainedCategories,
    excludedRecords,
    irreversibleConsequences,
    assessedAt,
  };
}

function invalidPayload(
  message: string,
): { readonly kind: "error"; readonly error: ErrorEnvelope } {
  return {
    kind: "error",
    error: createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId: "cor_route" as CorrelationId,
      retryable: false,
      fieldErrors: {
        request: [{ field: "request", code: "INVALID_TYPE", message }],
      },
    }),
  };
}

function withCorrelation(
  error: ErrorEnvelope,
  correlationId: GovernanceCommandContext["request"]["correlationId"],
): ErrorEnvelope {
  return { error: { ...error.error, correlationId } };
}

function validationResponse(
  context: GovernanceCommandContext,
  field: string,
  message: string,
): Response {
  return errorResponse({
    error: {
      code: "VALIDATION_FAILED",
      message,
      correlationId: context.request.correlationId,
      retryable: false,
      fieldErrors: { [field]: [{ field, code: "INVALID_TYPE", message }] },
    },
  });
}

function resultResponse(
  result:
    | Awaited<ReturnType<DealGovernanceV1Application["command"]>>
    | Awaited<ReturnType<DealGovernanceV1Application["read"]>>,
  context: GovernanceCommandContext,
  status = 200,
): Response {
  if (result.kind === "error") return errorResponse(result.error);
  const etag = etagForGovernanceValue(result.value);
  return Response.json(
    createSuccessEnvelope(result.value, {
      correlationId: context.request.correlationId,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Correlation-Id": context.request.correlationId,
        ...(etag === undefined ? {} : { ETag: etag }),
      },
    },
  );
}

function errorResponse(error: ErrorEnvelope): Response {
  const status = error.error.code === "VALIDATION_FAILED"
    ? 422
    : error.error.code === "ACTION_FORBIDDEN"
    ? 403
    : error.error.code === "PROTECTED_NOT_FOUND"
    ? 404
    : error.error.code === "RETENTION_OR_LEGAL_HOLD"
    ? 423
    : error.error.code === "ASYNC_OPERATION_FAILED"
    ? 200
    : 409;
  return Response.json(error, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Correlation-Id": error.error.correlationId,
    },
  });
}

async function requestContext(
  request: Request,
  port: DealGovernanceRequestContextPort,
): Promise<
  { readonly kind: "ok"; readonly value: GovernanceCommandContext } | {
    readonly kind: "error";
    readonly error: ErrorEnvelope;
  }
> {
  try {
    return { kind: "ok", value: await port.contextFor(request) };
  } catch (_error) {
    const correlation = parseCorrelationHeader(
      request.headers.get("X-Correlation-Id"),
    );
    const correlationId: CorrelationId = correlation.ok
      ? correlation.value
      : "cor_route" as CorrelationId;
    return {
      kind: "error",
      error: createApiError({
        code: "UNAUTHENTICATED",
        message: "The request actor could not be authenticated.",
        correlationId,
        retryable: false,
      }),
    };
  }
}

function methodNotAllowed(methods: readonly string[]): Response {
  return new Response(null, {
    status: 405,
    headers: { Allow: methods.join(", ") },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
