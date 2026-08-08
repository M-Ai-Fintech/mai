import { assertEquals, assertRejects } from "@std/assert";
import type {
  ActorReference,
  AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import {
  candidateId,
  createInMemoryMatchingTestComposition,
  criteriaId,
  InMemoryMatchingTransactionRunner,
  MatchingError,
  type MatchingRun,
  type MatchingScope,
  runId,
  shortlistDecisionId,
  transitionRun,
} from "../../src/matching/v1.ts";
import {
  LEGACY_ADAPTER_CONTRACT_VERSION,
  type MatchingCandidate,
} from "../../src/engines/optimization/matching/types.ts";

const scope: MatchingScope = {
  tenantId: "tenant_integrity" as never,
  workspaceId: "workspace_integrity" as never,
  dealId: "deal_integrity" as never,
};
const context: RequestContext = {
  actorId: "actor_integrity" as never,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId: "cor_integrity" as never,
  origin: "http",
};
const human: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};
const authority = "authority_integrity";

Deno.test("Matching shortlist binds candidate lineage and terminal run state", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
    clock: fixedClock(),
  });
  const criteria = await activeCriteria(composition, "criteria_lineage");
  const completedA = await startRun(
    composition,
    criteria.id,
    "run_a",
    "candidate_a",
  );
  const completed = await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: completedA.id,
    idempotencyKey: "idem_execute_a" as never,
  });
  const queued = await startRun(
    composition,
    criteria.id,
    "run_queued",
    "candidate_queued",
  );
  const running = await startRun(
    composition,
    criteria.id,
    "run_running",
    "candidate_running",
  );
  await setState(composition, running, "running");
  const failed = await startRun(
    composition,
    criteria.id,
    "run_failed",
    "candidate_failed",
  );
  await setState(composition, failed, "running");
  await setState(composition, failed, "failed");
  const cancelled = await startRun(
    composition,
    criteria.id,
    "run_cancelled",
    "candidate_cancelled",
  );
  await setState(composition, cancelled, "cancelled");
  const secondCompleted = await startRun(
    composition,
    criteria.id,
    "run_b",
    "candidate_b",
  );
  await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: secondCompleted.id,
    idempotencyKey: "idem_execute_b" as never,
  });

  const effects = composition.effects as unknown as {
    readonly events: readonly unknown[];
  };
  const sourceCandidate = await new InMemoryMatchingTransactionRunner().run(
    (transaction) =>
      composition.repository.findCandidate(
        transaction,
        scope,
        candidateId("candidate_a"),
      ),
  );
  assertEquals(sourceCandidate?.runId, completedA.id);
  assertEquals(secondCompleted.id, runId("run_b"));
  const beforeRejected = effects.events.length;
  await assertShortlistRejected(composition, {
    id: "cross-run",
    runId: secondCompleted.id,
    candidateId: candidateId("candidate_a"),
    key: "idem_shortlist_cross_run",
    code: "ACTION_FORBIDDEN",
  });
  await assertShortlistRejected(composition, {
    id: "queued",
    runId: queued.id,
    candidateId: candidateId("candidate_queued"),
    key: "idem_shortlist_queued",
    code: "INVALID_TRANSITION",
  });
  await assertShortlistRejected(composition, {
    id: "running",
    runId: running.id,
    candidateId: candidateId("candidate_running"),
    key: "idem_shortlist_running",
    code: "INVALID_TRANSITION",
  });
  await assertShortlistRejected(composition, {
    id: "failed",
    runId: failed.id,
    candidateId: candidateId("candidate_failed"),
    key: "idem_shortlist_failed",
    code: "INVALID_TRANSITION",
  });
  await assertShortlistRejected(composition, {
    id: "cancelled",
    runId: cancelled.id,
    candidateId: candidateId("candidate_cancelled"),
    key: "idem_shortlist_cancelled",
    code: "INVALID_TRANSITION",
  });
  assertEquals(effects.events.length, beforeRejected);
  assertEquals(
    await storedShortlist(
      composition,
      shortlistDecisionId("shortlist_cross-run"),
    ),
    undefined,
  );
  const invalidOutreach = await assertRejects(
    async () =>
      await composition.service.authorizeOutreach({
        context,
        actor: human,
        scope,
        id: "outreach_invalid" as never,
        idempotencyKey: "idem_outreach_invalid" as never,
        shortlistDecisionId: shortlistDecisionId("shortlist_cross-run"),
        candidateId: candidateId("candidate_a"),
        authoritySnapshotReference: authority,
      }),
    MatchingError,
  );
  assertEquals((invalidOutreach as MatchingError).code, "PROTECTED_NOT_FOUND");
  assertEquals(effects.events.length, beforeRejected);

  const shortlist = await composition.service.decideShortlist({
    context,
    actor: human,
    scope,
    id: shortlistDecisionId("shortlist_valid"),
    idempotencyKey: "idem_shortlist_valid" as never,
    runId: completed.id,
    candidateId: candidateId("candidate_a"),
    state: "shortlisted",
    authoritySnapshotReference: authority,
  });
  assertEquals(shortlist.runId, completed.id);
  const outreach = await composition.service.authorizeOutreach({
    context,
    actor: human,
    scope,
    id: "outreach_valid" as never,
    idempotencyKey: "idem_outreach_valid" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: shortlist.candidateId,
    authoritySnapshotReference: authority,
  });
  assertEquals(outreach.shortlistDecisionId, shortlist.id);
});

