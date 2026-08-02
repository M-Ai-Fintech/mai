import { assertEquals, assertRejects } from "@std/assert";
import {
  DealAuthorizationError,
  DealIdempotencyConflictError,
  DealManagementService,
  InMemoryDealReceiptStore,
  InMemoryDealRepository,
} from "../../src/deal_management/v1.ts";
import {
  aiContextFor,
  contextFor,
  DenyingDealAuthorization,
  FixedDealClock,
  keyFor,
  RecordingDealAuthorization,
  SequentialDealIdFactory,
} from "./support.ts";
import type { DealAuthorizationPort } from "../../src/deal_management/v1.ts";

function service(
  authorization: DealAuthorizationPort = new RecordingDealAuthorization(),
) {
  return {
    service: new DealManagementService({
      repository: new InMemoryDealRepository(),
      authorization,
      receipts: new InMemoryDealReceiptStore(),
      ids: new SequentialDealIdFactory(),
      clock: new FixedDealClock(),
    }),
    authorization,
  };
}

Deno.test("Deal Management authorizes before loading and versions commands", async () => {
  const authorization = new RecordingDealAuthorization();
  const { service: dealService } = service(authorization);
  const created = await dealService.createDeal({
    type: "create_deal",
    context: contextFor(),
    idempotencyKey: keyFor("create"),
    name: "Northstar acquisition",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
  });
  const configured = await dealService.configureDeal({
    type: "configure_deal",
    context: contextFor(),
    idempotencyKey: keyFor("configure"),
    dealId: created.deal.id,
    expectedVersion: 1,
    name: "Northstar acquisition configured",
  });

  assertEquals(configured.deal.version, 2);
  assertEquals(configured.deal.name, "Northstar acquisition configured");
  assertEquals(authorization.calls.map((call) => call.resource.id), [
    "new",
    created.deal.id,
  ]);
});

Deno.test("Deal Management replays a command and rejects payload mismatch", async () => {
  const { service: dealService } = service();
  const command = {
    type: "create_deal" as const,
    context: contextFor(),
    idempotencyKey: keyFor("replay"),
    name: "Replayable deal",
    dealType: "acquisition",
    confidentiality: "standard" as const,
    currency: "USD",
  };
  const first = await dealService.createDeal(command);
  const replay = await dealService.createDeal(command);
  assertEquals(replay, first);
  await assertRejects(
    () => dealService.createDeal({ ...command, name: "Changed payload" }),
    DealIdempotencyConflictError,
  );
});

Deno.test("Deal Management blocks AI authority commands before loading", async () => {
  const authorization = new RecordingDealAuthorization();
  const { service: dealService } = service(authorization);
  const created = await dealService.createDeal({
    type: "create_deal",
    context: contextFor(),
    idempotencyKey: keyFor("human-create"),
    name: "Human authority gate",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
  });
  await assertRejects(
    () =>
      dealService.setMandate({
        type: "set_mandate",
        context: aiContextFor(),
        idempotencyKey: keyFor("ai-mandate"),
        dealId: created.deal.id,
        expectedVersion: 1,
        transactionValueCeiling: { amount: 100, currency: "USD" },
        authorityCeiling: 1,
      }),
    DealAuthorizationError,
  );
  assertEquals(authorization.calls.length, 2);
  assertEquals(authorization.calls[1].humanOnly, true);
});

Deno.test("Deal Management returns protected not-found without repository loading", async () => {
  const authorization = new DenyingDealAuthorization();
  const { service: dealService } = service(authorization);
  await assertRejects(
    () =>
      dealService.configureDeal({
        type: "configure_deal",
        context: contextFor(),
        idempotencyKey: keyFor("denied"),
        dealId: "deal_absent" as never,
        expectedVersion: 1,
        name: "Should not load",
      }),
    DealAuthorizationError,
  );
  assertEquals(authorization.calls.length, 1);
});
