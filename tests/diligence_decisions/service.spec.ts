import { assertEquals, assertRejects } from "@std/assert";
import type {
  Action,
  ActorReference,
  AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import { allowedDecision } from "../../src/platform/authz/vocabulary.ts";
import {
  parseActorId,
  parseAggregateVersion,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";
import {
  type IdempotencyClaim,
  type IdempotencyClaimResult,
  IdempotencyConflictError,
  type TransactionHandle,
  type TransactionQueryResult,
} from "../../src/platform/persistence/v1.ts";
import type { ApprovalAuthoritySnapshotPort } from "../../src/work_management/v1.ts";
import {
  createDecisionRequest,
  createExactEvidenceBasis,
  type DecisionAuthorizationPort,
  type DecisionRequest,
  type DiligenceDecisionEffects,
  DiligenceDecisionError,
  DiligenceDecisionService,
  type DiligenceIdempotencyPort,
  type DiligenceScope,
  type EvidenceBasisVerificationPort,
  parseDecisionRecordId,
  parseDecisionRequestId,
  parseFindingId,
} from "../../src/diligence_decisions/v1.ts";
import { MemoryRepository } from "./service_support.ts";

const scope: DiligenceScope = {
  tenantId: required("tenant_test", parseTenantId),
  workspaceId: required("workspace_test", parseWorkspaceId),
  dealId: required("deal_test", parseDealId),
};
const actor = human("actor_requester");
const approver = human("actor_approver");
const context: RequestContext = {
  actorId: actor.id,
  ...scope,
  correlationId: required("cor_diligence", parseCorrelationId),
  origin: "internal",
};

Deno.test("authorization denies before protected Diligence loads", async () => {
  const repository = new MemoryRepository();
  const service = serviceFor(repository, new FakeAuthorization("deny"));
  const error = await assertRejects(
    () => service.getDecisionRequest(context, scope, requestId("read")),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "ACTOR_DENIED");
  assertEquals(repository.loadCount, 0);
});

Deno.test("requesting a decision requires the exact stored evidence basis", async () => {
  const repository = new MemoryRepository();
  const request = createRequest("basis", "draft");
  repository.requests.set(request.id, request);
  const service = serviceFor(repository);
  const error = await assertRejects(
    () =>
      service.requestDecision({
        context,
        scope,
        requestId: request.id,
        expectedRequestVersion: request.version,
        basis: basis("different"),
        idempotencyKey: key("basis"),
      }),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "EXACT_BASIS_MISMATCH");
  assertEquals(repository.requests.get(request.id)?.state, "draft");
});

Deno.test("identical command replay has one durable side effect and changed payload conflicts", async () => {
  const repository = new MemoryRepository();
  const service = serviceFor(repository);
  const input = findingCommand("replay", "Original statement");
  const first = await service.createFinding(input);
  const replay = await service.createFinding(input);
  assertEquals(replay, { status: "replayed", value: first.value });
  assertEquals(repository.findingInsertCount, 1);
  const error = await assertRejects(
    () => service.createFinding({ ...input, statement: "Changed statement" }),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "IDEMPOTENCY_CONFLICT");
});

Deno.test("proposal approval requires a human and advances the exact aggregate version", async () => {
  const repository = new MemoryRepository();
  const service = serviceFor(repository);
  const proposed = await service.createFinding(
    findingCommand("approval", "A proposed finding."),
  );
  const approved = await service.transitionFinding({
    context,
    scope,
    aggregateType: "finding",
    id: proposed.value.id,
    expectedVersion: requiredVersion(1),
    next: "approved",
    basis: proposed.value.basis,
    actor,
    idempotencyKey: key("approve"),
  });
  assertEquals(approved.value.state, "approved");
  assertEquals(approved.value.version, requiredVersion(2));
  const second = await service.createFinding(
    findingCommand("agent-approval", "Another proposed finding."),
  );
  const denied = await assertRejects(
    () =>
      service.transitionFinding({
        context,
        scope,
        aggregateType: "finding",
        id: second.value.id,
        expectedVersion: requiredVersion(1),
        next: "approved",
        basis: second.value.basis,
        actor: { ...actor, kind: "ai" },
        idempotencyKey: key("agent-supersede"),
      }),
    DiligenceDecisionError,
  );
  assertEquals(denied.code, "HUMAN_AUTHORITY_REQUIRED");
});

Deno.test("recording then superseding preserves the old immutable record", async () => {
  const repository = new MemoryRepository();
  const request = createRequest("record", "requested");
  repository.requests.set(request.id, request);
  const service = serviceFor(repository);
  const recorded = await service.recordDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: recordId("old"),
    expectedRequestVersion: request.version,
    outcome: "approved",
    basis: request.basis,
    actor: approver,
    namedApproverId: approver.id,
    idempotencyKey: key("record"),
  });
  const oldRecord = recorded.value;
  const projection = repository.projections.get(request.id);
  if (projection === undefined) {
    throw new Error("Expected initial decision projection.");
  }
  const supersedeInput = {
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: oldRecord.id,
    replacementRecordId: recordId("new"),
    expectedRequestVersion: requiredVersion(Number(request.version) + 1),
    expectedProjectionVersion: projection.version,
    outcome: "waived",
    basis: recorded.value.basis,
    actor: approver,
    namedApproverId: approver.id,
    reason: "A later exact basis supersedes the prior disposition.",
    idempotencyKey: key("supersede"),
  } as const;
  const superseded = await service.supersedeDecision(supersedeInput);
  assertEquals(superseded.value.state, "active");
  assertEquals(repository.records.get(oldRecord.id), oldRecord);
  assertEquals(
    repository.records.get(recordId("new"))?.supersedesRecordId,
    oldRecord.id,
  );
  assertEquals(
    repository.requests.get(request.id)?.decisionRecordId,
    recordId("new"),
  );
  assertEquals(
    repository.projections.get(request.id)?.currentRecordId,
    recordId("new"),
  );
  const chained = await service.supersedeDecision({
    ...supersedeInput,
    recordId: recordId("new"),
    replacementRecordId: recordId("newer"),
    expectedRequestVersion: requiredVersion(Number(request.version) + 2),
    expectedProjectionVersion: requiredVersion(
      Number(projection.version) + 1,
    ),
    outcome: "rejected",
    basis: oldRecord.basis,
    idempotencyKey: key("supersede-chain"),
  });
  assertEquals(chained.value.state, "active");
  assertEquals(chained.value.currentRecordId, recordId("newer"));
  assertEquals(repository.records.get(oldRecord.id), oldRecord);
  assertEquals(
    repository.records.get(recordId("new"))?.supersedesRecordId,
    oldRecord.id,
  );
  assertEquals(
    repository.records.get(recordId("newer"))?.supersedesRecordId,
    recordId("new"),
  );
  assertEquals(
    repository.requests.get(request.id)?.decisionRecordId,
    recordId("newer"),
  );
  assertEquals(
    repository.projections.get(request.id)?.currentRecordId,
    recordId("newer"),
  );
  assertEquals(repository.history.size, 3);
  assertEquals(
    repository.history.get("decision_history_old-superseded")?.basisDigest,
    oldRecord.basis.basisDigest,
  );
  assertEquals(
    repository.history.get("decision_history_new-superseded")?.basisDigest,
    oldRecord.basis.basisDigest,
  );
  const replay = await service.supersedeDecision(supersedeInput);
  assertEquals(replay.status, "replayed");
  assertEquals(replay.value.currentRecordId, recordId("newer"));
});

