import { z } from "zod";
import {
  EngineKind,
  EngineRunStatus,
  GeneratedDocumentType,
  jsonListSuccess,
  jsonSuccess,
  parsePaginationQuery,
  VdrDocument,
} from "../contracts.ts";
import { MvpStore } from "../mvp_store.ts";
import {
  bodyAsJson,
  HttpRouteError,
  methodNotAllowed,
  MvpRouteContext,
  uuid,
  validateId,
} from "./shared.ts";

const engineKind = z.nativeEnum(EngineKind);

const createEngineRun = z.object({
  engine: engineKind,
  input: z.record(z.string(), z.unknown()),
}).strict();

const createDocument = z.object({
  documentType: z.nativeEnum(GeneratedDocumentType),
  sourceRunId: uuid,
}).strict();

function listVdrDocuments(store: MvpStore, dealId: string, url: URL): Response {
  store.getTeamAssignments(dealId);
  const documents: VdrDocument[] = [{
    id: "00000000-0000-4000-8000-000000000061",
    dealId,
    name: "FY25 Financial Statements.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_842_000,
    createdAt: "2026-07-19T12:00:00.000Z",
  }, {
    id: "00000000-0000-4000-8000-000000000062",
    dealId,
    name: "Material Contracts.pdf",
    mimeType: "application/pdf",
    sizeBytes: 924_000,
    createdAt: "2026-07-19T12:01:00.000Z",
  }];
  const query = parsePaginationQuery(url.searchParams);
  const start = (query.page - 1) * query.pageSize;
  return jsonListSuccess(documents.slice(start, start + query.pageSize), {
    ...query,
    total: documents.length,
    totalPages: Math.ceil(documents.length / query.pageSize),
  });
}

export async function handleEngineAndDocumentRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  const {
    request,
    url,
    path,
    method,
    store,
    runEngine,
    createDocument: createDocumentResource,
  } = context;

  const engineMatch = path.match(/^\/api\/deals\/([^/]+)\/engine-runs$/);
  if (engineMatch) {
    const dealId = validateId(decodeURIComponent(engineMatch[1]), "dealId");
    if (method === "GET") {
      const query = parsePaginationQuery(url.searchParams);
      const engineValue = url.searchParams.get("engine");
      const engine = engineValue ? engineKind.safeParse(engineValue) : null;
      if (engine && !engine.success) {
        throw new HttpRouteError(400, "INVALID_QUERY", "Unknown engine");
      }
      const result = store.listEngineRuns(dealId, {
        ...query,
        engine: engine?.success ? engine.data : undefined,
      });
      return jsonListSuccess(result.data, result.meta);
    }
    if (method === "POST") {
      const input = createEngineRun.parse(await bodyAsJson(request));
      const queued = store.createEngineRun(dealId, input.engine, input.input);
      try {
        const result = await runEngine({
          dealId,
          engine: input.engine,
          input: input.input,
        });
        const completed = store.updateEngineRun(dealId, queued.id, {
          status: EngineRunStatus.Completed,
          result,
        });
        return jsonSuccess(completed, { status: 201 });
      } catch (cause) {
        const message = cause instanceof Error
          ? cause.message
          : "Engine execution failed";
        const failed = store.updateEngineRun(dealId, queued.id, {
          status: EngineRunStatus.Failed,
          error: { code: "ENGINE_EXECUTION_FAILED", message },
        });
        return jsonSuccess(failed, { status: 201 });
      }
    }
    return methodNotAllowed(["GET", "POST"]);
  }

  const vdrMatch = path.match(/^\/api\/deals\/([^/]+)\/vdr-documents$/);
  if (vdrMatch) {
    const dealId = validateId(decodeURIComponent(vdrMatch[1]), "dealId");
    if (method !== "GET") return methodNotAllowed(["GET"]);
    return listVdrDocuments(store, dealId, url);
  }

  const documentsMatch = path.match(/^\/api\/deals\/([^/]+)\/documents$/);
  if (documentsMatch) {
    const dealId = validateId(
      decodeURIComponent(documentsMatch[1]),
      "dealId",
    );
    if (method !== "POST") return methodNotAllowed(["POST"]);
    const input = createDocument.parse(await bodyAsJson(request));
    const sourceRun = store.listEngineRuns(dealId, { page: 1, pageSize: 100 })
      .data
      .find((run) => run.id === input.sourceRunId);
    if (!sourceRun) {
      throw new HttpRouteError(
        404,
        "ENGINE_RUN_NOT_FOUND",
        "Source engine run not found",
      );
    }
    if (sourceRun.status !== EngineRunStatus.Completed) {
      throw new HttpRouteError(
        409,
        "ENGINE_RUN_NOT_COMPLETED",
        "Source engine run is not completed",
      );
    }
    const document = await createDocumentResource({ dealId, ...input });
    if (
      document.dealId !== dealId || document.sourceRunId !== input.sourceRunId
    ) {
      throw new HttpRouteError(
        500,
        "DOCUMENT_CONTRACT_ERROR",
        "Generated document scope is invalid",
      );
    }
    return jsonSuccess({
      ...document,
      downloadUrl: new URL(document.downloadUrl, url.origin).toString(),
    }, { status: 201 });
  }

  return null;
}
