import { assertEquals, assertRejects } from "@std/assert";
import { consumeClosingAuthority } from "../../src/closing/authority.ts";
import { parseIdempotencyKey } from "../../src/platform/api/v1.ts";
import {
  evaluateApprovalAuthority,
} from "../../src/work_management/authority_evaluation.ts";
import type { AuthorityFacts } from "../../src/work_management/authority_facts.ts";
import { createApprovalPackage } from "../../src/work_management/approval_requests.ts";
import {
  actor,
  aggregateVersion,
  approvalPackageId,
  deal,
  targetCommandType,
  tenant,
  type WorkScope,
  workspace,
} from "../../src/work_management/v1.ts";
import {
  authorityDispatch,
  authorityFacts,
  completeLimits,
} from "../work_management/authority_test_support.ts";
import { protectTargetCommand } from "../../src/work_management/authority_consumer_contract.ts";

const scope: WorkScope = {
  tenantId: tenant("tenant_closing-proof"),
  workspaceId: workspace("workspace_closing-proof"),
  dealId: deal("deal_closing-proof"),
};
const approver = actor("actor_closing-approver");
const commandType = targetCommandType("closing_approve_readiness");

async function protectedCommand() {
  const target = {
    aggregateType: "closing_workspace",
    aggregateId: "closing_solar",
    expectedVersion: aggregateVersion(1),
    scope,
  };
  const packageValue = await createApprovalPackage({
    id: approvalPackageId("package_closing-proof"),
    version: 1,
    target,
    evidence: [],
    authority: {
      commandType,
      target,
      namedApproverId: approver,
      policyVersion: "policy-closing-v1",
      snapshotReference: "authority-snapshot-closing-v1",
      scope,
      effectiveAt: "2026-08-06T11:00:00.000Z",
      expiresAt: "2026-08-08T13:00:00.000Z",
      applicableLimits: completeLimits.map((limit) =>
        limit.name === "deal_scope"
          ? { name: limit.name, value: scope.dealId }
          : limit
      ),
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: "authority-snapshot-closing-v1",
      actorId: approver,
      actorKind: "human",
      policyVersion: "policy-closing-v1",
      capturedAt: "2026-08-06T11:30:00.000Z",
      scope,
    },
    payload: { selector: "closing_solar" },
  });
  const facts: AuthorityFacts = authorityFacts({
    target,
    scope,
    mandate: {
      mandateId: "mandate-one",
      version: "mandate-v3",
      active: true,
      scope,
    },
  });
  const evaluation = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts,
    evaluatedAt: "2026-08-07T12:00:00.000Z",
  });
  const baseDispatch = authorityDispatch(packageValue);
  const dispatch = {
    ...baseDispatch,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    actor: { id: approver, kind: "human" as const, state: "active" as const },
    idempotencyIdentity:
      "tenant_closing-proof|workspace_closing-proof|deal_closing-proof|actor_closing-approver|approve_approval_request|approval_authority-proof|idem_closing-proof",
  };
  return {
    command: await protectTargetCommand(dispatch, evaluation),
    evaluation,
  };
}

Deno.test("Closing consumes only an exact human authority proof binding", async () => {
  const protectedValue = await protectedCommand();
  const command = protectedValue.command;
  const idempotency = parseIdempotencyKey("idem_closing-proof");
  if (!idempotency.ok) throw new Error("test idempotency key should parse");
  const resolver = {
    resolve: () => Promise.resolve(protectedValue.evaluation),
  };
  const consumed = await consumeClosingAuthority({
    protectedCommand: command,
    resolver,
    scope,
    targetId: "closing_solar",
    expectedVersion: 1,
    commandType,
    actorId: approver,
    idempotencyKey: idempotency.value,
    consumedAt: "2026-08-07T12:00:00.000Z",
  });
  assertEquals(consumed.actor.id, approver);
  await assertRejects(
    () =>
      consumeClosingAuthority({
        protectedCommand: command,
        resolver,
        scope,
        targetId: "closing_other",
        expectedVersion: 1,
        commandType,
        actorId: approver,
        idempotencyKey: idempotency.value,
        consumedAt: "2026-08-07T12:00:00.000Z",
      }),
    Error,
    "does not match the exact scope",
  );
});

Deno.test("Closing rejects a valid proof when actor, scope, version, or target changes", async () => {
  const protectedValue = await protectedCommand();
  const resolver = {
    resolve: () => Promise.resolve(protectedValue.evaluation),
  };
  const idempotency = parseIdempotencyKey("idem_closing-proof");
  if (!idempotency.ok) throw new Error("test idempotency key should parse");
  const base = {
    protectedCommand: protectedValue.command,
    resolver,
    scope,
    targetId: "closing_solar",
    expectedVersion: 1,
    commandType,
    actorId: approver,
    idempotencyKey: idempotency.value,
    consumedAt: "2026-08-07T12:00:00.000Z",
  };
  await assertRejects(
    () => consumeClosingAuthority({ ...base, actorId: actor("actor_other") }),
    Error,
  );
  await assertRejects(
    () =>
      consumeClosingAuthority({
        ...base,
        scope: { ...scope, dealId: deal("deal_other") },
      }),
    Error,
  );
  await assertRejects(
    () => consumeClosingAuthority({ ...base, expectedVersion: 2 }),
    Error,
  );
  await assertRejects(
    () => consumeClosingAuthority({ ...base, targetId: "closing_other" }),
    Error,
  );
});