Deno.test("a superseded current record can be invalidated without rewriting history", async () => {
  const repository = new MemoryRepository();
  const request = createRequest("invalidate-after-supersede", "requested");
  repository.requests.set(request.id, request);
  const service = serviceFor(repository);
  const recorded = await service.recordDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: recordId("invalidate-chain-old"),
    expectedRequestVersion: request.version,
    outcome: "approved",
    basis: request.basis,
    actor: approver,
    namedApproverId: approver.id,
    idempotencyKey: key("invalidate-chain-record"),
  });
  const initialProjection = repository.projections.get(request.id);
  if (initialProjection === undefined) {
    throw new Error("Expected projection fixture.");
  }
  const superseded = await service.supersedeDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: recorded.value.id,
    replacementRecordId: recordId("invalidate-chain-new"),
    expectedRequestVersion: requiredVersion(Number(request.version) + 1),
    expectedProjectionVersion: initialProjection.version,
    outcome: "waived",
    basis: recorded.value.basis,
    actor: approver,
    namedApproverId: approver.id,
    reason: "A current decision was superseded before invalidation.",
    idempotencyKey: key("invalidate-chain-supersede"),
  });
  const invalidated = await service.invalidateDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: superseded.value.currentRecordId,
    expectedRequestVersion: requiredVersion(Number(request.version) + 2),
    expectedProjectionVersion: superseded.value.version,
    basis: recorded.value.basis,
    actor: approver,
    namedApproverId: approver.id,
    reason: "The current superseding decision was invalidated.",
    idempotencyKey: key("invalidate-chain"),
  });
  assertEquals(invalidated.value.state, "invalidated");
  assertEquals(
    invalidated.value.currentRecordId,
    recordId("invalidate-chain-new"),
  );
  assertEquals(repository.requests.get(request.id)?.state, "invalidated");
  assertEquals(
    repository.requests.get(request.id)?.decisionRecordId,
    recordId("invalidate-chain-new"),
  );
  assertEquals(repository.records.get(recorded.value.id), recorded.value);
  assertEquals(
    repository.records.get(recordId("invalidate-chain-new"))?.basis,
    recorded.value.basis,
  );
  assertEquals(repository.history.size, 3);
});

