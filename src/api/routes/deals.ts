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
  const { request, url, path, method, store } = context;

  if (path === "/api/deals") {
    if (method === "GET") {
      const query = parsePaginationQuery(url.searchParams);
      const statusValue = url.searchParams.get("status");
      const phaseValue = url.searchParams.get("phase");
      const status = statusValue ? dealStatus.safeParse(statusValue) : null;
      const phase = phaseValue ? dealPhase.safeParse(phaseValue) : null;
      if (status && !status.success) {
        throw new HttpRouteError(400, "INVALID_QUERY", "Unknown deal status");
      }
      if (phase && !phase.success) {
        throw new HttpRouteError(400, "INVALID_QUERY", "Unknown deal phase");
      }
      const assigneeValue = url.searchParams.get("assigneeId");
      const assigneeId = assigneeValue
        ? validateId(assigneeValue, "assigneeId")
        : undefined;
      const result = store.listDeals({
        ...query,
        status: status?.success ? status.data : undefined,
        phase: phase?.success ? phase.data : undefined,
        assigneeId,
      });
      return jsonListSuccess(result.data, result.meta);
    }
    if (method === "POST") {
      const input = dealWrite.parse(await bodyAsJson(request));
      return jsonSuccess(store.createDeal(input), { status: 201 });
    }
    return methodNotAllowed(["GET", "POST"]);
  }

  const phaseTransitionMatch = path.match(
    /^\/api\/deals\/([^/]+)\/phase-transitions$/,
  );
  if (phaseTransitionMatch) {
    const dealId = validateId(
      decodeURIComponent(phaseTransitionMatch[1]),
      "dealId",
    );
    if (method !== "POST") return methodNotAllowed(["POST"]);
    const input = phaseTransition.parse(await bodyAsJson(request));
    return jsonSuccess(store.transitionDealPhase(dealId, input));
  }

  const dealMatch = path.match(/^\/api\/deals\/([^/]+)$/);
  if (dealMatch) {
    const dealId = validateId(decodeURIComponent(dealMatch[1]), "dealId");
    if (method === "GET") return jsonSuccess(store.getDealDetail(dealId));
    if (method === "PATCH") {
      const input = dealPatch.parse(await bodyAsJson(request));
      return jsonSuccess(store.updateDeal(dealId, input));
    }
    if (method === "DELETE") {
      const versionValue = url.searchParams.get("version");
      const version = versionValue && /^\d+$/.test(versionValue)
        ? Number(versionValue)
        : undefined;
      return jsonSuccess(store.archiveDeal(dealId, version));
    }
    return methodNotAllowed(["GET", "PATCH", "DELETE"]);
  }

  const assignmentsMatch = path.match(
    /^\/api\/deals\/([^/]+)\/team-assignments$/,
  );
  if (assignmentsMatch) {
    const dealId = validateId(
      decodeURIComponent(assignmentsMatch[1]),
      "dealId",
    );
    if (method === "GET") {
      return jsonSuccess(store.getTeamAssignments(dealId));
    }
    if (method === "PUT") {
      const input = replaceAssignments.parse(await bodyAsJson(request));
      const result = store.putTeamAssignments(
        dealId,
        input.version,
        input.assignments,
      );
      return jsonSuccess(result.data, {
        headers: { "x-resource-version": String(result.version) },
      });
    }
    return methodNotAllowed(["GET", "PUT"]);
  }

  return null;
}
