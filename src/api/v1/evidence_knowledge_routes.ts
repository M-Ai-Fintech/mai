import {
  API_ERROR_CATALOG,
  createSuccessEnvelope,
  type ErrorEnvelope,
  type RequestContext,
} from "../../platform/api/v1.ts";
import {
  parseCalculationId,
  parseCitationId,
  parseEvidenceId,
  parseFactId,
} from "../../evidence_knowledge/v1.ts";
import { EvidenceKnowledgeV1Application } from "./evidence_knowledge.ts";

const BASE_PATH = "/api/v1/evidence-knowledge";
export interface EvidenceKnowledgeRequestContextPort {
  contextFor(request: Request): Promise<RequestContext> | RequestContext;
}
export interface EvidenceKnowledgeV1RouteDependencies {
  readonly context: EvidenceKnowledgeRequestContextPort;
  readonly application: EvidenceKnowledgeV1Application;
}

export async function handleEvidenceKnowledgeV1Route(
  request: Request,
  dependencies: EvidenceKnowledgeV1RouteDependencies,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = resourcePath(url.pathname);
  if (match === undefined) {
    return url.pathname === BASE_PATH ||
        url.pathname.startsWith(`${BASE_PATH}/`)
      ? methodNotAllowed()
      : null;
  }
  if (request.method !== "GET") return methodNotAllowed();
  const context = await dependencies.context.contextFor(request);
  const result = match.kind === "evidence"
    ? await readEvidence(context, match.id, dependencies.application)
    : match.kind === "citation"
    ? await readCitation(context, match.id, dependencies.application)
    : match.kind === "fact"
    ? await readFact(context, match.id, dependencies.application)
    : await readCalculation(context, match.id, dependencies.application);
  if (result.kind === "error") return errorResponse(result.error);
  return Response.json(
    createSuccessEnvelope(result.value.value, {
      correlationId: context.correlationId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Correlation-Id": context.correlationId,
        ETag: result.value.etag,
      },
    },
  );
}

function resourcePath(
  path: string,
): {
  readonly kind: "evidence";
  readonly id: import("../../evidence_knowledge/ids.ts").EvidenceId;
} | {
  readonly kind: "citation";
  readonly id: import("../../evidence_knowledge/ids.ts").CitationId;
} | {
  readonly kind: "fact";
  readonly id: import("../../evidence_knowledge/ids.ts").FactId;
} | {
  readonly kind: "calculation";
  readonly id: import("../../evidence_knowledge/ids.ts").CalculationId;
} | undefined {
  const match = new RegExp(
    `^${BASE_PATH}/(evidence|citations|facts|calculations)/([^/]+)$`,
  ).exec(path.replace(/\/+$/, ""));
  if (match === null) return undefined;
  const id = decodeURIComponent(match[2]);
  if (match[1] === "evidence") {
    const parsed = parseEvidenceId(id);
    return parsed.ok ? { kind: "evidence", id: parsed.value } : undefined;
  }
  if (match[1] === "citations") {
    const parsed = parseCitationId(id);
    return parsed.ok ? { kind: "citation", id: parsed.value } : undefined;
  }
  if (match[1] === "facts") {
    const parsed = parseFactId(id);
    return parsed.ok ? { kind: "fact", id: parsed.value } : undefined;
  }
  const parsed = parseCalculationId(id);
  return parsed.ok ? { kind: "calculation", id: parsed.value } : undefined;
}
function readEvidence(
  context: RequestContext,
  id: import("../../evidence_knowledge/ids.ts").EvidenceId,
  application: EvidenceKnowledgeV1Application,
) {
  return application.readEvidence(context, id);
}
function readCitation(
  context: RequestContext,
  id: import("../../evidence_knowledge/ids.ts").CitationId,
  application: EvidenceKnowledgeV1Application,
) {
  return application.readCitation(context, id);
}
function readFact(
  context: RequestContext,
  id: import("../../evidence_knowledge/ids.ts").FactId,
  application: EvidenceKnowledgeV1Application,
) {
  return application.readFact(context, id);
}
function readCalculation(
  context: RequestContext,
  id: import("../../evidence_knowledge/ids.ts").CalculationId,
  application: EvidenceKnowledgeV1Application,
) {
  return application.readCalculation(context, id);
}
function errorResponse(error: ErrorEnvelope): Response {
  return Response.json(error, {
    status: API_ERROR_CATALOG[error.error.code].httpStatus,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Correlation-Id": error.error.correlationId,
    },
  });
}
function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET" } });
}
