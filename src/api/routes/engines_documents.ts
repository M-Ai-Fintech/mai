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
  const documents = sampleVdrDocuments(dealId);
  const query = parsePaginationQuery(url.searchParams);
  const start = (query.page - 1) * query.pageSize;
  return jsonListSuccess(documents.slice(start, start + query.pageSize), {
    ...query,
    total: documents.length,
    totalPages: Math.ceil(documents.length / query.pageSize),
  });
}

function sampleVdrDocuments(dealId: string): VdrDocument[] {
  const shared = { dealId, mimeType: "application/pdf" };
  return [
    {
      ...shared,
      id: "00000000-0000-4000-8000-000000000061",
      name: "FY25 Financial Statements.pdf",
      sizeBytes: 1_842_000,
      createdAt: "2026-07-19T12:00:00.000Z",
    },
    {
      ...shared,
      id: "00000000-0000-4000-8000-000000000062",
      name: "Material Contracts.pdf",
      sizeBytes: 924_000,
      createdAt: "2026-07-19T12:01:00.000Z",
    },
  ];
}

export async function handleEngineAndDocumentRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  return await handleEngineRuns(context) ??
    handleVdrDocuments(context) ??
    await handleGeneratedDocuments(context);
}

async function handleEngineRuns(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path } = context;
  const engineMatch = path.match(/^\/api\/deals\/([^/]+)\/engine-runs$/);
  if (!engineMatch) return null;
  const dealId = matchedDealId(engineMatch);
  if (context.method === "GET") return listEngineRuns(context, dealId);
  if (context.method === "POST") {
    return await runRequestedEngine(context, dealId);
  }
  return methodNotAllowed(["GET", "POST"]);
}

function listEngineRuns(context: MvpRouteContext, dealId: string): Response {
  const { url, store } = context;
  const engine = parsedEngine(url.searchParams.get("engine"));
  const result = store.listEngineRuns(dealId, {
    ...parsePaginationQuery(url.searchParams),
    engine,
  });
  return jsonListSuccess(result.data, result.meta);
}

function parsedEngine(value: string | null): EngineKind | undefined {
  if (!value) return undefined;
  const parsed = engineKind.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new HttpRouteError(
    400,
    "INVALID_QUERY",
    `Unknown engine "${value}"; expected a supported engine kind.`,
  );
}

async function runRequestedEngine(
  context: MvpRouteContext,
  dealId: string,
): Promise<Response> {
  const input = createEngineRun.parse(await bodyAsJson(context.request));
  const queued = context.store.createEngineRun(
    dealId,
    input.engine,
    input.input,
  );
  return await executeEngine(context, dealId, queued.id, input);
}

async function executeEngine(
  context: MvpRouteContext,
  dealId: string,
  runId: string,
  input: z.infer<typeof createEngineRun>,
): Promise<Response> {
  try {
    const result = await context.runEngine({ dealId, ...input });
    return completedEngineResponse(
      context.store,
      dealId,
      runId,
      recordResult(result),
    );
  } catch (error: unknown) {
    return failedEngineResponse(context.store, dealId, runId, error);
  }
}

function completedEngineResponse(
  store: MvpStore,
  dealId: string,
  runId: string,
  result: Record<string, unknown>,
): Response {
  const completed = store.updateEngineRun(dealId, runId, {
    status: EngineRunStatus.Completed,
    result,
  });
  return jsonSuccess(completed, { status: 201 });
}

function recordResult(result: unknown): Record<string, unknown> {
  return typeof result === "object" && result !== null && !Array.isArray(result)
    ? result as Record<string, unknown>
    : { value: result };
}

function failedEngineResponse(
  store: MvpStore,
  dealId: string,
  runId: string,
  error: unknown,
): Response {
  const message = error instanceof Error ? error.message : String(error);
  const failed = store.updateEngineRun(dealId, runId, {
    status: EngineRunStatus.Failed,
    error: { code: "ENGINE_EXECUTION_FAILED", message },
  });
  return jsonSuccess(failed, { status: 201 });
}

function handleVdrDocuments(context: MvpRouteContext): Response | null {
  const { path, method, store, url } = context;
  const vdrMatch = path.match(/^\/api\/deals\/([^/]+)\/vdr-documents$/);
  if (!vdrMatch) return null;
  if (method !== "GET") return methodNotAllowed(["GET"]);
  return listVdrDocuments(store, matchedDealId(vdrMatch), url);
}

async function handleGeneratedDocuments(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path, method, request, store, url } = context;
  const documentsMatch = path.match(/^\/api\/deals\/([^/]+)\/documents$/);
  if (!documentsMatch) return null;
  if (method !== "POST") return methodNotAllowed(["POST"]);
  const dealId = matchedDealId(documentsMatch);
  const input = createDocument.parse(await bodyAsJson(request));
  assertCompletedSourceRun(store, dealId, input.sourceRunId);
  const document = await context.createDocument({ dealId, ...input });
  assertDocumentScope(document, dealId, input.sourceRunId);
  return jsonSuccess({
    ...document,
    downloadUrl: new URL(document.downloadUrl, url.origin).toString(),
  }, { status: 201 });
}

function assertCompletedSourceRun(
  store: MvpStore,
  dealId: string,
  sourceRunId: string,
): void {
  const runs = store.listEngineRuns(dealId, { page: 1, pageSize: 100 }).data;
  const source = runs.find((run) => run.id === sourceRunId);
  if (!source) throw missingSourceRun(sourceRunId, dealId);
  if (source.status === EngineRunStatus.Completed) return;
  throw incompleteSourceRun(sourceRunId, source.status);
}

function missingSourceRun(sourceRunId: string, dealId: string): HttpRouteError {
  return new HttpRouteError(
    404,
    "ENGINE_RUN_NOT_FOUND",
    `Source engine run "${sourceRunId}" was not found; expected a run for deal "${dealId}".`,
  );
}

function incompleteSourceRun(
  sourceRunId: string,
  status: EngineRunStatus,
): HttpRouteError {
  return new HttpRouteError(
    409,
    "ENGINE_RUN_NOT_COMPLETED",
    `Source engine run "${sourceRunId}" has status "${status}"; expected "completed".`,
  );
}

function assertDocumentScope(
  document: { dealId: string; sourceRunId: string },
  dealId: string,
  sourceRunId: string,
): void {
  if (document.dealId === dealId && document.sourceRunId === sourceRunId) {
    return;
  }
  throw new HttpRouteError(
    500,
    "DOCUMENT_CONTRACT_ERROR",
    `Generated document has deal "${document.dealId}" and run "${document.sourceRunId}"; expected deal "${dealId}" and run "${sourceRunId}".`,
  );
}

function matchedDealId(match: RegExpMatchArray): string {
  return validateId(decodeURIComponent(match[1]), "dealId");
}
