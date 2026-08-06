import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  evaluateApprovalAuthority,
  parseAuthorityEvaluation,
} from "../../src/work_management/authority_evaluation.ts";
import { InMemoryAuthorityEvaluationStore } from "../../src/work_management/authority_evaluation_store.ts";
import {
  parseAuthorityFacts,
  resolveTrustedAuthorityFacts,
} from "../../src/work_management/authority_facts.ts";
import { WorkManagementError } from "../../src/work_management/model.ts";
import {
  authorityFacts,
  authorityPackage,
  authorityScope,
  completeLimits,
} from "./authority_test_support.ts";

Deno.test("authority ceilings allow below and equal values and deny above values", async () => {
  const packageValue = await authorityPackage(completeLimits);
  for (const minorUnits of [99_999, 100_000]) {
    const evaluation = await evaluateApprovalAuthority({
      package: packageValue,
      expectedPackage: packageValue,
      facts: authorityFacts({ amount: { minorUnits, currency: "USD" } }),
      evaluatedAt: "2026-08-06T12:00:00.000Z",
    });
    assertEquals(evaluation.outcome, "allowed");
    assertEquals(evaluation.limitResults.length, completeLimits.length);
  }
  const denied = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts({ amount: { minorUnits: 100_001, currency: "USD" } }),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  assertEquals(denied.outcome, "denied");
  assertEquals(denied.reasons, ["AMOUNT_CEILING_EXCEEDED"]);
});

Deno.test("authority evaluates percentage, mandate, category, currency, and every applicable limit", async () => {
  const packageValue = await authorityPackage(completeLimits);
  const evaluation = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts({
      percentageBasisPoints: 2_501,
      mandate: {
        mandateId: "wrong",
        version: "mandate-v2",
        active: false,
        scope: authorityScope,
      },
      category: "refinancing",
      amount: { minorUnits: 1, currency: "EUR" },
    }),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  assertEquals(evaluation.limitResults.length, completeLimits.length);
  assertEquals(evaluation.reasons, [
    "CURRENCY_MISMATCH",
    "PERCENTAGE_CEILING_EXCEEDED",
    "MANDATE_INACTIVE",
    "MANDATE_ID_MISMATCH",
    "MANDATE_VERSION_MISMATCH",
    "CATEGORY_MISMATCH",
  ]);
});

Deno.test("authority fails closed for unsupported, missing, malformed, mismatched, and expired inputs", async () => {
  const unsupported = await authorityPackage([{
    name: "max_amount",
    value: 10,
  }]);
  await assertRejects(
    () =>
      evaluateApprovalAuthority({
        package: unsupported,
        expectedPackage: unsupported,
        facts: authorityFacts(),
        evaluatedAt: "2026-08-06T12:00:00.000Z",
      }),
    WorkManagementError,
    "supported typed authority limit",
  );
  const amountPackage = await authorityPackage([{
    name: "amount_minor_ceiling",
    value: 10,
  }]);
  const { amount: _amount, ...missingAmountFacts } = authorityFacts();
  const missing = await evaluateApprovalAuthority({
    package: amountPackage,
    expectedPackage: amountPackage,
    facts: missingAmountFacts,
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  assertEquals(missing.reasons, ["AMOUNT_FACT_MISSING"]);
  assertThrows(
    () => {
      parseAuthorityFacts({
        ...authorityFacts(),
        amount: { minorUnits: -1, currency: "usd" },
      });
    },
    WorkManagementError,
  );
  const originalFacts = authorityFacts();
  const mismatched = {
    ...originalFacts,
    target: { ...originalFacts.target, aggregateId: "execution_other" },
  };
  await assertRejects(
    () =>
      resolveTrustedAuthorityFacts({
        scope: authorityScope,
        target: amountPackage.target,
        commandType: amountPackage.authority.commandType,
        policyVersion: amountPackage.authority.policyVersion,
        snapshotReference: amountPackage.authority.snapshotReference,
      }, { resolve: () => Promise.resolve(mismatched) }),
    WorkManagementError,
    "does not match validated target",
  );
  const expired = await evaluateApprovalAuthority({
    package: amountPackage,
    expectedPackage: amountPackage,
    facts: authorityFacts({ amount: { minorUnits: 1, currency: "USD" } }),
    evaluatedAt: "2026-08-06T13:00:00.000Z",
  });
  assertEquals(expired.reasons, ["AUTHORITY_WINDOW_INACTIVE"]);
});

Deno.test("authority evaluation is immutable, tamper-evident, and exact replay persists once", async () => {
  const packageValue = await authorityPackage(completeLimits);
  const evaluation = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts(),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  const store = new InMemoryAuthorityEvaluationStore();
  await store.append(evaluation);
  await store.append(evaluation);
  assertEquals(store.count(), 1);
  assertEquals(
    (await store.find(evaluation.evaluationId))?.digest,
    evaluation.digest,
  );
  await assertRejects(
    () => parseAuthorityEvaluation({ ...evaluation, outcome: "denied" }),
    WorkManagementError,
  );
  assertEquals(Object.isFrozen(evaluation), true);
  assertEquals(Object.isFrozen(evaluation.facts.mandate), true);
  assertEquals(Object.isFrozen(evaluation.limitResults[0].limit), true);
});
