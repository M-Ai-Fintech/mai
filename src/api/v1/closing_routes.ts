import {
  type AggregateVersion,
  createProtectedNotFoundError,
  type IdempotencyKey,
  parseIdempotencyHeader,
  parseIfMatch,
} from "../../platform/api/v1.ts";
import {
  type ClosingStatus,
  conditionId as parseConditionId,
} from "../../closing/v1.ts";
import type {
  ClosingAuthorityCommandInput,
  ClosingCommandInput,
  ClosingCommandResult,
} from "../../closing/v1.ts";
import {
  type ClosingAuthenticatedContext,
  ClosingRequestError,
  type ClosingV1Application,
  type ClosingV1RouteDependencies,
  correlationFromRequest,
  errorResponse,
  responseHeaders,
  success,
} from "./closing.ts";

const CLOSING_PATH = "/api/v1/closing";

export async function handleClosingV1Route(
  request: Request,
  dependencies: ClosingV1RouteDependencies,
): Promise<Response | null> {
  const path = normalizePath(new URL(request.url).pathname);
  if (path !== CLOSING_PATH && !path.startsWith(`${CLOSING_PATH}/`)) {
    return null;
  }
  const route = parseRoute(path);
  if (route === undefined) return new Response("Not Found", { status: 404 });
  let authenticated: ClosingAuthenticatedContext | undefined;
  try {
    authenticated = await dependencies.context.contextFor(request);
    return await dispatch(
      request,
      route,
      authenticated,
      dependencies.application,
    );
  } catch (error) {
    return errorResponse(
      error,
      authenticated?.context.correlationId ?? correlationFromRequest(request),
    );
  }
}

type ClosingRoute =
  | { readonly kind: "collection" }
  | { readonly kind: "workspace"; readonly workspaceId: string }
  | {
    readonly kind: "command";
    readonly workspaceId: string;
    readonly action: ClosingAction;
    readonly childId?: string;
  };

type ClosingAction =
  | "transition"
  | "condition"
  | "condition_evidence"
  | "condition_accept"
  | "condition_satisfy"
  | "waiver"
  | "waiver_review"
  | "waiver_approve"
  | "readiness_review"
  | "readiness_approve"
  | "begin"
  | "completion"
  | "abort";

function parseRoute(path: string): ClosingRoute | undefined {
  if (path === CLOSING_PATH) return { kind: "collection" };
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 4) return { kind: "workspace", workspaceId: parts[3] };
  if (parts.length === 5) return commandRoute(parts[3], parts[4]);
  if (parts.length === 7) {
    return nestedCommandRoute(parts[3], parts[4], parts[5], parts[6]);
  }
  return undefined;
}

function commandRoute(
  workspaceId: string,
  segment: string,
): ClosingRoute | undefined {
  const action = ({
    transition: "transition",
    conditions: "condition",
    "readiness-review": "readiness_review",
    "readiness-approve": "readiness_approve",
    waivers: "waiver",
    begin: "begin",
    completion: "completion",
    abort: "abort",
  } as const)[segment];
  return action === undefined
    ? undefined
    : { kind: "command", workspaceId, action };
}

function nestedCommandRoute(
  workspaceId: string,
  parent: string,
  childId: string,
  actionSegment: string,
): ClosingRoute | undefined {
  const action = parent === "conditions"
    ? ({
      evidence: "condition_evidence",
      accept: "condition_accept",
      satisfy: "condition_satisfy",
    } as const)[actionSegment]
    : parent === "waivers"
    ? ({ "legal-review": "waiver_review", approve: "waiver_approve" } as const)[
      actionSegment
    ]
    : undefined;
  return action === undefined
    ? undefined
    : { kind: "command", workspaceId, action, childId };
}

function dispatch(
  request: Request,
  route: ClosingRoute,
  authenticated: ClosingAuthenticatedContext,
  application: ClosingV1Application,
): Promise<Response> {
  if (route.kind === "collection" && request.method === "POST") {
    return createWorkspace(request, authenticated, application);
  }
  if (route.kind === "workspace" && request.method === "GET") {
    return readWorkspace(route.workspaceId, authenticated, application);
  }
  if (route.kind === "command" && request.method === "POST") {
    return runCommand(request, route, authenticated, application);
  }
  return Promise.resolve(
    new Response(null, { status: 405, headers: { Allow: "GET, POST" } }),
  );
}

