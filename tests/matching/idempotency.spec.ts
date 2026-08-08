import { assertEquals, assertRejects } from "@std/assert";
import type {
  ActorReference,
  AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import {
  candidateId,
  conflictId,
  createInMemoryMatchingTestComposition,
  criteriaId,
  MatchingError,
  type MatchingScope,
  outreachAuthorizationId,
  RecordingMatchingEffects,
  restrictionId,
  runId,
  shortlistDecisionId,
} from "../../src/matching/v1.ts";
import {
  LEGACY_ADAPTER_CONTRACT_VERSION,
  type MatchingCandidate,
} from "../../src/engines/optimization/matching/types.ts";

const scope: MatchingScope = {
  tenantId: "tenant_idempotency" as never,
  workspaceId: "workspace_idempotency" as never,
  dealId: "deal_idempotency" as never,
};
const context: RequestContext = {
  actorId: "actor_idempotency" as never,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId: "cor_idempotency" as never,
  origin: "http",
};
const human: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};
const authority = "authority_idempotency";

Deno.test("Matching replays every mutation without duplicate effects", async () => {
  const effects = new RecordingMatchingEffects();
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
    effects,
  });
  const created = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: criteriaId("criteria_all"),
    idempotencyKey: "idem_create_all" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  });
  const createdReplay = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: created.id,
    idempotencyKey: "idem_create_all" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  });
  assertEquals(createdReplay, created);
  const createdEffects = effects.events.length;

  const active = await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: created.id,
    idempotencyKey: "idem_activate_all" as never,
    expectedVersion: created.version,
  });
  const activeReplay = await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: created.id,
    idempotencyKey: "idem_activate_all" as never,
    expectedVersion: created.version,
  });
  assertEquals(activeReplay, active);
  assertEquals(effects.events.length, createdEffects + 1);

  const candidate = matchingCandidate("candidate_all");
  const startInput = {
    context,
    actor: human,
    scope,
    id: runId("run_all"),
    criteriaId: active.id,
    idempotencyKey: "idem_start_all" as never,
    candidateInputs: [{
      id: candidateId(candidate.id),
      restrictedIdentityReference: "identity_all",
      sourceReference: "source_all",
      candidate,
    }],
  };
  const started = await composition.service.startRun(startInput);
  const startedReplay = await composition.service.startRun(startInput);
  assertEquals(startedReplay, started);
  const executed = await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: started.run.id,
    idempotencyKey: "idem_execute_all" as never,
  });
  const executedReplay = await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: started.run.id,
    idempotencyKey: "idem_execute_all" as never,
  });
  assertEquals(executedReplay, executed);

  const openedConflict = await composition.service.openConflict({
    context,
    actor: human,
    scope,
    id: conflictId("conflict_all"),
    idempotencyKey: "idem_open_conflict_all" as never,
    candidateId: candidateId(candidate.id),
    kind: "manual",
  });
  const openedConflictReplay = await composition.service.openConflict({
    context,
    actor: human,
    scope,
    id: openedConflict.id,
    idempotencyKey: "idem_open_conflict_all" as never,
    candidateId: candidateId(candidate.id),
    kind: "manual",
  });
  assertEquals(openedConflictReplay, openedConflict);
  const openedRestriction = await composition.service.openRestriction({
    context,
    actor: human,
    scope,
    id: restrictionId("restriction_all"),
    idempotencyKey: "idem_open_restriction_all" as never,
    candidateId: candidateId(candidate.id),
    category: "restricted_identity",
  });
  const openedRestrictionReplay = await composition.service.openRestriction({
    context,
    actor: human,
    scope,
    id: openedRestriction.id,
    idempotencyKey: "idem_open_restriction_all" as never,
    candidateId: candidateId(candidate.id),
    category: "restricted_identity",
  });
  assertEquals(openedRestrictionReplay, openedRestriction);
  const clearedRestriction = await composition.service.clearRestriction({
    context,
    actor: human,
    scope,
    id: openedRestriction.id,
    idempotencyKey: "idem_clear_restriction_all" as never,
    candidateId: candidateId(candidate.id),
    expectedVersion: openedRestriction.version,
  });
  const clearedRestrictionReplay = await composition.service.clearRestriction({
    context,
    actor: human,
    scope,
    id: openedRestriction.id,
    idempotencyKey: "idem_clear_restriction_all" as never,
    candidateId: candidateId(candidate.id),
    expectedVersion: openedRestriction.version,
  });
  assertEquals(clearedRestrictionReplay, clearedRestriction);
  const resolvedConflict = await composition.service.resolveConflict({
    context,
    actor: human,
    scope,
    id: openedConflict.id,
    idempotencyKey: "idem_resolve_conflict_all" as never,
    expectedVersion: openedConflict.version,
  });
  const resolvedConflictReplay = await composition.service.resolveConflict({
    context,
    actor: human,
    scope,
    id: openedConflict.id,
    idempotencyKey: "idem_resolve_conflict_all" as never,
    expectedVersion: openedConflict.version,
  });
  assertEquals(resolvedConflictReplay, resolvedConflict);

  const shortlist = await composition.service.decideShortlist({
    context,
    actor: human,
    scope,
    id: shortlistDecisionId("shortlist_all"),
    idempotencyKey: "idem_shortlist_all" as never,
    runId: started.run.id,
    candidateId: candidateId(candidate.id),
    state: "shortlisted",
    authoritySnapshotReference: authority,
  });
  const shortlistReplay = await composition.service.decideShortlist({
    context,
    actor: human,
    scope,
    id: shortlist.id,
    idempotencyKey: "idem_shortlist_all" as never,
    runId: started.run.id,
    candidateId: candidateId(candidate.id),
    state: "shortlisted",
    authoritySnapshotReference: authority,
  });
  assertEquals(shortlistReplay, shortlist);
  const outreach = await composition.service.authorizeOutreach({
    context,
    actor: human,
    scope,
    id: outreachAuthorizationId("outreach_all"),
    idempotencyKey: "idem_outreach_all" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: shortlist.candidateId,
    authoritySnapshotReference: authority,
  });
  const outreachReplay = await composition.service.authorizeOutreach({
    context,
    actor: human,
    scope,
    id: outreach.id,
    idempotencyKey: "idem_outreach_all" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: shortlist.candidateId,
    authoritySnapshotReference: authority,
  });
  assertEquals(outreachReplay, outreach);
  const revoked = await composition.service.revokeOutreach({
    context,
    actor: human,
    scope,
    id: outreach.id,
    idempotencyKey: "idem_revoke_all" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: shortlist.candidateId,
    authoritySnapshotReference: authority,
    expectedVersion: outreach.version,
  });
  const revokedReplay = await composition.service.revokeOutreach({
    context,
    actor: human,
    scope,
    id: outreach.id,
    idempotencyKey: "idem_revoke_all" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: shortlist.candidateId,
    authoritySnapshotReference: authority,
    expectedVersion: outreach.version,
  });
  assertEquals(revokedReplay, revoked);
  assertEquals(effects.events.length, 11);
  assertEquals(
    (composition.scheduler as unknown as { jobs: readonly unknown[] }).jobs
      .length,
    1,
  );
});

