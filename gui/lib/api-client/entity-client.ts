import { z } from "zod";

import {
  entityDetailSchema,
  entitySummarySchema,
  entityUpdateSchema,
  entityWriteSchema,
  targetDossierSchema,
  updateTargetDossierSchema,
} from "./entity-schemas";
import {
  replaceAssignmentsSchema,
  teamAssignmentSchema,
  teamMemberSchema,
} from "./team-schemas";
import {
  createEnvelopeSchema,
  createPageSchema,
  jsonOptions,
  pathSegment,
  request,
  withQuery,
} from "./transport";
import type {
  EntityDetail,
  EntityListQuery,
  EntitySummary,
  EntityUpdate,
  EntityWrite,
  Page,
  TargetDossier,
  TeamAssignment,
  TeamMember,
  TeamMemberListQuery,
} from "./types";

export function listEntities(
  query: EntityListQuery = {},
): Promise<Page<EntitySummary>> {
  return request(
    withQuery("/api/entities", query),
    createPageSchema(entitySummarySchema),
  );
}

export async function getTargetDossier(
  entityId: string,
): Promise<TargetDossier> {
  const response = await request(
    `/api/entities/${pathSegment(entityId)}/dossier`,
    createEnvelopeSchema(targetDossierSchema),
  );
  return response.data;
}

export async function updateTargetDossier(
  entityId: string,
  data: z.infer<typeof updateTargetDossierSchema>,
  signal?: AbortSignal,
): Promise<TargetDossier> {
  const body = updateTargetDossierSchema.parse(data);
  const response = await request(
    `/api/entities/${pathSegment(entityId)}/dossier`,
    createEnvelopeSchema(targetDossierSchema),
    jsonOptions("PUT", body, signal),
  );
  return response.data;
}

export async function getEntityById(id: string): Promise<EntityDetail> {
  const response = await request(
    `/api/entities/${pathSegment(id)}`,
    createEnvelopeSchema(entityDetailSchema),
  );
  return response.data;
}

export async function createEntity(
  data: EntityWrite,
  signal?: AbortSignal,
): Promise<EntityDetail> {
  const body = entityWriteSchema.parse(data);
  const response = await request(
    "/api/entities",
    createEnvelopeSchema(entityDetailSchema),
    jsonOptions("POST", body, signal),
  );
  return response.data;
}

export async function updateEntity(
  id: string,
  data: EntityUpdate,
  signal?: AbortSignal,
): Promise<EntityDetail> {
  const body = entityUpdateSchema.parse(data);
  const response = await request(
    `/api/entities/${pathSegment(id)}`,
    createEnvelopeSchema(entityDetailSchema),
    jsonOptions("PATCH", body, signal),
  );
  return response.data;
}

export async function archiveEntity(
  id: string,
  version?: number,
  signal?: AbortSignal,
): Promise<EntityDetail> {
  const response = await request(
    withQuery(`/api/entities/${pathSegment(id)}`, { version }),
    createEnvelopeSchema(entityDetailSchema),
    { method: "DELETE", signal },
  );
  return response.data;
}

export function listTeamMembers(
  query: TeamMemberListQuery = {},
): Promise<Page<TeamMember>> {
  return request(
    withQuery("/api/team-members", query),
    createPageSchema(teamMemberSchema),
  );
}

export async function getDealTeamAssignments(
  dealId: string,
): Promise<TeamAssignment[]> {
  const response = await request(
    `/api/deals/${pathSegment(dealId)}/team-assignments`,
    createEnvelopeSchema(z.array(teamAssignmentSchema)),
  );
  return response.data;
}

export async function replaceDealTeamAssignments(
  dealId: string,
  data: z.infer<typeof replaceAssignmentsSchema>,
  signal?: AbortSignal,
): Promise<TeamAssignment[]> {
  const body = replaceAssignmentsSchema.parse(data);
  const response = await request(
    `/api/deals/${pathSegment(dealId)}/team-assignments`,
    createEnvelopeSchema(z.array(teamAssignmentSchema)),
    jsonOptions("PUT", body, signal),
  );
  return response.data;
}
