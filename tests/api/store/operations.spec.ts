import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import {
  type DashboardWidget,
  DashboardWidgetType,
  EngineKind,
  EngineRunStatus,
} from "../../../src/api/contracts.ts";
import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { expectStoreError } from "../support/store.ts";

Deno.test("MvpStore keeps deal-scoped engine run history and isolates result copies", () => {
  const store = new MvpStore();
  const input = { currentAssets: 1_000_000 };
  const run = store.createEngineRun(
    MVP_SEED_IDS.dealHorizon,
    EngineKind.FinancialRisk,
    input,
  );
  input.currentAssets = 0;
  assertEquals(run.status, EngineRunStatus.Queued);
  assertEquals("input" in run, false);
  assertEquals("updatedAt" in run, false);

  const completed = store.updateEngineRun(MVP_SEED_IDS.dealHorizon, run.id, {
    status: EngineRunStatus.Completed,
    result: { score: 2.4, label: "moderate" },
  });
  assertEquals(completed.result, { score: 2.4, label: "moderate" });
  completed.result!.score = 99;

  const history = store.listEngineRuns(MVP_SEED_IDS.dealHorizon, {
    engine: EngineKind.FinancialRisk,
    pageSize: 10,
  });
  assertEquals(history.meta.total, 1);
  assertEquals(history.data[0].result, { score: 2.4, label: "moderate" });
});

Deno.test("MvpStore lists notification unread count and supports reversible read state", () => {
  const store = new MvpStore();
  const initial = store.listNotifications({ unreadOnly: true });
  assertEquals(initial.unreadCount, 1);
  assertEquals(initial.data[0].id, MVP_SEED_IDS.notificationUnread);

  const read = store.markNotificationRead(
    MVP_SEED_IDS.notificationUnread,
    true,
  );
  assert(read.readAt);
  assertEquals(store.listNotifications({ unreadOnly: true }).data, []);
  assertEquals(store.listNotifications().unreadCount, 0);

  const unread = store.markNotificationRead(
    MVP_SEED_IDS.notificationUnread,
    false,
  );
  assertEquals(unread.readAt, null);
  assertEquals(store.listNotifications().unreadCount, 1);
});

Deno.test("MvpStore dashboard layouts use optimistic versions and reset to server defaults", () => {
  const store = new MvpStore();
  const original = store.getDashboardLayout("custom");
  const widgets: DashboardWidget[] = [{
    instanceId: "00000000-0000-4000-8000-000000000099",
    type: DashboardWidgetType.RiskSummary,
    grid: { x: 4, y: 0, w: 4, h: 3 },
    config: { dealId: MVP_SEED_IDS.dealHorizon },
  }];
  const saved = store.putDashboardLayout("custom", original.version, widgets);
  assertEquals(saved.version, 2);
  assertEquals(saved.widgets, widgets);

  widgets[0].grid.x = 99;
  assertEquals(store.getDashboardLayout("custom").widgets[0].grid.x, 4);
  expectStoreError(
    () => store.putDashboardLayout("custom", 1, []),
    "LAYOUT_VERSION_CONFLICT",
    409,
  );

  const reset = store.resetDashboardLayout("custom", saved.version);
  assertEquals(reset.version, 3);
  assertEquals(reset.widgets[0].type, DashboardWidgetType.Kpi);
  assertNotEquals(reset.widgets, saved.widgets);
  expectStoreError(
    () => store.getDashboardLayout("missing"),
    "DASHBOARD_LAYOUT_NOT_FOUND",
    404,
  );
});
