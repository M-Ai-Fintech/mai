import { assertEquals, assertThrows } from "@std/assert";
import {
  assertPreparedCommandFinalizable,
  assertTerminalTaskInvariants,
  discloseStoredReplay,
  PreparedCommandConflictError,
  ReplayDisclosureDeniedError,
} from "../../src/work_management/transaction_replay_policy.ts";
import {
  assertWorkManagementPortPhase,
  TransactionPortPolicyError,
  WORK_MANAGEMENT_PORT_POLICY,
} from "../../src/work_management/transaction_port_policy.ts";

Deno.test("port policy keeps uncontrolled I/O outside PostgreSQL finalization", () => {
  for (
    const port of ["authorization", "target", "evidence", "authority"] as const
  ) {
    assertEquals(
      WORK_MANAGEMENT_PORT_POLICY[port].control,
      "uncontrolled_external",
    );
    assertThrows(
      () => assertWorkManagementPortPhase(port, "finalize_transaction"),
      TransactionPortPolicyError,
      `port "${port}" cannot run`,
    );
  }
  for (const port of ["audit", "outbox", "proof"] as const) {
    assertEquals(
      WORK_MANAGEMENT_PORT_POLICY[port].control,
      "transaction_local",
    );
    assertWorkManagementPortPhase(port, "finalize_transaction");
    assertThrows(
      () => assertWorkManagementPortPhase(port, "external_prepare"),
      TransactionPortPolicyError,
      `port "${port}" cannot run`,
    );
  }
});

Deno.test("finalize rejects attachment, target-version, state, and expiry races", () => {
  const prepared = {
    payloadDigest: "a".repeat(64),
    aggregateVersion: 2,
    ownerVersion: 5,
    targetVersion: 7,
    authorization: {
      decisionDigest: "decision-one",
      resourceState: "open",
      evaluatedAt: "2026-08-06T12:00:00.000Z",
      expiresAt: "2026-08-06T12:05:00.000Z",
    },
    authorityExpiresAt: "2026-08-06T12:10:00.000Z",
    commandExpiresAt: "2026-08-06T12:15:00.000Z",
  };
  const current = {
    payloadDigest: prepared.payloadDigest,
    aggregateVersion: 2,
    ownerVersion: 5,
    targetVersion: 7,
    resourceState: "open",
    now: "2026-08-06T12:04:59.999Z",
  };
  assertPreparedCommandFinalizable(prepared, current);
  for (
    const changed of [
      { ...current, ownerVersion: 6 },
      { ...current, targetVersion: 8 },
      { ...current, resourceState: "completed" },
      { ...current, now: prepared.authorization.expiresAt },
    ]
  ) {
    assertThrows(
      () => assertPreparedCommandFinalizable(prepared, changed),
      PreparedCommandConflictError,
    );
  }
});

Deno.test("Workstream completion requires exact unique terminal Task membership", () => {
  assertTerminalTaskInvariants(["task_a", "task_b"], [
    { id: "task_b", state: "cancelled" },
    { id: "task_a", state: "completed" },
  ]);
  for (
    const loaded of [
      [{ id: "task_a", state: "completed" }],
      [
        { id: "task_a", state: "completed" },
        { id: "task_b", state: "blocked" },
      ],
      [
        { id: "task_a", state: "completed" },
        { id: "task_a", state: "completed" },
      ],
    ]
  ) {
    assertThrows(
      () => assertTerminalTaskInvariants(["task_a", "task_b"], loaded),
      PreparedCommandConflictError,
    );
  }
});

Deno.test("completed replay uses the exact stored envelope only while currently authorized", () => {
  const envelope = Object.freeze({
    status: 200,
    etag: '"7"',
    headers: Object.freeze({ "content-type": "application/json" }),
    body: Object.freeze({ id: "task_one", state: "completed" }),
  });
  assertEquals(discloseStoredReplay("allow", envelope), envelope);
  assertThrows(
    () => discloseStoredReplay("deny", envelope),
    ReplayDisclosureDeniedError,
    "current replay-disclosure authorization",
  );
});
