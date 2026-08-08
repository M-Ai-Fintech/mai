import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import type {
  ActorReference,
  AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import { field } from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import { MatchingError } from "../../src/matching/v1.ts";
import {
  candidateId,
  conflictId,
  createInMemoryMatchingTestComposition,
  criteriaId,
  type MatchingScope,
  outreachAuthorizationId,
  RecordingMatchingEffects,
  RecordingMatchingRunScheduler,
  restrictionId,
  runId,
  shortlistDecisionId,
} from "../../src/matching/v1.ts";
import {
  LEGACY_ADAPTER_CONTRACT_VERSION,
  type MatchingCandidate,
} from "../../src/engines/optimization/matching/types.ts";

const scope: MatchingScope = {
  tenantId: "tenant_matching" as never,
  workspaceId: "workspace_matching" as never,
  dealId: "deal_matching" as never,
};
const context: RequestContext = {
  actorId: "actor_requester" as never,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId: "cor_matching" as never,
  origin: "http",
};
const human: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};
const ai: ActorReference = {
  id: "actor_copilot" as never,
  kind: "ai",
  state: "active",
};

Deno.test("Matching denies protected reads before repository load", async () => {
  let loads = 0;
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(deny()) },
  });
  const original = composition.repository.findCandidate.bind(
    composition.repository,
  );
  composition.repository.findCandidate = async (...args) => {
    loads += 1;
    return await original(...args);
  };
  const deniedError = await assertRejects(
    () =>
      composition.service.readCandidate({
        context,
        actor: human,
        scope,
        id: candidateId("candidate_hidden"),
      }),
    MatchingError,
    "not visible",
  );
  assertEquals(loads, 0);
  assertEquals((deniedError as MatchingError).code, "PROTECTED_NOT_FOUND");
});

Deno.test("Matching lifecycle recomputes deterministic projections through MAI-19", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
    clock: fixedClock(),
  });
  const criteria = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: criteriaId("criteria_demo"),
    idempotencyKey: "idem_create_demo" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  });
  const active = await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: criteria.id,
    idempotencyKey: "idem_activate_demo" as never,
    expectedVersion: criteria.version,
  });
  const candidate = matchingCandidate("candidate_alpha", 9);
  const secondary = matchingCandidate("candidate_beta", 2);
  const started = await composition.service.startRun({
    context,
    actor: human,
    scope,
    id: runId("run_demo"),
    criteriaId: active.id,
    idempotencyKey: "idem_matching-run" as never,
    candidateInputs: [
      {
        id: candidateId(candidate.id),
        restrictedIdentityReference: "identity_restricted_alpha",
        sourceReference: "source_import_alpha",
        candidate,
      },
      {
        id: candidateId(secondary.id),
        restrictedIdentityReference: "identity_restricted_beta",
        sourceReference: "source_import_beta",
        candidate: secondary,
      },
    ],
  });
  const completed = await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: started.run.id,
    idempotencyKey: "idem_execute_demo" as never,
  });
  assertEquals(completed.state, "succeeded");
  assertEquals(completed.result?.selectedCandidateIds, [candidate.id]);
  const scheduler = composition.scheduler as RecordingMatchingRunScheduler;
  const effects = composition.effects as RecordingMatchingEffects;
  assertEquals(scheduler.jobs.length, 1);
  assertEquals(effects.events.map((event) => event.eventType), [
    "criteria_created",
    "criteria_activated",
    "run_queued",
    "run_completed",
  ]);
});

