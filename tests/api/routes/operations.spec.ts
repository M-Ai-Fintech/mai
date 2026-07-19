import { assert, assertEquals, assertMatch } from "@std/assert";
import { EngineKind, EngineRunStatus } from "../../../src/api/contracts.ts";
import { handleMvpRoute } from "../../../src/api/mvp_routes.ts";
import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { request, route } from "../support/route.ts";

Deno.test("MVP engine routes run injected engines and preserve deal-scoped history", async () => {
  const store = new MvpStore();
  const created = await handleMvpRoute(
    request(`/api/deals/${MVP_SEED_IDS.dealHorizon}/engine-runs`, "POST", {
      engine: "financial_risk",
      input: { currentAssets: 1_000_000 },
    }),
    {
      store,
      runEngine: () => Promise.resolve({ score: 2.4, label: "moderate" }),
    },
  );
  assert(created);
  assertEquals(created.status, 201);
  const run = (await created.json()).data;
  assertEquals(run.status, "completed");
  assertEquals(run.result.score, 2.4);
  assert(run.completedAt);

  const history = await (await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealHorizon}/engine-runs?engine=financial_risk&pageSize=1`,
  )).json();
  assertEquals(history.meta.total, 1);
  assertEquals(history.data[0].id, run.id);
});

Deno.test("MVP VDR route returns metadata only and validates deal scope", async () => {
  const store = new MvpStore();
  const response = await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealHorizon}/vdr-documents?page=1&pageSize=1`,
  );
  const page = await response.json();
  assertEquals(page.meta.total, 2);
  assertEquals(page.data[0].mimeType, "application/pdf");
  assertEquals("path" in page.data[0], false);

  const missing = await route(
    store,
    "/api/deals/00000000-0000-4000-8000-000000009999/vdr-documents",
  );
  assertEquals(missing.status, 404);
  assertEquals((await missing.json()).error.code, "DEAL_NOT_FOUND");
});

Deno.test("MVP document route validates a completed source run and returns safe metadata", async () => {
  const store = new MvpStore();
  const run = store.createEngineRun(
    MVP_SEED_IDS.dealHorizon,
    EngineKind.FinancialRisk,
    { currentAssets: 1_000_000 },
  );
  store.updateEngineRun(MVP_SEED_IDS.dealHorizon, run.id, {
    status: EngineRunStatus.Completed,
    result: { score: 2.4 },
  });
  const response = await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealHorizon}/documents`,
    "POST",
    { documentType: "due_diligence_report", sourceRunId: run.id },
  );
  assertEquals(response.status, 201);
  const document = (await response.json()).data;
  assertEquals(document.sourceRunId, run.id);
  assertEquals(document.documentType, "due_diligence_report");
  assertMatch(document.downloadUrl, /^http:\/\/localhost:8000\/api\/deals\//);
  assertEquals("path" in document, false);

  const missing = await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealHorizon}/documents`,
    "POST",
    {
      documentType: "term_sheet",
      sourceRunId: "00000000-0000-4000-8000-000000009999",
    },
  );
  assertEquals(missing.status, 404);
  assertEquals((await missing.json()).error.code, "ENGINE_RUN_NOT_FOUND");
});

Deno.test("MVP notification routes use cursor metadata and mark read", async () => {
  const store = new MvpStore();
  const initial =
    await (await route(store, "/api/notifications?unreadOnly=true&limit=1"))
      .json();
  assertEquals(initial.unreadCount, 1);
  assertEquals(initial.meta.nextCursor, null);

  const marked = await route(
    store,
    `/api/notifications/${MVP_SEED_IDS.notificationUnread}`,
    "PATCH",
    { read: true },
  );
  assert((await marked.json()).data.readAt);
  assertEquals(
    (await (await route(store, "/api/notifications?unreadOnly=true")).json())
      .data,
    [],
  );
});

Deno.test("MVP dashboard layout routes save and reset with optimistic versions", async () => {
  const store = new MvpStore();
  const original =
    (await (await route(store, "/api/users/me/dashboard-layouts/custom"))
      .json()).data;
  const widgets = [{
    instanceId: "00000000-0000-4000-8000-000000000099",
    type: "risk_summary",
    grid: { x: 4, y: 0, w: 4, h: 3 },
    config: { dealId: MVP_SEED_IDS.dealHorizon },
  }];
  const saved = await route(
    store,
    "/api/users/me/dashboard-layouts/custom",
    "PUT",
    {
      version: original.version,
      widgets,
    },
  );
  assertEquals((await saved.json()).data.version, 2);

  const stale = await route(
    store,
    "/api/users/me/dashboard-layouts/custom",
    "PUT",
    {
      version: original.version,
      widgets,
    },
  );
  assertEquals(stale.status, 409);
  assertEquals((await stale.json()).error.code, "LAYOUT_VERSION_CONFLICT");

  const reset = await route(
    store,
    "/api/users/me/dashboard-layouts/custom",
    "DELETE",
  );
  const resetLayout = (await reset.json()).data;
  assertEquals(resetLayout.version, 3);
  assertEquals(resetLayout.widgets[0].type, "kpi");
});
