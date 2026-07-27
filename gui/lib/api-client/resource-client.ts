import { z } from "zod";

import {
  createDocumentResourceSchema,
  createEngineRunSchema,
  dashboardLayoutSchema,
  dashboardLayoutWriteSchema,
  engineRunSchema,
  generatedDocumentSchema,
  notificationSchema,
  vdrDocumentSchema,
} from "./resource-schemas";
import {
  createEnvelopeSchema,
  createPageSchema,
  jsonOptions,
  pathSegment,
  request,
  withQuery,
} from "./transport";
import type {
  DashboardLayout,
  EngineRun,
  EngineRunListQuery,
  Notification,
  Page,
} from "./types";

export async function runDealEngine(
  dealId: string,
  data: z.infer<typeof createEngineRunSchema>,
  signal?: AbortSignal,
): Promise<EngineRun> {
  const body = createEngineRunSchema.parse(data);
  const response = await request(
    `/api/deals/${pathSegment(dealId)}/engine-runs`,
    createEnvelopeSchema(engineRunSchema),
    jsonOptions("POST", body, signal),
  );
  return response.data;
}

export function listDealEngineRuns(
  dealId: string,
  query: EngineRunListQuery = {},
): Promise<Page<EngineRun>> {
  return request(
    withQuery(`/api/deals/${pathSegment(dealId)}/engine-runs`, query),
    createPageSchema(engineRunSchema),
  );
}

export function listVdrDocuments(
  dealId: string,
  query: { page?: number; pageSize?: number } = {},
): Promise<Page<z.infer<typeof vdrDocumentSchema>>> {
  return request(
    withQuery(`/api/deals/${pathSegment(dealId)}/vdr-documents`, query),
    createPageSchema(vdrDocumentSchema),
  );
}

export async function createDealDocument(
  dealId: string,
  data: z.infer<typeof createDocumentResourceSchema>,
  signal?: AbortSignal,
): Promise<z.infer<typeof generatedDocumentSchema>> {
  const body = createDocumentResourceSchema.parse(data);
  const response = await request(
    `/api/deals/${pathSegment(dealId)}/documents`,
    createEnvelopeSchema(generatedDocumentSchema),
    jsonOptions("POST", body, signal),
  );
  return response.data;
}

export function listNotifications(
  query: { unreadOnly?: boolean; cursor?: string } = {},
): Promise<{
  data: Notification[];
  meta: { nextCursor: string | null };
  unreadCount: number;
}> {
  return request(
    withQuery("/api/notifications", query),
    notificationsPageSchema(),
  );
}

function notificationsPageSchema() {
  return z.object({
    data: z.array(notificationSchema),
    meta: z.object({ nextCursor: z.string().nullable() }),
    unreadCount: z.number().int().nonnegative(),
  });
}

export async function markNotificationRead(
  id: string,
  signal?: AbortSignal,
): Promise<Notification> {
  const response = await request(
    `/api/notifications/${pathSegment(id)}`,
    createEnvelopeSchema(notificationSchema),
    jsonOptions("PATCH", { read: true }, signal),
  );
  return response.data;
}

export async function getDashboardLayout(
  slug: string,
): Promise<DashboardLayout> {
  const response = await request(
    `/api/users/me/dashboard-layouts/${pathSegment(slug)}`,
    createEnvelopeSchema(dashboardLayoutSchema),
  );
  return response.data;
}

export async function saveDashboardLayout(
  slug: string,
  data: z.infer<typeof dashboardLayoutWriteSchema>,
  signal?: AbortSignal,
): Promise<DashboardLayout> {
  const body = dashboardLayoutWriteSchema.parse(data);
  const response = await request(
    `/api/users/me/dashboard-layouts/${pathSegment(slug)}`,
    createEnvelopeSchema(dashboardLayoutSchema),
    jsonOptions("PUT", body, signal),
  );
  return response.data;
}

export async function resetDashboardLayout(
  slug: string,
  signal?: AbortSignal,
): Promise<DashboardLayout> {
  const response = await request(
    `/api/users/me/dashboard-layouts/${pathSegment(slug)}`,
    createEnvelopeSchema(dashboardLayoutSchema),
    { method: "DELETE", signal },
  );
  return response.data;
}
