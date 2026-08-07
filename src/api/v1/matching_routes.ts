import {
  matchingAcceptedResponse,
  type MatchingContext,
  matchingResponse,
  type MatchingV1Application,
} from "./matching.ts";
import {
  parseIdempotencyHeader,
  parseIfMatch,
  type RequestContext,
} from "../../platform/api/v1.ts";
import type { ActorReference } from "../../platform/authz/v1.ts";
import type { IdempotencyKey } from "../../shared/contracts/identifiers.ts";
import {
  candidateId,
  conflictId,
  criteriaId,
  outreachAuthorizationId,
  restrictionId,
  runId,
  shortlistDecisionId,
} from "../../matching/v1.ts";
import type {
  CandidateProjectionInput,
  MatchingScope,
} from "../../matching/v1.ts";
import { MatchingError } from "../../matching/v1.ts";
import { MATCHING_CONTRACT_VERSION } from "../../engines/optimization/matching/types.ts";

export const MATCHING_BASE_PATH = "/api/v1/matching";

export interface MatchingContextPort {
  contextFor(request: Request): Promise<MatchingContext>;
}

export interface MatchingV1RouteDependencies {
  readonly context: MatchingContextPort;
  readonly application: MatchingV1Application;
}

type MatchingRoute =
  | { readonly kind: "candidate" | "conflict"; readonly id: string }
  | {
    readonly kind: "criteria";
    readonly command?: "activate";
    readonly id?: string;
  }
  | { readonly kind: "run"; readonly command?: "execute"; readonly id?: string }
  | {
    readonly kind: "conflicts" | "restrictions" | "shortlist" | "outreach";
    readonly command?: "resolve" | "clear" | "revoke";
    readonly id?: string;
  };

export async function handleMatchingV1Route(
  request: Request,
  dependencies: MatchingV1RouteDependencies,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const route = parseMatchingRoute(path);
  if (route === undefined) {
    return path.startsWith(MATCHING_BASE_PATH) ? methodNotAllowed() : null;
  }
  const authenticated = await authenticate(request, dependencies.context);
  if (authenticated instanceof Response) return authenticated;
  try {
    return await dispatchMatchingRoute(
      request,
      route,
      authenticated,
      dependencies.application,
    );
  } catch (error) {
    return validationResponse(error, authenticated.context.correlationId);
  }
}

function parseMatchingRoute(path: string): MatchingRoute | undefined {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "v1" || parts[2] !== "matching") {
    return;
  }
  const collection = parts[3];
  const id = parts[4] === undefined ? undefined : decodeURIComponent(parts[4]);
  const command = parts[5];
  if (collection === "candidates" && id !== undefined && parts.length === 5) {
    return { kind: "candidate", id };
  }
  if (collection === "conflicts" && id !== undefined && parts.length === 5) {
    return { kind: "conflict", id };
  }
  if (collection === "criteria") {
    return parseCriteriaRoute(id, command, parts.length);
  }
  if (collection === "runs") return parseRunRoute(id, command, parts.length);
  if (
    collection === "conflicts" || collection === "restrictions" ||
    collection === "shortlist" || collection === "outreach"
  ) {
    return parseCommandRoute(collection, id, command, parts.length);
  }
}

function parseCriteriaRoute(
  id: string | undefined,
  command: string | undefined,
  length: number,
): MatchingRoute | undefined {
  if (length === 4) return { kind: "criteria" };
  if (length === 6 && id !== undefined && command === "activate") {
    return { kind: "criteria", id, command };
  }
}

function parseRunRoute(
  id: string | undefined,
  command: string | undefined,
  length: number,
): MatchingRoute | undefined {
  if (length === 4) return { kind: "run" };
  if (length === 6 && id !== undefined && command === "execute") {
    return { kind: "run", id, command };
  }
}

function parseCommandRoute(
  kind: "conflicts" | "restrictions" | "shortlist" | "outreach",
  id: string | undefined,
  command: string | undefined,
  length: number,
): MatchingRoute | undefined {
  if (length === 4) return { kind };
  if (length === 6 && id !== undefined && command !== undefined) {
    const allowed = kind === "conflicts"
      ? "resolve"
      : kind === "restrictions"
      ? "clear"
      : kind === "outreach"
      ? "revoke"
      : undefined;
    if (command === allowed) {
      return { kind, id, command: command as "resolve" | "clear" | "revoke" };
    }
  }
}

