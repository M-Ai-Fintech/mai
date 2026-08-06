import { assertEquals, assertRejects } from "@std/assert";
import {
  AuthorityDenialError,
  createAuthorityDenial,
  GovernedAuthorityDenialError,
  parseAuthorityDenial,
} from "../../src/work_management/authority_denial.ts";
import {
  actor,
  deal,
  targetCommandType,
  tenant,
  workspace,
} from "../../src/work_management/ids.ts";

const input = {
  stage: "pre_package" as const,
  scope: {
    tenantId: tenant("tenant_denial"),
    workspaceId: workspace("workspace_denial"),
    dealId: deal("deal_denial"),
  },
  requesterId: actor("actor_requester-denial"),
  namedApproverId: actor("actor_approver-denial"),
  requestedAction: targetCommandType("approve_deal"),
  reasons: ["NAMED_APPROVER_MISMATCH"] as const,
  evaluatedAt: "2026-08-06T12:00:00.000Z",
  idempotencyIdentity: "denial-test-identity",
};

Deno.test("authority denial is immutable, digest-bound, and typed", async () => {
  const denial = await createAuthorityDenial(input);
  assertEquals((await parseAuthorityDenial(denial)).denialId, denial.denialId);
  await assertRejects(
    () =>
      parseAuthorityDenial({ ...denial, reasons: ["AMOUNT_CEILING_EXCEEDED"] }),
    Error,
  );
  assertEquals(Object.isFrozen(denial), true);
});

Deno.test("authority denial error preserves governed evidence", async () => {
  const denial = await createAuthorityDenial(input);
  const error = new AuthorityDenialError(denial);
  assertEquals(error.code, "HUMAN_AUTHORITY_REQUIRED");
  assertEquals(error.evidence === denial, true);
});

Deno.test("authority denial parser fails closed for shape and scope tampering", async () => {
  const denial = await createAuthorityDenial(input);
  await assertRejects(
    () => parseAuthorityDenial({ ...denial, unexpected: true }),
    Error,
  );
  await assertRejects(
    () => parseAuthorityDenial({ ...denial, scope: { tenantId: "only" } }),
    Error,
  );
  await assertRejects(
    () => parseAuthorityDenial({ ...denial, evaluatedAt: "not-a-time" }),
    Error,
  );
  await assertRejects(
    () => parseAuthorityDenial({ ...denial, expectedTargetVersion: "1" }),
    Error,
  );
});

Deno.test("governed denial carries an explicit reason without message parsing", () => {
  const error = new GovernedAuthorityDenialError(
    "TARGET_VERSION_MISMATCH",
    "arbitrary diagnostic text",
  );
  assertEquals(error.kind, "governed_denial");
  assertEquals(error.reason, "TARGET_VERSION_MISMATCH");
});
