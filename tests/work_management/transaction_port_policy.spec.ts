import { assertRejects } from "@std/assert";
import {
  assertTransactionSafeAdapter,
  assertTransactionSafeEffects,
} from "../../src/work_management/transaction_port_policy.ts";

const local = {
  transactionSafe: true as const,
  transactionMode: "postgres_integration_local" as const,
};

Deno.test("production transaction ports require the MAI-106 local marker", async () => {
  assertTransactionSafeAdapter("authorization", local);
  await assertRejects(
    async () => {
      await Promise.resolve();
      assertTransactionSafeAdapter("target", {});
    },
    Error,
    "target",
  );
  await assertRejects(
    async () => {
      await Promise.resolve();
      assertTransactionSafeAdapter("target", {
        ...local,
        transactionSafe: false,
      });
    },
    Error,
    "target",
  );
  await assertRejects(
    async () => {
      await Promise.resolve();
      assertTransactionSafeAdapter("target", {
        ...local,
        transactionMode: "external",
      });
    },
    Error,
    "target",
  );
  await assertRejects(
    async () => {
      await Promise.resolve();
      assertTransactionSafeAdapter("target", {
        ...local,
        external: true,
      });
    },
    Error,
    "target",
  );
});

Deno.test("audit and outbox effects require local transaction markers", async () => {
  assertTransactionSafeEffects(local, local);
  await assertRejects(
    async () => {
      await Promise.resolve();
      assertTransactionSafeEffects({}, local);
    },
    Error,
    "audit",
  );
  await assertRejects(
    async () => {
      await Promise.resolve();
      assertTransactionSafeEffects(local, {
        ...local,
        networked: true,
      });
    },
    Error,
    "outbox",
  );
});