async function createWorkspace(
  request: Request,
  authenticated: ClosingAuthenticatedContext,
  application: ClosingV1Application,
): Promise<Response> {
  const key = requiredIdempotency(request);
  const body = await jsonBody(request);
  const result = await application.create(
    authenticated,
    requiredString(body, "closingWorkspaceId"),
    key,
    optionalBoolean(body, "confirmationEnabled"),
  );
  return success(result, authenticated.context.correlationId, 201);
}

async function readWorkspace(
  workspaceId: string,
  authenticated: ClosingAuthenticatedContext,
  application: ClosingV1Application,
): Promise<Response> {
  const workspace = await application.read(authenticated, workspaceId);
  if (workspace === undefined) {
    return Response.json(
      createProtectedNotFoundError(authenticated.context.correlationId),
      {
        status: 404,
        headers: responseHeaders(authenticated.context.correlationId),
      },
    );
  }
  return success(
    { workspace, replayed: false },
    authenticated.context.correlationId,
    200,
  );
}

async function runCommand(
  request: Request,
  route: Extract<ClosingRoute, { readonly kind: "command" }>,
  authenticated: ClosingAuthenticatedContext,
  application: ClosingV1Application,
): Promise<Response> {
  const metadata = commandMetadata(request);
  const body = await jsonBody(request);
  const result = executeCommand(
    route,
    body,
    metadata,
    authenticated,
    application,
  );
  return success(await result, authenticated.context.correlationId, 200);
}

function executeCommand(
  route: Extract<ClosingRoute, { readonly kind: "command" }>,
  body: Record<string, unknown>,
  metadata: CommandMetadata,
  authenticated: ClosingAuthenticatedContext,
  application: ClosingV1Application,
): Promise<ClosingCommandResult> {
  const { workspaceId, childId } = route;
  const command = (
    operation: (input: ClosingCommandInput) => Promise<ClosingCommandResult>,
  ) =>
    application.command(
      authenticated,
      workspaceId,
      metadata.version,
      metadata.key,
      operation,
    );
  if (route.action === "transition") {
    return command((input) =>
      application.service.transition({ ...input, to: requiredStatus(body) })
    );
  }
  if (route.action === "condition") {
    return command((input) =>
      application.service.addCondition(input, {
        conditionId: requiredString(body, "conditionId"),
        requirementId: requiredString(body, "requirementId"),
        title: requiredString(body, "title"),
        category: requiredString(body, "category"),
        responsiblePartyId: requiredString(body, "responsiblePartyId"),
        reviewerId: requiredString(body, "reviewerId"),
        now: new Date().toISOString(),
      })
    );
  }
  if (route.action === "condition_evidence") {
    const condition = parseConditionId(childId!);
    return command((input) =>
      application.service.submitConditionEvidence(input, condition, {
        evidenceId: requiredString(body, "evidenceId"),
        sourceType: requiredString(body, "sourceType"),
        sourceId: requiredString(body, "sourceId"),
        sourceVersion: requiredString(body, "sourceVersion"),
        submittedBy: authenticated.actor.id,
        submittedAt: new Date().toISOString(),
      })
    );
  }
  if (route.action === "condition_accept") {
    return command((input) =>
      application.service.acceptConditionEvidence(
        input,
        parseConditionId(childId!),
        requiredString(body, "evidenceId"),
      )
    );
  }
  if (route.action === "condition_satisfy") {
    return command((input) =>
      application.service.satisfyCondition(input, parseConditionId(childId!))
    );
  }
  if (route.action === "waiver") {
    return command((input) =>
      application.service.proposeWaiver(input, {
        waiverId: requiredString(body, "waiverId"),
        conditionId: parseConditionId(requiredString(body, "conditionId")),
        scope: oneOf(
          body,
          "scope",
          ["full", "temporary", "post_closing"] as const,
        ),
        proposedBy: authenticated.actor.id,
        beneficiary: requiredString(body, "beneficiary"),
        reason: requiredString(body, "reason"),
        residualRisk: requiredString(body, "residualRisk"),
        requiredApprovalIds: stringArray(body, "requiredApprovalIds"),
        approvalAuthority: requiredString(body, "approvalAuthority"),
      })
    );
  }
  if (route.action === "waiver_review") {
    return command((input) =>
      application.service.confirmWaiverLegalReview(input, childId!)
    );
  }
  if (route.action === "readiness_review") {
    return command((input) => application.service.startReadinessReview(input));
  }
  if (route.action === "abort") {
    return command((input) => application.service.abort(input));
  }
  const protectedValue = protectedCommand(body);
  const authorized = (
    operation: (
      input: ClosingAuthorityCommandInput,
    ) => Promise<ClosingCommandResult>,
  ) =>
    application.authorizedCommand(
      authenticated,
      workspaceId,
      metadata.version,
      metadata.key,
      protectedValue,
      operation,
    );
  if (route.action === "waiver_approve") {
    return authorized((input) =>
      application.service.approveWaiver(input, childId!)
    );
  }
  if (route.action === "readiness_approve") {
    return authorized((input) => application.service.approveReadiness(input));
  }
  if (route.action === "begin") {
    return authorized((input) => application.service.beginClosing(input));
  }
  return authorized((input) =>
    application.service.confirmCompletion({
      ...input,
      paymentsEvidence: stringArray(body, "paymentsEvidence"),
      transferEvidence: stringArray(body, "transferEvidence"),
      finalExceptions: stringArray(body, "finalExceptions"),
      pendingEvidence: stringArray(body, "pendingEvidence"),
      effectiveAt: requiredString(body, "effectiveAt"),
    })
  );
}