async function dispatchMatchingRoute(
  request: Request,
  route: MatchingRoute,
  authenticated: MatchingContext,
  application: MatchingV1Application,
): Promise<Response> {
  const scope = matchingScope(authenticated.context);
  const base = {
    context: authenticated.context,
    actor: authenticated.actor,
    scope,
  };
  if (request.method === "GET" && route.kind === "candidate") {
    return matchingResponse(
      await application.readCandidate({ ...base, id: candidateId(route.id) }),
      200,
      authenticated.context.correlationId,
    );
  }
  if (request.method === "GET" && route.kind === "conflict") {
    return matchingResponse(
      await application.readConflict({ ...base, id: conflictId(route.id) }),
      200,
      authenticated.context.correlationId,
    );
  }
  if (request.method !== "POST") return methodNotAllowed();
  if (route.kind === "criteria" && route.command === "activate") {
    requireIdempotency(request);
    const result = await application.activateCriteria({
      ...base,
      id: criteriaId(route.id!),
      expectedVersion: expectedVersion(request),
    });
    return matchingResponse(result, 200, authenticated.context.correlationId);
  }
  if (route.kind === "run" && route.command === "execute") {
    requireIdempotency(request);
    const result = await application.executeRun({
      ...base,
      id: runId(route.id!),
    });
    return matchingResponse(result, 200, authenticated.context.correlationId);
  }
  const body = await requestBody(request);
  requireIdempotency(request);
  if (route.kind === "criteria" && route.id === undefined) {
    const result = await application.createCriteria({
      ...base,
      id: criteriaId(text(body, "id")),
      selection: body.selection as never,
      optimizerContractVersion: textOr(
        body,
        "optimizerContractVersion",
        MATCHING_CONTRACT_VERSION,
      ),
    });
    return matchingResponse(result, 201, authenticated.context.correlationId);
  }
  if (route.kind === "run" && route.id === undefined) {
    const result = await application.startRun({
      ...base,
      id: runId(text(body, "id")),
      criteriaId: criteriaId(text(body, "criteriaId")),
      idempotencyKey: idempotency(request),
      candidateInputs: candidateInputs(body),
    });
    return matchingAcceptedResponse(
      result,
      authenticated.context.correlationId,
    );
  }
  return await dispatchMatchingCommand(
    request,
    route,
    body,
    base,
    application,
    authenticated.context.correlationId,
  );
}