Deno.test("Matching treats an infeasible terminal run as a valid candidate source", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
    clock: fixedClock(),
  });
  const criteria = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: criteriaId("criteria_infeasible"),
    idempotencyKey: "idem_create_infeasible" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: {
      budgetLimit: 10,
      riskThreshold: 1,
      taxDebtCap: 10,
      mandatoryCandidateIds: ["candidate_missing"],
    },
  });
  const active = await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: criteria.id,
    idempotencyKey: "idem_activate_infeasible" as never,
    expectedVersion: criteria.version,
  });
  const run = await startRun(
    composition,
    active.id,
    "run_infeasible",
    "candidate_infeasible",
  );
  const completed = await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: run.id,
    idempotencyKey: "idem_execute_infeasible" as never,
  });
  assertEquals(completed.state, "infeasible");
  const shortlist = await composition.service.decideShortlist({
    context,
    actor: human,
    scope,
    id: shortlistDecisionId("shortlist_infeasible"),
    idempotencyKey: "idem_shortlist_infeasible" as never,
    runId: completed.id,
    candidateId: candidateId("candidate_infeasible"),
    state: "shortlisted",
    authoritySnapshotReference: authority,
  });
  assertEquals(shortlist.runId, completed.id);
});

async function activeCriteria(
  composition: ReturnType<typeof createInMemoryMatchingTestComposition>,
  id: string,
) {
  const criteria = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: criteriaId(id),
    idempotencyKey: `idem_create_${id}` as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  });
  return await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: criteria.id,
    idempotencyKey: `idem_activate_${id}` as never,
    expectedVersion: criteria.version,
  });
}

async function startRun(
  composition: ReturnType<typeof createInMemoryMatchingTestComposition>,
  criteriaIdValue: string,
  runSuffix: string,
  candidateSuffix: string,
): Promise<MatchingRun> {
  const candidate = matchingCandidate(candidateSuffix);
  const result = await composition.service.startRun({
    context,
    actor: human,
    scope,
    id: runId(runSuffix),
    criteriaId: criteriaId(criteriaIdValue),
    idempotencyKey: `idem_start_${runSuffix}` as never,
    candidateInputs: [{
      id: candidateId(candidateSuffix),
      restrictedIdentityReference: `identity_${candidateSuffix}`,
      sourceReference: `source_${candidateSuffix}`,
      candidate,
    }],
  });
  return result.run;
}

async function setState(
  composition: ReturnType<typeof createInMemoryMatchingTestComposition>,
  run: MatchingRun,
  state: MatchingRun["state"],
): Promise<MatchingRun> {
  const transactions = new InMemoryMatchingTransactionRunner();
  return await transactions.run(async (transaction) => {
    const current = await composition.repository.findRun(
      transaction,
      scope,
      run.id,
    );
    if (current === undefined) throw new Error(`Missing test run "${run.id}".`);
    const updated = transitionRun(current, state, fixedClock().now());
    await composition.repository.updateRun(
      transaction,
      updated,
      current.version,
    );
    return updated;
  });
}

async function assertShortlistRejected(
  composition: ReturnType<typeof createInMemoryMatchingTestComposition>,
  input: {
    readonly id: string;
    readonly runId: MatchingRun["id"];
    readonly candidateId: string;
    readonly key: string;
    readonly code: MatchingError["code"];
  },
): Promise<void> {
  const error = await assertRejects(
    async () =>
      await composition.service.decideShortlist({
        context,
        actor: human,
        scope,
        id: shortlistDecisionId(`shortlist_${input.id}`),
        idempotencyKey: input.key as never,
        runId: input.runId,
        candidateId: candidateId(input.candidateId),
        state: "shortlisted",
        authoritySnapshotReference: authority,
      }),
    MatchingError,
  );
  assertEquals((error as MatchingError).code, input.code);
}

async function storedShortlist(
  composition: ReturnType<typeof createInMemoryMatchingTestComposition>,
  id: ReturnType<typeof shortlistDecisionId>,
) {
  return await new InMemoryMatchingTransactionRunner().run((transaction) =>
    composition.repository.findShortlistDecision(transaction, scope, id)
  );
}

function matchingCandidate(id: string): MatchingCandidate {
  return {
    id,
    synergyValue: 9,
    acquisitionCost: 10,
    sector: "technology",
    riskScore: 1,
    taxDebt: 0,
    eligibility: {
      contractVersion: LEGACY_ADAPTER_CONTRACT_VERSION,
      status: "legacy-compatible",
    },
  };
}

function fixedClock() {
  return { now: () => new Date("2026-08-07T18:30:00.000Z") };
}

function allow(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [],
    approvedScope: undefined as never,
    authoritySnapshotReference: authority as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}