interface CommandMetadata {
  readonly key: IdempotencyKey;
  readonly version: AggregateVersion;
}

function commandMetadata(request: Request): CommandMetadata {
  const key = parseIdempotencyHeader(request.headers.get("Idempotency-Key"));
  if (!key.ok) {
    throw new ClosingRequestError(
      "Idempotency-Key is required; expected a valid semantic command key.",
    );
  }
  const version = parseIfMatch(request.headers.get("If-Match"));
  if (!version.ok) {
    throw new ClosingRequestError(
      'If-Match is required; expected one strong ETag such as "v1".',
    );
  }
  return { key: key.value, version: version.value };
}

function requiredIdempotency(request: Request): IdempotencyKey {
  const key = parseIdempotencyHeader(request.headers.get("Idempotency-Key"));
  if (key.ok) return key.value;
  throw new ClosingRequestError(
    "Idempotency-Key is required; expected a valid semantic command key.",
  );
}

async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (isRecord(value)) return value;
  } catch (_error) {
    // Keep parser details out of the public API response.
  }
  throw new ClosingRequestError(
    "Closing request body is invalid; expected a JSON object.",
  );
}

function requiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new ClosingRequestError(
    `Closing field "${field}" is invalid; expected a non-empty string.`,
  );
}

function optionalBoolean(
  body: Record<string, unknown>,
  field: string,
): boolean | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new ClosingRequestError(
    `Closing field "${field}" is invalid; expected a boolean.`,
  );
}

function stringArray(
  body: Record<string, unknown>,
  field: string,
): readonly string[] {
  const value = body[field];
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  ) return value;
  throw new ClosingRequestError(
    `Closing field "${field}" is invalid; expected a string array.`,
  );
}

function oneOf<const Values extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  values: Values,
): Values[number] {
  const value = body[field];
  if (typeof value === "string" && values.includes(value)) return value;
  throw new ClosingRequestError(
    `Closing field "${field}" is invalid; expected one of ${
      values.join(", ")
    }.`,
  );
}

function requiredStatus(body: Record<string, unknown>): ClosingStatus {
  return oneOf(
    body,
    "to",
    [
      "setup",
      "preparing_signing",
      "signing_ready",
      "signed",
      "gap_period",
      "preparing_closing",
      "closing_review",
      "authorized_to_close",
      "closing_in_progress",
      "closed_pending_evidence",
      "closed",
      "post_closing",
      "completed",
      "aborted",
      "archived",
    ] as const,
  );
}

function protectedCommand(body: Record<string, unknown>): unknown {
  const value = body.protectedCommand ?? body.authorityCommand;
  if (value !== undefined) return value;
  throw new ClosingRequestError(
    "Closing authority command is missing; expected a protected human authority proof.",
  );
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