Deno.test("Decision supersession still requires an active human authority", async () => {
  const repository = new MemoryRepository();
  const request = createRequest("human-authority", "requested");
  repository.requests.set(request.id, request);
  const service = serviceFor(repository);
  const recorded = await service.recordDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: recordId("human-authority-old"),
    expectedRequestVersion: request.version,
    outcome: "approved",
    basis: request.basis,
    actor: approver,
    namedApproverId: approver.id,
    idempotencyKey: key("human-authority-record"),
  });
  const projection = repository.projections.get(request.id);
  if (projection === undefined) throw new Error("Expected projection fixture.");
  const ai = { ...approver, kind: "ai" as const };
  const error = await assertRejects(
    () =>
      service.supersedeDecision({
        context: { ...context, actorId: ai.id },
        scope,
        requestId: request.id,
        recordId: recorded.value.id,
        replacementRecordId: recordId("human-authority-new"),
        expectedRequestVersion: requiredVersion(Number(request.version) + 1),
        expectedProjectionVersion: projection.version,
        outcome: "waived",
        basis: recorded.value.basis,
        actor: ai,
        namedApproverId: approver.id,
        reason: "An AI actor must not supersede a human decision.",
        idempotencyKey: key("human-authority-supersede"),
      }),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "HUMAN_AUTHORITY_REQUIRED");
  assertEquals(repository.records.has(recordId("human-authority-new")), false);
});

Deno.test("invalidation changes the request projection without rewriting the record", async () => {
  const repository = new MemoryRepository();
  const request = createRequest("invalidate", "requested");
  repository.requests.set(request.id, request);
  const service = serviceFor(repository);
  const recorded = await service.recordDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: recordId("invalidate-old"),
    expectedRequestVersion: request.version,
    outcome: "approved",
    basis: request.basis,
    actor: approver,
    namedApproverId: approver.id,
    idempotencyKey: key("invalidate-record"),
  });
  const projection = repository.projections.get(request.id);
  if (projection === undefined) throw new Error("Expected projection fixture.");
  const invalidated = await service.invalidateDecision({
    context: { ...context, actorId: approver.id },
    scope,
    requestId: request.id,
    recordId: recorded.value.id,
    expectedRequestVersion: requiredVersion(Number(request.version) + 1),
    expectedProjectionVersion: projection.version,
    basis: request.basis,
    actor: approver,
    namedApproverId: approver.id,
    reason: "The exact source was invalidated after the human decision.",
    idempotencyKey: key("invalidate"),
  });
  assertEquals(invalidated.value.state, "invalidated");
  assertEquals(repository.requests.get(request.id)?.state, "invalidated");
  assertEquals(repository.records.get(recorded.value.id), recorded.value);
});

function serviceFor(
  repository: MemoryRepository,
  authorization = new FakeAuthorization("allow"),
): DiligenceDecisionService {
  return new DiligenceDecisionService({
    transactions: new MemoryRunner(),
    repository,
    authorization,
    authority: new FakeAuthority(),
    basis: new FakeBasisVerifier(),
    effects: new RecordingEffects(),
    idempotency: new MemoryIdempotency(),
    clock: { now: () => now() },
  });
}

class MemoryRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(new MemoryTransaction()));
  }
}

class MemoryTransaction implements TransactionHandle {
  readonly metadata = {};
  query<TRow = Record<string, unknown>>(): Promise<
    TransactionQueryResult<TRow>
  > {
    return Promise.reject(
      new Error("Memory Diligence test transaction does not execute SQL."),
    );
  }
}