Deno.test("Matching idempotency rejects semantic drift and isolates scopes", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
  });
  const input = {
    context,
    actor: human,
    scope,
    id: criteriaId("criteria_conflict"),
    idempotencyKey: "idem_semantic_conflict" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  };
  await composition.service.createCriteria(input);
  const changed = await assertRejects(
    () =>
      composition.service.createCriteria({
        ...input,
        selection: { ...input.selection, budgetLimit: 9 },
      }),
    MatchingError,
  );
  assertEquals((changed as MatchingError).code, "IDEMPOTENCY_CONFLICT");
  const changedCommand = await assertRejects(
    () =>
      composition.service.activateCriteria({
        context,
        actor: human,
        scope,
        id: input.id,
        idempotencyKey: input.idempotencyKey,
        expectedVersion: 1,
      }),
    MatchingError,
  );
  assertEquals((changedCommand as MatchingError).code, "IDEMPOTENCY_CONFLICT");

  const otherScope = {
    ...scope,
    tenantId: "tenant_other_idempotency" as never,
    workspaceId: "workspace_other_idempotency" as never,
    dealId: "deal_other_idempotency" as never,
  };
  const otherContext = {
    ...context,
    tenantId: otherScope.tenantId,
    workspaceId: otherScope.workspaceId,
    dealId: otherScope.dealId,
  };
  const isolated = await composition.service.createCriteria({
    ...input,
    context: otherContext,
    scope: otherScope,
    id: criteriaId("criteria_conflict"),
  });
  assertEquals(isolated.scope.dealId, otherScope.dealId);
});

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
