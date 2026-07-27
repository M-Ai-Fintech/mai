import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import {
  type DashboardWidget,
  DashboardWidgetType,
  EngineKind,
  EngineRunStatus,
} from "../../../src/api/contracts.ts";
import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { expectStoreError } from "../support/store.ts";

Deno.test(
  "MvpStore keeps deal-scoped engine run history and isolates result copies",
  verifyEngineRunCopies,
);

Deno.test(
  "MvpStore lists notification unread count and supports reversible read state",
  verifyNotificationReadState,
);

Deno.test(
  "MvpStore dashboard layouts use optimistic versions and reset to server defaults",
  verifyDashboardLayouts,
);

function verifyEngineRunCopies(): void {
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
  completeAndMutateRun(store, run.id);
  assertEngineRunHistory(store);
}

function completeAndMutateRun(store: MvpStore, runId: string): void {
  const completed = store.updateEngineRun(MVP_SEED_IDS.dealHorizon, runId, {
    status: EngineRunStatus.Completed,
    result: { score: 2.4, label: "moderate" },
  });
  assertEquals(completed.result, { score: 2.4, label: "moderate" });
  completed.result!.score = 99;
}

function assertEngineRunHistory(store: MvpStore): void {
  const history = store.listEngineRuns(MVP_SEED_IDS.dealHorizon, {
    engine: EngineKind.FinancialRisk,
    pageSize: 10,
  });
  assertEquals(history.meta.total, 1);
  assertEquals(history.data[0].result, { score: 2.4, label: "moderate" });
}

function verifyNotificationReadState(): void {
  const store = new MvpStore();
  assertInitialUnreadNotification(store);
  markNotificationRead(store);
  markNotificationUnread(store);
}

function assertInitialUnreadNotification(store: MvpStore): void {
  const initial = store.listNotifications({ unreadOnly: true });
  assertEquals(initial.unreadCount, 1);
  assertEquals(initial.data[0].id, MVP_SEED_IDS.notificationUnread);
}

function markNotificationRead(store: MvpStore): void {
  const read = store.markNotificationRead(
    MVP_SEED_IDS.notificationUnread,
    true,
  );
  assert(read.readAt);
  assertEquals(store.listNotifications({ unreadOnly: true }).data, []);
  assertEquals(store.listNotifications().unreadCount, 0);
}

function markNotificationUnread(store: MvpStore): void {
  const unread = store.markNotificationRead(
    MVP_SEED_IDS.notificationUnread,
    false,
  );
  assertEquals(unread.readAt, null);
  assertEquals(store.listNotifications().unreadCount, 1);
}

function verifyDashboardLayouts(): void {
  const store = new MvpStore();
  const original = store.getDashboardLayout("custom");
  const widgets = riskSummaryWidgets();
  const saved = store.putDashboardLayout("custom", original.version, widgets);
  assertSavedLayout(store, saved, widgets);
  assertStaleLayoutRejected(store);
  assertResetLayout(store, saved);
}

function riskSummaryWidgets(): DashboardWidget[] {
  return [{
    instanceId: "00000000-0000-4000-8000-000000000099",
    type: DashboardWidgetType.RiskSummary,
    grid: { x: 4, y: 0, w: 4, h: 3 },
    config: { dealId: MVP_SEED_IDS.dealHorizon },
  }];
}

function assertSavedLayout(
  store: MvpStore,
  saved: ReturnType<MvpStore["putDashboardLayout"]>,
  widgets: DashboardWidget[],
): void {
  assertEquals(saved.version, 2);
  assertEquals(saved.widgets, widgets);
  widgets[0].grid.x = 99;
  assertEquals(store.getDashboardLayout("custom").widgets[0].grid.x, 4);
}

function assertStaleLayoutRejected(store: MvpStore): void {
  expectStoreError(
    () => store.putDashboardLayout("custom", 1, []),
    "LAYOUT_VERSION_CONFLICT",
    409,
  );
}

function assertResetLayout(
  store: MvpStore,
  saved: ReturnType<MvpStore["putDashboardLayout"]>,
): void {
  const reset = store.resetDashboardLayout("custom", saved.version);
  assertEquals(reset.version, 3);
  assertEquals(reset.widgets[0].type, DashboardWidgetType.Kpi);
  assertNotEquals(reset.widgets, saved.widgets);
  expectStoreError(
    () => store.getDashboardLayout("missing"),
    "DASHBOARD_LAYOUT_NOT_FOUND",
    404,
  );
}