class FakeBasisVerifier implements EvidenceBasisVerificationPort {
  verify(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeAuthorization implements DecisionAuthorizationPort {
  constructor(private readonly outcome: "allow" | "deny") {}
  authorize(
    input: {
      readonly context: RequestContext;
      readonly scope: DiligenceScope;
      readonly resource: { readonly kind: string; readonly id: string };
      readonly action: Action;
    },
  ): Promise<AuthorizationDecision> {
    if (this.outcome === "deny") return Promise.resolve(denied());
    return Promise.resolve(
      allowed(input.context, input.scope, input.resource, input.action),
    );
  }
}

class FakeAuthority implements ApprovalAuthoritySnapshotPort {
  resolve(input: Parameters<ApprovalAuthoritySnapshotPort["resolve"]>[0]) {
    if (input.requester.id === input.namedApproverId) {
      throw new Error("Fixture authority requires separation of duties.");
    }
    const capturedAt = now().toISOString();
    return Promise.resolve({
      requirement: {
        commandType: input.requestedAction,
        target: input.target,
        namedApproverId: input.namedApproverId,
        policyVersion: "policy-v1",
        snapshotReference: "authority-test",
        scope: input.scope,
        effectiveAt: new Date(now().getTime() - 60_000).toISOString(),
        expiresAt: new Date(now().getTime() + 60_000).toISOString(),
        applicableLimits: [],
        humanOnly: true as const,
      },
      snapshot: {
        snapshotId: "authority-test",
        actorId: input.namedApproverId,
        actorKind: "human" as const,
        policyVersion: "policy-v1",
        capturedAt,
        scope: input.scope,
      },
    });
  }
}

class RecordingEffects implements DiligenceDecisionEffects {
  count = 0;
  append(): Promise<void> {
    this.count += 1;
    return Promise.resolve();
  }
}

class MemoryIdempotency implements DiligenceIdempotencyPort {
  private readonly claims = new Map<
    string,
    { digest: string; result?: string }
  >();
  claim(
    _transaction: TransactionHandle,
    claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    const identity =
      `${claim.commandType}:${claim.targetId}:${claim.idempotencyKey}`;
    const existing = this.claims.get(identity);
    if (existing === undefined) {
      this.claims.set(identity, { digest: claim.payloadDigest });
      return Promise.resolve({ status: "claimed" });
    }
    if (existing.digest !== claim.payloadDigest) {
      return Promise.reject(new IdempotencyConflictError(claim.idempotencyKey));
    }
    if (existing.result === undefined) {
      return Promise.resolve({ status: "in_progress" });
    }
    return Promise.resolve({
      status: "replay",
      state: "completed",
      resultReference: existing.result,
      errorReference: undefined,
    });
  }
  complete(
    _transaction: TransactionHandle,
    claim: IdempotencyClaim,
    resultReference: string,
  ): Promise<void> {
    const identity =
      `${claim.commandType}:${claim.targetId}:${claim.idempotencyKey}`;
    const existing = this.claims.get(identity);
    if (existing === undefined) {
      return Promise.reject(new Error("Missing test idempotency claim."));
    }
    existing.result = resultReference;
    return Promise.resolve();
  }
}

function findingCommand(id: string, statement: string) {
  return {
    context,
    scope,
    id: required(`finding_${id}`, parseFindingId),
    title: "Test finding",
    statement,
    basis: basis(id),
    proposedBy: { ...actor, kind: "ai" as const },
    idempotencyKey: key(`finding-${id}`),
  };
}

function createRequest(
  id: string,
  state: "draft" | "requested",
): DecisionRequest {
  const request = createDecisionRequest({
    id: requestId(id),
    scope,
    subject: { kind: "finding", id: required(`finding_${id}`, parseFindingId) },
    question: "Should this finding be accepted?",
    basis: basis(id),
    requester: actor,
    namedApproverId: approver.id,
    now: now(),
  });
  if (state === "draft") return request;
  return { ...request, state: "requested", version: 2 as never };
}

function basis(id: string) {
  return createExactEvidenceBasis({
    scope,
    references: [{
      kind: "fact_version",
      factVersionId: `factver_${id}` as never,
    }],
    basisDigest: id === "different" ? "d".repeat(64) : "b".repeat(64),
    capturedAt: now(),
  });
}

function human(value: string): ActorReference {
  return { id: required(value, parseActorId), kind: "human", state: "active" };
}

function requestId(value: string) {
  return required(`decision_request_${value}`, parseDecisionRequestId);
}
function recordId(value: string) {
  return required(`decision_record_${value}`, parseDecisionRecordId);
}
function key(value: string) {
  return required(`idem_${value}`, parseIdempotencyKey);
}
function now(): Date {
  return new Date("2026-08-07T12:00:00.000Z");
}

function requiredVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid fixture version "${value}".`);
}

function allowed(
  contextValue: RequestContext,
  scopeValue: DiligenceScope,
  resource: { readonly kind: string; readonly id: string },
  command: Action,
): AuthorizationDecision {
  return allowedDecision({
    request: {
      context: contextValue,
      actor: human(contextValue.actorId),
      scope: scopeValue,
      resource: { kind: resource.kind as never, id: resource.id },
      action: command,
      requestedFields: [],
      roleFacts: [],
      grantFacts: [],
      restrictionFacts: [],
      relationshipFacts: [],
      clock: { now: () => now().toISOString() },
    },
    allowedActions: [command],
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  });
}

function denied(): AuthorizationDecision {
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

function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid fixture "${value}".`);
}
