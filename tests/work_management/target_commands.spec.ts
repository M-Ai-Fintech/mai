import { assertThrows } from "@std/assert";
import {
  parseTargetCommandDispatch,
  parseTargetCommandDispatchVerified,
} from "../../src/work_management/target_commands.ts";
import {
  authorityDispatch,
  authorityPackage,
  completeLimits,
} from "./authority_test_support.ts";

Deno.test("target dispatch identity is bound to its scope and actor", async () => {
  const dispatch = authorityDispatch(await authorityPackage(completeLimits));
  assertThrows(() =>
    parseTargetCommandDispatch({
      ...dispatch,
      idempotencyIdentity: dispatch.idempotencyIdentity.replace(
        "tenant_authority-proof",
        "tenant_other-scope",
      ),
    })
  );
  assertThrows(() =>
    parseTargetCommandDispatch({
      ...dispatch,
      idempotencyIdentity: dispatch.idempotencyIdentity.replace(
        "actor_authority-approver",
        "actor_other-actor",
      ),
    })
  );
});

Deno.test("target dispatch identity binds the source command and request", async () => {
  const dispatch = authorityDispatch(await authorityPackage(completeLimits));
  assertThrows(() =>
    parseTargetCommandDispatch({
      ...dispatch,
      idempotencyIdentity: dispatch.idempotencyIdentity.replace(
        "approve_approval_request",
        "approve_execution",
      ),
    })
  );
  assertThrows(() =>
    parseTargetCommandDispatch({
      ...dispatch,
      idempotencyIdentity: dispatch.idempotencyIdentity.replace(
        "approval_authority-proof",
        "approval_other-request",
      ),
    })
  );
});

Deno.test("verified target dispatch parsing rejects a tampered proof digest", async () => {
  const dispatch = authorityDispatch(await authorityPackage(completeLimits));
  const proofDigest = "a".repeat(64);
  try {
    await parseTargetCommandDispatchVerified({
      ...dispatch,
      authorityProof: {
        proofVersion: 1,
        evaluationId: "evaluation-tampered",
        evaluationDigest: "b".repeat(64),
        proofDigest,
        proofId: `authority_proof_v1_${proofDigest}`,
      },
    });
  } catch {
    return;
  }
  throw new Error("Expected the tampered authority proof to be rejected.");
});
