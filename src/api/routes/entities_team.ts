import { z } from "zod";
import {
  EntityRole,
  jsonListSuccess,
  jsonSuccess,
  KybStatus,
  parseBooleanQuery,
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

const entityRole = z.nativeEnum(EntityRole);
const kybStatus = z.nativeEnum(KybStatus);

const entityWrite = z.object({
  legalName: z.string().trim().min(1),
  taxId: z.string().trim().min(1),
  sector: z.string().trim().min(1),
  countryCode: z.string().trim().regex(/^[A-Z]{2}$/),
  roles: z.array(entityRole).min(1),
  contactEmail: z.string().email(),
  kybStatus,
  regulatoryClearanceRequired: z.boolean(),
  primaryAdvisorId: uuid.nullable(),
}).strict();

const targetDossierPatch = z.object({
  executiveSummary: z.string().optional(),
  corporateStructure: z.string().optional(),
  financialHealth: z.string().optional(),
  litigationRisks: z.string().optional(),
  marketPosition: z.string().optional(),
  version: z.number().int().positive(),
}).strict();

const entityPatch = entityWrite.partial().extend({
  version: z.number().int().positive(),
}).strict();

export async function handleEntitiesAndTeamRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  return await handleEntityCollection(context) ??
    await handleEntityResource(context) ??
    await handleDossier(context) ??
    handleTeamMembers(context);
}

async function handleEntityCollection(
  context: MvpRouteContext,
): Promise<Response | null> {
  if (context.path !== "/api/entities") return null;
  if (context.method === "GET") return listEntities(context);
  if (context.method === "POST") {
    const input = entityWrite.parse(await bodyAsJson(context.request));
    return jsonSuccess(context.store.createEntity(input), { status: 201 });
  }
  return methodNotAllowed(["GET", "POST"]);
}

function listEntities(context: MvpRouteContext): Response {
  const { url, store } = context;
  const role = parseEntityRole(url.searchParams.get("role"));
  const result = store.listEntities({
    ...parsePaginationQuery(url.searchParams),
    role,
    sector: url.searchParams.get("sector") || undefined,
    countryCode: url.searchParams.get("countryCode") || undefined,
    includeArchived: parseBooleanQuery(url.searchParams.get("includeArchived")),
  });
  return jsonListSuccess(result.data, result.meta);
}

function parseEntityRole(value: string | null): EntityRole | undefined {
  if (!value) return undefined;
  const parsed = entityRole.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new HttpRouteError(
    400,
    "INVALID_QUERY",
    `Unknown entity role "${value}"; expected a supported entity role.`,
  );
}

async function handleEntityResource(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path, method, request, store, url } = context;
  const entityMatch = path.match(/^\/api\/entities\/([^/]+)$/);
  if (!entityMatch) return null;
  const id = matchedEntityId(entityMatch);
  if (method === "GET") return jsonSuccess(store.getEntity(id));
  if (method === "PATCH") {
    const patch = entityPatch.parse(await bodyAsJson(request));
    return jsonSuccess(store.updateEntity(id, patch));
  }
  if (method === "DELETE") {
    return jsonSuccess(store.archiveEntity(id, numericVersion(url)));
  }
  return methodNotAllowed(["GET", "PATCH", "DELETE"]);
}

async function handleDossier(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { path, method, request, store } = context;
  const dossierMatch = path.match(/^\/api\/entities\/([^/]+)\/dossier$/);
  if (!dossierMatch) return null;
  const id = matchedEntityId(dossierMatch);
  if (method === "GET") return jsonSuccess(store.getDossier(id));
  if (method === "PUT") {
    const patch = targetDossierPatch.parse(await bodyAsJson(request));
    return jsonSuccess(store.updateDossier(id, patch));
  }
  return methodNotAllowed(["GET", "PUT"]);
}

function handleTeamMembers(context: MvpRouteContext): Response | null {
  const { path, method, url, store } = context;
  if (path !== "/api/team-members") return null;
  if (method !== "GET") return methodNotAllowed(["GET"]);
  const result = store.listTeamMembers({
    ...parsePaginationQuery(url.searchParams),
    role: url.searchParams.get("role") || undefined,
    active: parseBooleanQuery(url.searchParams.get("active")),
  });
  return jsonListSuccess(result.data, result.meta);
}

function matchedEntityId(match: RegExpMatchArray): string {
  return validateId(decodeURIComponent(match[1]), "entityId");
}

function numericVersion(url: URL): number | undefined {
  const value = url.searchParams.get("version");
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
