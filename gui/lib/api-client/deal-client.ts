import { z } from "zod";

import { jsonObjectSchema } from "./common-schemas";
import {
  dealCreateSchema,
  dealDetailSchema,
  dealSummarySchema,
  dealUpdateSchema,
  phaseTransitionSchema,
} from "./deal-schemas";
import {
  legacyDealDetailSchema,
  legacyDealSummarySchema,
} from "./legacy-schemas";
import {
  createEnvelopeSchema,
  createPageSchema,
  fetchWithRetry,
  jsonOptions,
  parseResponse,
  pathSegment,
  request,
  withQuery,
} from "./transport";
import type {
  DealCreate,
  DealDetail,
  DealListQuery,
  DealSummary,
  DealUpdate,
  Page,
  PhaseTransition,
} from "./types";

export function listDeals(
  query: DealListQuery = {},
): Promise<Page<DealSummary>> {
  return request(
    withQuery("/api/deals", query),
    createPageSchema(dealSummarySchema),
  );
}

export async function getDeals(): Promise<
  DealSummary[] | z.infer<typeof legacyDealSummarySchema>[]
> {
  const response = await fetchWithRetry(withQuery("/api/deals"));
  const payload = await parseResponse(response, legacyDealListSchema());
  return Array.isArray(payload) ? payload : payload.data;
}

function legacyDealListSchema(): z.ZodType<
  Page<DealSummary> | z.infer<typeof legacyDealSummarySchema>[]
> {
  return z.union([
    createPageSchema(dealSummarySchema),
    z.array(legacyDealSummarySchema),
  ]);
}

export async function getDealById(
  id: string,
): Promise<DealDetail | z.infer<typeof legacyDealDetailSchema>> {
  const response = await fetchWithRetry(
    withQuery(`/api/deals/${pathSegment(id)}`),
  );
  const payload = await parseResponse(response, legacyDealDetailUnionSchema());
  return "data" in payload ? payload.data : payload;
}

function legacyDealDetailUnionSchema(): z.ZodType<
  { data: DealDetail } | z.infer<typeof legacyDealDetailSchema>
> {
  return z.union([
    createEnvelopeSchema(dealDetailSchema),
    legacyDealDetailSchema,
  ]);
}

export async function getDealDetail(id: string): Promise<DealDetail> {
  const response = await request(
    `/api/deals/${pathSegment(id)}`,
    createEnvelopeSchema(dealDetailSchema),
  );
  return response.data;
}

export async function createDeal(
  data: DealCreate,
  signal?: AbortSignal,
): Promise<DealDetail> {
  const body = dealCreateSchema.parse(data);
  const response = await request(
    "/api/deals",
    createEnvelopeSchema(dealDetailSchema),
    jsonOptions("POST", body, signal),
  );
  return response.data;
}

export async function updateDeal(
  id: string,
  data: DealUpdate,
  signal?: AbortSignal,
): Promise<DealDetail> {
  const body = dealUpdateSchema.parse(data);
  const response = await request(
    `/api/deals/${pathSegment(id)}`,
    createEnvelopeSchema(dealDetailSchema),
    jsonOptions("PATCH", body, signal),
  );
  return response.data;
}

export async function archiveDeal(
  id: string,
  version?: number,
  signal?: AbortSignal,
): Promise<DealDetail> {
  const response = await request(
    withQuery(`/api/deals/${pathSegment(id)}`, { version }),
    createEnvelopeSchema(dealDetailSchema),
    { method: "DELETE", signal },
  );
  return response.data;
}

export async function transitionDealPhase(
  id: string,
  data: PhaseTransition,
  signal?: AbortSignal,
): Promise<DealDetail> {
  const body = phaseTransitionSchema.parse(data);
  const response = await request(
    `/api/deals/${pathSegment(id)}/phase-transitions`,
    createEnvelopeSchema(dealDetailSchema),
    jsonOptions("POST", body, signal),
  );
  return response.data;
}

export async function updateDealPhase(
  id: string,
  phaseId: string,
): Promise<Record<string, unknown>> {
  const response = await fetchWithRetry(
    withQuery(`/api/deals/${pathSegment(id)}/phase`),
    jsonOptions("POST", legacyPhaseBody(phaseId)),
  );
  return parseResponse(response, jsonObjectSchema);
}

function legacyPhaseBody(phaseId: string): Record<string, string> {
  return {
    phaseName: phaseId,
    phaseId,
    statusName: "In Progress",
  };
}
