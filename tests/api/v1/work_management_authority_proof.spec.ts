import { assertEquals, assertRejects } from "@std/assert";
import {
  protectTargetCommand,
  validateAuthorityProtectedTargetCommand,
} from "../../../src/work_management/authority_consumer_contract.ts";
import { evaluateApprovalAuthority } from "../../../src/work_management/authority_evaluation.ts";
import { InMemoryAuthorityEvaluationStore } from "../../../src/work_management/authority_evaluation_store.ts";
import { StoredAuthorityProofResolver } from "../../../src/work_management/authority_proof.ts";
import { WorkManagementError } from "../../../src/work_management/model.ts";
import {
  authorityDispatch,
  authorityFacts,
  authorityPackage,
  completeLimits,
} from "../../work_management/authority_test_support.ts";

Deno.test("authority proof wire contract deeply validates nested command and proof values", async () => {
  const packageValue = await authorityPackage(completeLimits);
  const evaluation = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts(),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  const store = new InMemoryAuthorityEvaluationStore();
  await store.append(evaluation);
  const command = await protectTargetCommand(
    authorityDispatch(packageValue),
    evaluation,
  );
  const wire = JSON.parse(JSON.stringify(command));
  const validated = await validateAuthorityProtectedTargetCommand(
    wire,
    new StoredAuthorityProofResolver(store),
    "2026-08-06T12:30:00.000Z",
  );
  assertEquals(validated.authorityProof.proofVersion, 1);
  const malformed = structuredClone(wire);
  malformed.dispatch.actor = { id: authorityApproverOnly() };
  await assertRejects(
    () =>
      validateAuthorityProtectedTargetCommand(
        malformed,
        new StoredAuthorityProofResolver(store),
        "2026-08-06T12:30:00.000Z",
      ),
    WorkManagementError,
  );
});

function authorityApproverOnly(): string {
  return "actor_authority-approver";
}
