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
  version: z.number().int().positive().optional(),
}).strict();

const entityPatch = entityWrite.partial().extend({
  version: z.number().int().positive(),
}).strict();

export async function handleEntitiesAndTeamRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { request, url, path, method, store } = context;

  if (path === "/api/entities") {
    if (method === "GET") {
      const query = parsePaginationQuery(url.searchParams);
      const roleValue = url.searchParams.get("role");
      const role = roleValue ? entityRole.safeParse(roleValue) : null;
      if (role && !role.success) {
        throw new HttpRouteError(400, "INVALID_QUERY", "Unknown entity role");
      }
      const result = store.listEntities({
        ...query,
        role: role?.success ? role.data : undefined,
        sector: url.searchParams.get("sector") || undefined,
        countryCode: url.searchParams.get("countryCode") || undefined,
        includeArchived: parseBooleanQuery(
          url.searchParams.get("includeArchived"),
        ),
      });
      return jsonListSuccess(result.data, result.meta);
    }
    if (method === "POST") {
      const input = entityWrite.parse(await bodyAsJson(request));
      return jsonSuccess(store.createEntity(input), { status: 201 });
    }
    return methodNotAllowed(["GET", "POST"]);
  }

  const entityMatch = path.match(/^\/api\/entities\/([^/]+)$/);
  if (entityMatch) {
    const id = validateId(decodeURIComponent(entityMatch[1]), "entityId");
    if (method === "GET") return jsonSuccess(store.getEntity(id));
    if (method === "PATCH") {
      const patch = entityPatch.parse(await bodyAsJson(request));
      return jsonSuccess(store.updateEntity(id, patch));
    }
    if (method === "DELETE") {
      const versionValue = url.searchParams.get("version");
      const version = versionValue && /^\d+$/.test(versionValue)
        ? Number(versionValue)
        : undefined;
      return jsonSuccess(store.archiveEntity(id, version));
    }
    return methodNotAllowed(["GET", "PATCH", "DELETE"]);
  }

  const dossierMatch = path.match(/^\/api\/entities\/([^/]+)\/dossier$/);
  if (dossierMatch) {
    const id = validateId(decodeURIComponent(dossierMatch[1]), "entityId");
    if (method === "GET") return jsonSuccess(store.getDossier(id));
    if (method === "PUT") {
      const patch = targetDossierPatch.parse(await bodyAsJson(request));
      return jsonSuccess(store.updateDossier(id, patch));
    }
    return methodNotAllowed(["GET", "PUT"]);
  }

  if (path === "/api/team-members") {
    if (method !== "GET") return methodNotAllowed(["GET"]);
    const query = parsePaginationQuery(url.searchParams);
    const result = store.listTeamMembers({
      ...query,
      role: url.searchParams.get("role") || undefined,
      active: parseBooleanQuery(url.searchParams.get("active")),
    });
    return jsonListSuccess(result.data, result.meta);
  }

  return null;
}
