import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  approveValuationScenario,
  attachValuationInput,
  completeValuationScenario,
  createValuationInput,
  invalidateValuationScenario,
  markValuationComputing,
  queueValuationScenario,
} from "../../src/valuation/model.ts";
import { createValuationResult } from "../../src/valuation/result.ts";
import {
  parseValuationApprovalId,
  parseValuationInputId,
  parseValuationInvalidationId,
  parseValuationResultId,
} from "../../src/valuation/ids.ts";
import {
  activeModel,
  aiActor,
  basis,
  computedScenario,
  humanActor,
  NOW,
  provenance,
  scenario,
  serviceActor,
} from "./fixtures.ts";

Deno.test("valuation aggregates bind model, scenario, input, and result versions", () => {
  const currentScenario = scenario();
  const valueInput = createValuationInput({
    id: required("valuation_input_financials", parseValuationInputId),
    scenario: currentScenario,
    model: activeModel(),
    request: { method: "book-value", input: {} },
    basis: basis(),
    provenance: provenance(),
    now: NOW,
  });
  const ready = attachValuationInput(currentScenario, valueInput, NOW);
  const queued = queueValuationScenario(ready, NOW);
  const computing = markValuationComputing(queued, NOW);
  const result = createValuationResult({
    id: required("valuation_result_financials", parseValuationResultId),
    scenario: computing,
    valuationInput: valueInput,
    outcome: computedScenario().result.outcome,
    now: NOW,
  });
  const completed = completeValuationScenario(computing, result, NOW);
  assertEquals(valueInput.modelVersion, 2);
  assertEquals(result.scenarioVersion, computing.version);
  assertEquals(completed.currentResultId, result.id);
  assertEquals(completed.version, computing.version + 1);
  assert(Object.isFrozen(result));
});

Deno.test("stale invalidation is automated but irreversible invalidation is human-only", () => {
  const current = computedScenario();
  const stale = invalidateValuationScenario(current.scenario, {
    id: required("valuation_invalidation_stale", parseValuationInvalidationId),
    kind: "stale",
    resultId: current.result.id,
    reason: "The source fact version changed.",
    actor: serviceActor(),
    now: NOW,
  });
  assertEquals(stale.scenario.state, "stale");
  assertThrows(
    () =>
      invalidateValuationScenario(current.scenario, {
        id: required("valuation_invalidation_ai", parseValuationInvalidationId),
        kind: "invalidated",
        resultId: current.result.id,
        reason: "AI cannot make this decision.",
        actor: aiActor(),
        now: NOW,
      }),
    Error,
    "active human actor",
  );
});

Deno.test("approval stores the exact result basis and requires a matching human authority snapshot", () => {
  const current = computedScenario();
  const actor = humanActor();
  const approved = approveValuationScenario(current.scenario, current.result, {
    id: required("valuation_approval_base", parseValuationApprovalId),
    actor,
    authority: {
      snapshotId: "authority_valuation_base",
      actorId: actor.id,
      policyVersion: "valuation-policy-v1",
      scope: current.scenario.scope,
      capturedAt: NOW,
    },
    now: NOW,
  });
  assertEquals(approved.scenario.state, "approved");
  assertEquals(
    approved.approval.resultBasis.basisDigest,
    current.result.basis.basisDigest,
  );
  assertEquals(approved.approval.scenarioVersion, current.scenario.version);
  assertThrows(
    () =>
      approveValuationScenario(current.scenario, current.result, {
        id: required("valuation_approval_ai", parseValuationApprovalId),
        actor: aiActor(),
        authority: {
          snapshotId: "authority_valuation_ai",
          actorId: actor.id,
          policyVersion: "valuation-policy-v1",
          scope: current.scenario.scope,
          capturedAt: NOW,
        },
        now: NOW,
      }),
    Error,
    "active human actor",
  );
});

function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
