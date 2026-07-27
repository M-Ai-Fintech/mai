import { z } from "zod";
import {
  AssignmentSide,
  Currency,
  DealPhase,
  DealStatus,
  DealType,
  jsonListSuccess,
  jsonSuccess,
  parsePaginationQuery,
} from "../contracts.ts";
import {
  bodyAsJson,
  HttpRouteError,
  methodNotAllowed,
  MvpRouteContext,
  uuid,
  validateId,
} from "./shared.ts";

const assignmentSide = z.nativeEnum(AssignmentSide);
const dealStatus = z.nativeEnum(DealStatus);
const dealPhase = z.nativeEnum(DealPhase);

const money = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.nativeEnum(Currency),
}).strict();

const valuationRange = z.object({ min: money, max: money }).strict()
  .superRefine((range, context) => {
    if (range.min.currency !== range.max.currency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Currencies must match",
        path: ["max", "currency"],
      });
    }
    if (BigInt(range.min.amountMinor) > BigInt(range.max.amountMinor)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum must be at least minimum",
        path: ["max", "amountMinor"],
      });
    }
  });

const dealWrite = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  dealType: z.nativeEnum(DealType),
  targetId: uuid,
  valuationRange,
  leadAdvisorId: uuid.nullable(),
  financialStructure: z.record(z.string(), z.unknown()).nullable(),
}).strict();

const dealPatch = dealWrite.partial().extend({
  version: z.number().int().positive(),
}).strict();

const phaseTransition = z.object({
  toPhase: dealPhase,
  comment: z.string().trim().min(1),
  version: z.number().int().positive(),
}).strict();

const assignmentWrite = z.object({
  teamMemberId: uuid,
  assignmentRole: z.string().trim().min(1),
  side: assignmentSide,
  isLead: z.boolean(),
}).strict();

const replaceAssignments = z.object({
  version: z.number().int().positive(),
  assignments: z.array(assignmentWrite),
}).strict();

export async function handleDealRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  return await handleDealCollection(context) ??
    await handlePhaseTransition(context) ??
    await handleDealResource(context) ??
    await handleAssignments(context);
}

async function handleDealCollection(
  context: MvpRouteContext,
): Promise<Response | null> {
  if (context.path !== "/api/deals") return null;
  if (context.method === "GET") return listDeals(context);
  if (context.method === "POST") {
    const input = dealWrite.parse(await bodyAsJson(context.request));
    return jsonSuccess(context.store.createDeal(input), { status: 201 });
  }
  return methodNotAllowed(["GET", "POST"]);
}

function listDeals(context: MvpRouteContext): Response {
  const { url, store } = context;
  const status = enumQuery(url, "status", dealStatus);
  const phase = enumQuery(url, "phase", dealPhase);
  const assignee = url.searchParams.get("assigneeId");
  const result = store.listDeals({
    ...parsePaginationQuery(url.searchParams),
    status,
    phase,
    assigneeId: assignee ? validateId(assignee, "assigneeId") : undefined,
  });
  return jsonListSuccess(result.data, result.meta);
}

function enumQuery<T>(
  url: URL,
  name: string,
  schema: z.ZodType<T>,
): T | undefined {
  const value = url.searchParams.get(name);
  if (!value) return undefined;
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new HttpRouteError(
    400,
    "INVALID_QUERY",
    `Unknown ${name} "${value}"; expected a supported ${name}.`,
  );
}

async function handlePhaseTransition(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path, method, request, store } = context;
  const phaseTransitionMatch = path.match(
    /^\/api\/deals\/([^/]+)\/phase-transitions$/,
  );
  if (!phaseTransitionMatch) return null;
  if (method !== "POST") return methodNotAllowed(["POST"]);
  const dealId = matchedDealId(phaseTransitionMatch);
  const input = phaseTransition.parse(await bodyAsJson(request));
  return jsonSuccess(store.transitionDealPhase(dealId, input));
}

async function handleDealResource(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path, method, request, store, url } = context;
  const dealMatch = path.match(/^\/api\/deals\/([^/]+)$/);
  if (!dealMatch) return null;
  const dealId = matchedDealId(dealMatch);
  if (method === "GET") return jsonSuccess(store.getDealDetail(dealId));
  if (method === "PATCH") {
    const input = dealPatch.parse(await bodyAsJson(request));
    return jsonSuccess(store.updateDeal(dealId, input));
  }
  if (method === "DELETE") {
    return jsonSuccess(store.archiveDeal(dealId, numericVersion(url)));
  }
  return methodNotAllowed(["GET", "PATCH", "DELETE"]);
}

async function handleAssignments(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path, method, store } = context;
  const assignmentsMatch = path.match(
    /^\/api\/deals\/([^/]+)\/team-assignments$/,
  );
  if (!assignmentsMatch) return null;
  const dealId = matchedDealId(assignmentsMatch);
  if (method === "GET") {
    return jsonSuccess(store.getTeamAssignments(dealId));
  }
  if (method !== "PUT") return methodNotAllowed(["GET", "PUT"]);
  return await replaceTeamAssignments(context, dealId);
}

async function replaceTeamAssignments(
  context: MvpRouteContext,
  dealId: string,
): Promise<Response> {
  const input = replaceAssignments.parse(await bodyAsJson(context.request));
  const result = context.store.putTeamAssignments(
    dealId,
    input.version,
    input.assignments,
  );
  return assignmentResponse(result);
}

function assignmentResponse(
  result: ReturnType<MvpRouteContext["store"]["putTeamAssignments"]>,
): Response {
  return jsonSuccess(result.data, {
    headers: { "x-resource-version": String(result.version) },
  });
}

function matchedDealId(match: RegExpMatchArray): string {
  return validateId(decodeURIComponent(match[1]), "dealId");
}

function numericVersion(url: URL): number | undefined {
  const value = url.searchParams.get("version");
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