async function dispatchMatchingCommand(
  request: Request,
  route: MatchingRoute,
  body: Record<string, unknown>,
  base: {
    readonly context: RequestContext;
    readonly actor: ActorReference;
    readonly scope: MatchingScope;
  },
  application: MatchingV1Application,
  correlationId: import("../../shared/contracts/identifiers.ts").CorrelationId,
): Promise<Response> {
  requireIdempotency(request);
  if (route.kind === "conflicts" && route.id === undefined) {
    const result = await application.openConflict({
      ...base,
      id: conflictId(text(body, "id")),
      candidateId: candidateId(text(body, "candidateId")),
      kind: text(body, "kind") as never,
      rationale: optionalText(body, "rationale"),
    });
    return matchingResponse(result, 201, correlationId);
  }
  if (route.kind === "conflicts" && route.command === "resolve") {
    const result = await application.resolveConflict({
      ...base,
      id: conflictId(route.id!),
      expectedVersion: expectedVersion(request),
    });
    return matchingResponse(result, 200, correlationId);
  }
  if (route.kind === "restrictions" && route.id === undefined) {
    const result = await application.openRestriction({
      ...base,
      id: restrictionId(text(body, "id")),
      candidateId: candidateId(text(body, "candidateId")),
      category: text(body, "category"),
    });
    return matchingResponse(result, 201, correlationId);
  }
  if (route.kind === "restrictions" && route.command === "clear") {
    const result = await application.clearRestriction({
      ...base,
      id: restrictionId(route.id!),
      candidateId: candidateId(text(body, "candidateId")),
      expectedVersion: expectedVersion(request),
    });
    return matchingResponse(result, 200, correlationId);
  }
  if (route.kind === "shortlist") {
    const result = await application.decideShortlist({
      ...base,
      id: shortlistDecisionId(text(body, "id")),
      runId: runId(text(body, "runId")),
      candidateId: candidateId(text(body, "candidateId")),
      state: text(body, "state") as never,
      authoritySnapshotReference: text(body, "authoritySnapshotReference"),
    });
    return matchingResponse(result, 201, correlationId);
  }
  if (route.kind === "outreach" && route.id === undefined) {
    const result = await application.authorizeOutreach({
      ...base,
      id: outreachAuthorizationId(text(body, "id")),
      shortlistDecisionId: shortlistDecisionId(
        text(body, "shortlistDecisionId"),
      ),
      candidateId: candidateId(text(body, "candidateId")),
      authoritySnapshotReference: text(body, "authoritySnapshotReference"),
    });
    return matchingResponse(result, 201, correlationId);
  }
  if (route.kind === "outreach" && route.command === "revoke") {
    const result = await application.revokeOutreach({
      ...base,
      id: outreachAuthorizationId(route.id!),
      shortlistDecisionId: shortlistDecisionId(
        text(body, "shortlistDecisionId"),
      ),
      candidateId: candidateId(text(body, "candidateId")),
      authoritySnapshotReference: text(body, "authoritySnapshotReference"),
      expectedVersion: expectedVersion(request),
    });
    return matchingResponse(result, 200, correlationId);
  }
  return methodNotAllowed();
}

async function authenticate(
  request: Request,
  context: MatchingContextPort,
): Promise<MatchingContext | Response> {
  try {
    return await context.contextFor(request);
  } catch {
    return Response.json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
        correlationId: "cor_route",
        retryable: false,
      },
    }, { status: 401 });
  }
}

function matchingScope(context: RequestContext): MatchingScope {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    throw new MatchingError(
      "INVALID_CRITERIA",
      `Matching requires workspace and deal scope; received workspace "${context.workspaceId}" and deal "${context.dealId}".`,
    );
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json();
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      "Matching request body is invalid; expected a JSON object.",
    );
  }
  return value as Record<string, unknown>;
}

function candidateInputs(
  body: Record<string, unknown>,
): readonly CandidateProjectionInput[] {
  const value = body.candidates;
  if (!Array.isArray(value)) {
    throw new Error("Matching candidates are invalid; expected an array.");
  }
  return value.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("Matching candidate is invalid; expected an object.");
    }
    const record = item as Record<string, unknown>;
    const id = candidateId(text(record, "id"));
    return {
      id,
      restrictedIdentityReference: text(record, "restrictedIdentityReference"),
      sourceReference: text(record, "sourceReference"),
      candidate: {
        ...(record.candidate as Record<string, unknown>),
        id,
      } as never,
    };
  });
}

function idempotency(request: Request): IdempotencyKey {
  const value = parseIdempotencyHeader(request.headers.get("Idempotency-Key"));
  if (value.ok) return value.value;
  throw new Error("Idempotency-Key is required; expected an idem_ identifier.");
}

function requireIdempotency(request: Request): void {
  idempotency(request);
}

function expectedVersion(request: Request): number {
  const value = parseIfMatch(request.headers.get("If-Match"));
  if (value.ok) return value.value;
  throw new Error(
    'If-Match is invalid; expected one strong "v<version>" ETag.',
  );
}

function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(
    `Matching field "${key}" is invalid; expected non-empty text.`,
  );
}

function textOr(
  body: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  return typeof body[key] === "string" && body[key].trim()
    ? body[key] as string
    : fallback;
}

function optionalText(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  return body[key] === undefined ? undefined : text(body, key);
}

function validationResponse(
  error: unknown,
  correlationId: import("../../shared/contracts/identifiers.ts").CorrelationId,
): Response {
  const message = error instanceof Error
    ? error.message
    : "Matching request is invalid.";
  return Response.json({
    error: {
      code: "VALIDATION_FAILED",
      message,
      correlationId,
      retryable: false,
    },
  }, { status: 422 });
}

function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}
