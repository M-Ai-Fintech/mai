import {
  correlationFromRequest,
  errorResponse,
  externalSuccess,
  jsonBody,
  type NegotiationAuthenticatedContext,
  NegotiationRequestError,
  type NegotiationV1Application,
  protectedCommand,
  requiredIdempotency,
  requiredIfMatch,
  requiredNumber,
  requiredString,
  requiredTerms,
  success,
} from "./negotiation.ts";
import type { NegotiationV1RouteDependencies } from "./negotiation.ts";
import { createNormalizedTerms } from "../../negotiation/terms.ts";
import type { NegotiationProposalDraftInput } from "../../negotiation/v1.ts";

const NEGOTIATION_PATH = "/api/v1/negotiation";

export async function handleNegotiationV1Route(
  request: Request,
  dependencies: NegotiationV1RouteDependencies,
): Promise<Response | null> {
  const path = normalizePath(new URL(request.url).pathname);
  if (path !== NEGOTIATION_PATH && !path.startsWith(`${NEGOTIATION_PATH}/`)) {
    return null;
  }
  const route = parseRoute(path);
  if (route === undefined) return new Response("Not Found", { status: 404 });
  let authenticated: NegotiationAuthenticatedContext | undefined;
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

type NegotiationRoute =
  | { readonly kind: "collection" }
  | { readonly kind: "round"; readonly roundId: string }
  | {
    readonly kind: "command";
    readonly roundId: string;
    readonly action: NegotiationAction;
    readonly childId?: string;
  };

type NegotiationAction =
  | "open"
  | "proposal"
  | "submit_proposal"
  | "counterproposal"
  | "approval"
  | "approve"
  | "delivery";

function parseRoute(path: string): NegotiationRoute | undefined {
  if (path === NEGOTIATION_PATH) return { kind: "collection" };
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 5 && parts[3] === "rounds") {
    return { kind: "round", roundId: parts[4] };
  }
  if (parts.length === 6 && parts[3] === "rounds") {
    const action = ({
      open: "open",
      proposals: "proposal",
      counterproposals: "counterproposal",
      approvals: "approval",
      deliveries: "delivery",
    } as const)[parts[5]];
    return action === undefined
      ? undefined
      : { kind: "command", roundId: parts[4], action };
  }
  if (
    parts.length === 8 && parts[3] === "rounds" && parts[5] === "proposals" &&
    parts[7] === "submit"
  ) {
    return {
      kind: "command",
      roundId: parts[4],
      action: "submit_proposal",
      childId: parts[6],
    };
  }
  if (
    parts.length === 8 && parts[3] === "rounds" && parts[5] === "approvals" &&
    parts[7] === "approve"
  ) {
    return {
      kind: "command",
      roundId: parts[4],
      action: "approve",
      childId: parts[6],
    };
  }
  return undefined;
}

async function dispatch(
  request: Request,
  route: NegotiationRoute,
  authenticated: NegotiationAuthenticatedContext,
  application: NegotiationV1Application,
): Promise<Response> {
  if (route.kind === "collection" && request.method === "POST") {
    return createRound(request, authenticated, application);
  }
  if (route.kind === "round" && request.method === "GET") {
    const round = await application.read(authenticated, route.roundId);
    return externalSuccess(round, authenticated.context.correlationId);
  }
  if (route.kind === "command" && request.method === "POST") {
    return runCommand(request, route, authenticated, application);
  }
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}

async function createRound(
  request: Request,
  authenticated: NegotiationAuthenticatedContext,
  application: NegotiationV1Application,
): Promise<Response> {
  const key = requiredIdempotency(request);
  const body = await jsonBody(request);
  const result = await application.service.createRound({
    context: authenticated.context,
    scope: application.scopeFor(authenticated.context),
    roundId: requiredString(body, "roundId"),
    negotiationId: requiredString(body, "negotiationId"),
    number: requiredNumber(body, "number"),
    actor: application.validateActor(authenticated),
    idempotencyKey: key,
  });
  return success(result, authenticated.context.correlationId, 201);
}

async function runCommand(
  request: Request,
  route: Extract<NegotiationRoute, { readonly kind: "command" }>,
  authenticated: NegotiationAuthenticatedContext,
  application: NegotiationV1Application,
): Promise<Response> {
  const key = requiredIdempotency(request);
  const version = requiredIfMatch(request);
  const input = application.commandInput(
    authenticated,
    route.roundId,
    version,
    key,
  );
  const body = await jsonBody(request);
  let result;
  if (route.action === "open") {
    result = await application.service.openRound(input);
  } else if (route.action === "proposal") {
    result = await application.service.createProposal(
      input,
      proposalDraft(body),
    );
  } else if (route.action === "submit_proposal") {
    result = await application.service.submitProposal(input, route.childId!);
  } else if (route.action === "counterproposal") {
    result = await application.service.counterProposal(input, {
      ...proposalDraft(body),
      inReplyToProposalId: requiredString(body, "inReplyToProposalId"),
    });
  } else if (route.action === "approval") {
    result = await application.service.requestApproval(input, {
      proposalId: requiredString(body, "proposalId"),
      approvalId: requiredString(body, "approvalId"),
      namedApproverId: requiredString(body, "namedApproverId"),
    });
  } else if (route.action === "approve") {
    const authorityInput = application.authorityCommandInput(
      authenticated,
      route.roundId,
      version,
      key,
      protectedCommand(body),
      optionalVersion(body, "expectedProposalVersion"),
    );
    result = await application.service.approveProposal(
      authorityInput,
      requiredString(body, "proposalId"),
      route.childId!,
    );
  } else {
    const authorityInput = application.authorityCommandInput(
      authenticated,
      route.roundId,
      version,
      key,
      protectedCommand(body),
      optionalVersion(body, "expectedProposalVersion"),
    );
    result = await application.service.requestDelivery(authorityInput, {
      proposalId: requiredString(body, "proposalId"),
      approvalId: requiredString(body, "approvalId"),
      ...(body.deliveryRequestId === undefined
        ? {}
        : { deliveryRequestId: requiredString(body, "deliveryRequestId") }),
    });
  }
  return success(result, authenticated.context.correlationId, 200);
}

function proposalDraft(
  body: Record<string, unknown>,
): NegotiationProposalDraftInput {
  const origin = body.origin;
  if (
    origin !== undefined && origin !== "human" &&
    origin !== "agent_recommendation" && origin !== "optimizer"
  ) {
    throw new NegotiationRequestError("Proposal origin is invalid.");
  }
  return {
    proposalId: requiredString(body, "proposalId"),
    fromParty: oneOf(body, "fromParty", ["buyer", "seller"] as const),
    terms: createNormalizedTerms(
      requiredTerms(body) as Parameters<typeof createNormalizedTerms>[0],
    ),
    ...(origin === undefined ? {} : { origin }),
    ...(body.inReplyToProposalId === undefined
      ? {}
      : { inReplyToProposalId: requiredString(body, "inReplyToProposalId") }),
  };
}

function oneOf<T extends string>(
  body: Record<string, unknown>,
  field: string,
  values: readonly T[],
): T {
  const value = body[field];
  if (typeof value === "string" && values.includes(value as T)) {
    return value as T;
  }
  throw new NegotiationRequestError(`Negotiation field "${field}" is invalid.`);
}

function optionalVersion(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value as import("../../platform/api/v1.ts").AggregateVersion;
  }
  throw new NegotiationRequestError(
    `Negotiation field "${field}" must be a positive aggregate version.`,
  );
}

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}