Deno.test("Matching gives restrictions precedence over conflicts before shortlist", async () => {
  const authority = "authority_matching_human";
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow([], authority)) },
    clock: fixedClock(),
  });
  const run = await readyRun(composition);
  await composition.service.openRestriction({
    context,
    actor: human,
    scope,
    id: restrictionId("restriction_alpha"),
    idempotencyKey: "idem_open_restriction_alpha" as never,
    candidateId: candidateId("candidate_alpha"),
    category: "restricted_identity",
  });
  await composition.service.openConflict({
    context,
    actor: human,
    scope,
    id: conflictId("conflict_alpha"),
    idempotencyKey: "idem_open_conflict_alpha" as never,
    candidateId: candidateId("candidate_alpha"),
    kind: "restricted_identity",
  });
  const restrictionError = await assertRejects(
    () =>
      composition.service.decideShortlist({
        context,
        actor: human,
        scope,
        id: shortlistDecisionId("shortlist_blocked"),
        idempotencyKey: "idem_shortlist_blocked" as never,
        runId: run.id,
        candidateId: candidateId("candidate_alpha"),
        state: "shortlisted",
        authoritySnapshotReference: authority,
      }),
    MatchingError,
  );
  assertEquals(
    (restrictionError as MatchingError).code,
    "RESTRICTION_BLOCKING",
  );
  const restriction = await composition.service.clearRestriction({
    context,
    actor: human,
    scope,
    id: restrictionId("restriction_alpha"),
    idempotencyKey: "idem_clear_restriction_alpha" as never,
    candidateId: candidateId("candidate_alpha"),
    expectedVersion: 1,
  });
  assertEquals(restriction.state, "cleared");
  const conflictError = await assertRejects(
    () =>
      composition.service.decideShortlist({
        context,
        actor: human,
        scope,
        id: shortlistDecisionId("shortlist_conflicted"),
        idempotencyKey: "idem_shortlist_conflicted" as never,
        runId: run.id,
        candidateId: candidateId("candidate_alpha"),
        state: "shortlisted",
        authoritySnapshotReference: authority,
      }),
    MatchingError,
  );
  assertEquals((conflictError as MatchingError).code, "CONFLICT_BLOCKING");
  const resolved = await composition.service.resolveConflict({
    context,
    actor: human,
    scope,
    id: conflictId("conflict_alpha"),
    idempotencyKey: "idem_resolve_conflict_alpha" as never,
    expectedVersion: 1,
  });
  assertEquals(resolved.state, "resolved");
  const shortlist = await composition.service.decideShortlist({
    context,
    actor: human,
    scope,
    id: shortlistDecisionId("shortlist_alpha"),
    idempotencyKey: "idem_shortlist_alpha" as never,
    runId: run.id,
    candidateId: candidateId("candidate_alpha"),
    state: "shortlisted",
    authoritySnapshotReference: authority,
  });
  const outreach = await composition.service.authorizeOutreach({
    context,
    actor: human,
    scope,
    id: outreachAuthorizationId("outreach_alpha"),
    idempotencyKey: "idem_authorize_outreach_alpha" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: candidateId("candidate_alpha"),
    authoritySnapshotReference: authority,
  });
  assertEquals(outreach.state, "authorized");
  const revoked = await composition.service.revokeOutreach({
    context,
    actor: human,
    scope,
    id: outreach.id,
    idempotencyKey: "idem_revoke_outreach_alpha" as never,
    shortlistDecisionId: shortlist.id,
    candidateId: candidateId("candidate_alpha"),
    authoritySnapshotReference: authority,
    expectedVersion: outreach.version,
  });
  assertEquals(revoked.state, "revoked");
});

Deno.test("Matching rejects AI shortlist authority and isolates tenant scope", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: {
      authorize: () => Promise.resolve(allow([], "authority_matching_human")),
    },
  });
  const authorityError = await assertRejects(
    () =>
      composition.service.decideShortlist({
        context,
        actor: ai,
        scope,
        id: shortlistDecisionId("shortlist_ai"),
        idempotencyKey: "idem_shortlist_ai" as never,
        runId: runId("run_missing"),
        candidateId: candidateId("candidate_missing"),
        state: "shortlisted",
        authoritySnapshotReference: "authority_matching_human",
      }),
    MatchingError,
  );
  assertEquals(
    (authorityError as MatchingError).code,
    "HUMAN_AUTHORITY_REQUIRED",
  );
  const otherScope = { ...scope, tenantId: "tenant_other" as never };
  const scopeError = await assertRejects(
    () =>
      composition.service.readCandidate({
        context,
        actor: human,
        scope: otherScope,
        id: candidateId("candidate_missing"),
      }),
    MatchingError,
  );
  assertEquals((scopeError as MatchingError).code, "ACTION_FORBIDDEN");
});

