import { assertEquals, assertRejects } from "@std/assert";
import {
  createDeal,
  dealId,
  DealVersionConflictError,
  InMemoryDealRepository,
} from "../../src/deal_management/v1.ts";
import {
  contextFor,
  eventFor,
  requiredTenantId,
  requiredWorkspaceId,
} from "./support.ts";

Deno.test("Deal repository scopes reads and retains aggregate events", async () => {
  const repository = new InMemoryDealRepository();
  const context = contextFor();
  const deal = createDeal({
    id: dealId("deal_repository-1"),
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    name: "Scoped repository deal",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  await repository.save({
    scope: {
      tenantId: requiredTenantId(context.request.tenantId),
      workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    },
    aggregate: deal,
    event: eventFor(deal, context),
  });

  assertEquals(
    (await repository.find({
      tenantId: requiredTenantId("tenant_northstar"),
      workspaceId: requiredWorkspaceId("workspace_alpha"),
    }, deal.id))?.id,
    deal.id,
  );
  assertEquals(
    await repository.find({
      tenantId: requiredTenantId("tenant_other"),
      workspaceId: requiredWorkspaceId("workspace_alpha"),
    }, deal.id),
    undefined,
  );
  assertEquals(
    (await repository.listEvents({
      tenantId: requiredTenantId("tenant_northstar"),
      workspaceId: requiredWorkspaceId("workspace_alpha"),
    }, deal.id)).length,
    1,
  );
});

Deno.test("Deal repository rejects stale aggregate writes", async () => {
  const repository = new InMemoryDealRepository();
  const context = contextFor();
  const scope = {
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
  };
  const deal = createDeal({
    id: dealId("deal_repository-2"),
    ...scope,
    name: "Versioned repository deal",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  await repository.save({
    scope,
    aggregate: deal,
    event: eventFor(deal, context),
  });
  await assertRejects(
    () =>
      repository.save({
        scope,
        aggregate: { ...deal, version: 2 as typeof deal.version },
        expectedVersion: 9,
        event: eventFor(
          { ...deal, version: 2 as typeof deal.version },
          context,
        ),
      }),
    DealVersionConflictError,
  );
});