Deno.test("Matching run start replays one idempotent job and rejects payload drift", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
  });
  const criteria = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: criteriaId("criteria_replay"),
    idempotencyKey: "idem_create_replay" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  });
  await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: criteria.id,
    idempotencyKey: "idem_activate_replay" as never,
    expectedVersion: 1,
  });
  const candidate = matchingCandidate("candidate_replay", 9);
  const input = {
    context,
    actor: human,
    scope,
    id: runId("run_replay"),
    criteriaId: criteria.id,
    idempotencyKey: "idem_replay" as never,
    candidateInputs: [{
      id: candidateId(candidate.id),
      restrictedIdentityReference: "identity_replay",
      sourceReference: "source_replay",
      candidate,
    }],
  };
  const first = await composition.service.startRun(input);
  const replay = await composition.service.startRun(input);
  assertEquals(replay.run.id, first.run.id);
  assertEquals(
    (composition.scheduler as RecordingMatchingRunScheduler).jobs.length,
    1,
  );
  const changed = await assertRejects(
    () =>
      composition.service.startRun({
        ...input,
        candidateInputs: [{
          ...input.candidateInputs[0],
          candidate: matchingCandidate("candidate_replay", 8),
        }],
      }),
    MatchingError,
  );
  assertEquals((changed as MatchingError).code, "IDEMPOTENCY_CONFLICT");
});

Deno.test("Matching omits restricted identity unless field authority is explicit", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: {
      authorize: () => Promise.resolve(allow(["candidate_metrics"])),
    },
  });
  const run = await readyRun(composition);
  const hidden = await composition.service.readCandidate({
    context,
    actor: human,
    scope,
    id: candidateId("candidate_alpha"),
  });
  assertEquals(hidden.restrictedIdentityReference, undefined);
  assertEquals(hidden.metrics?.synergyValue, 9);
  assertStringIncludes(run.id, "run_");
});

async function readyRun(
  composition: ReturnType<typeof createInMemoryMatchingTestComposition>,
) {
  const criteria = await composition.service.createCriteria({
    context,
    actor: human,
    scope,
    id: criteriaId("criteria_ready"),
    idempotencyKey: "idem_create_ready" as never,
    optimizerContractVersion: "matching-portfolio/v1",
    selection: { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 },
  });
  const active = await composition.service.activateCriteria({
    context,
    actor: human,
    scope,
    id: criteria.id,
    idempotencyKey: "idem_activate_ready" as never,
    expectedVersion: 1,
  });
  const candidate = matchingCandidate("candidate_alpha", 9);
  const secondary = matchingCandidate("candidate_beta", 2);
  const started = await composition.service.startRun({
    context,
    actor: human,
    scope,
    id: runId("run_ready"),
    criteriaId: active.id,
    idempotencyKey: "idem_ready" as never,
    candidateInputs: [
      {
        id: candidateId(candidate.id),
        restrictedIdentityReference: "identity_alpha",
        sourceReference: "source_alpha",
        candidate,
      },
      {
        id: candidateId(secondary.id),
        restrictedIdentityReference: "identity_beta",
        sourceReference: "source_beta",
        candidate: secondary,
      },
    ],
  });
  return await composition.service.executeRun({
    context,
    actor: human,
    scope,
    id: started.run.id,
    idempotencyKey: "idem_execute_ready" as never,
  });
}

function matchingCandidate(
  id: string,
  synergyValue: number,
): MatchingCandidate {
  return {
    id,
    synergyValue,
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

function allow(
  names: readonly string[] = [
    "candidate_metrics",
    "candidate_source",
    "candidate_identity",
    "conflict_rationale",
  ],
  authoritySnapshotReference?: string,
): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [],
    approvedScope: undefined as never,
    authoritySnapshotReference: authoritySnapshotReference as never,
    fieldMask: {
      include: names.map(field),
      omit: [],
      redact: [],
      approvedClassifications: names.map((name) => ({
        name: field(name),
        classification: name.includes("identity") || name.includes("source")
          ? "restricted" as const
          : name.includes("rationale")
          ? "conflict_rationale" as const
          : "public" as const,
      })),
    },
  };
}

function deny(): AuthorizationDecision {
  return {
    outcome: "deny",
    reasonCode: "NO_MATCHING_GRANT",
    allowedActions: [],
    approvedScope: undefined,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}
