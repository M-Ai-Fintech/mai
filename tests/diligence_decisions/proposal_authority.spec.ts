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
import type {
  IdempotencyClaim,
  IdempotencyClaimResult,
  TransactionHandle,
  TransactionQueryResult,
} from "../../src/platform/persistence/v1.ts";
import type { ApprovalAuthoritySnapshotPort } from "../../src/work_management/v1.ts";
import {
  createExactEvidenceBasis,
  type DecisionAuthorizationPort,
  type DiligenceDecisionEffects,
  DiligenceDecisionError,
  DiligenceDecisionService,
  type DiligenceIdempotencyPort,
  type DiligenceScope,
  type EvidenceBasisVerificationPort,
  parseFindingId,
  parseImpactId,
} from "../../src/diligence_decisions/v1.ts";
import { MemoryRepository } from "./service_support.ts";

const scope: DiligenceScope = {
  tenantId: required("tenant_test", parseTenantId),
  workspaceId: required("workspace_test", parseWorkspaceId),
  dealId: required("deal_test", parseDealId),
};
const actor = human("actor_requester");
const context: RequestContext = {
  actorId: actor.id,
  ...scope,
  correlationId: required("cor_diligence", parseCorrelationId),
  origin: "internal",
};

Deno.test(
  "approved Finding supersession requires human authority and supports an authorized human",
  async () => {
    const repository = new MemoryRepository();
    const service = serviceFor(repository);
    const proposed = await service.createFinding(
      findingCommand("approved-finding", "A reviewed finding."),
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
      idempotencyKey: key("approved-finding-approve"),
    });
    const denied = await assertRejects(
      () =>
        service.transitionFinding({
          context,
          scope,
          aggregateType: "finding",
          id: approved.value.id,
          expectedVersion: approved.value.version,
          next: "superseded",
          basis: approved.value.basis,
          actor: { ...actor, kind: "ai" },
          idempotencyKey: key("approved-finding-agent-supersede"),
        }),
      DiligenceDecisionError,
    );
    assertEquals(denied.code, "HUMAN_AUTHORITY_REQUIRED");
    const superseded = await service.transitionFinding({
      context,
      scope,
      aggregateType: "finding",
      id: approved.value.id,
      expectedVersion: approved.value.version,
      next: "superseded",
      basis: approved.value.basis,
      actor,
      idempotencyKey: key("approved-finding-human-supersede"),
    });
    assertEquals(superseded.value.state, "superseded");
    assertEquals(superseded.value.version, requiredVersion(3));
  },
);

Deno.test(
  "approved Impact supersession requires human authority and supports an authorized human",
  async () => {
    const repository = new MemoryRepository();
    const service = serviceFor(repository);
    const finding = await service.createFinding(
      findingCommand("approved-impact-parent", "A finding with impact."),
    );
    const impact = await service.createImpact({
      context,
      scope,
      id: required("impact_approved-impact", parseImpactId),
      findingId: finding.value.id,
      statement: "A reviewed impact.",
      severity: "high",
      basis: basis("approved-impact"),
      proposedBy: { ...actor, kind: "ai" },
      idempotencyKey: key("approved-impact-create"),
    });
    const approved = await service.transitionImpact({
      context,
      scope,
      aggregateType: "impact",
      id: impact.value.id,
      expectedVersion: requiredVersion(1),
      next: "approved",
      basis: impact.value.basis,
      actor,
      idempotencyKey: key("approved-impact-approve"),
    });
    const denied = await assertRejects(
      () =>
        service.transitionImpact({
          context,
          scope,
          aggregateType: "impact",
          id: approved.value.id,
          expectedVersion: approved.value.version,
          next: "superseded",
          basis: approved.value.basis,
          actor: { ...actor, kind: "ai" },
          idempotencyKey: key("approved-impact-agent-supersede"),
        }),
      DiligenceDecisionError,
    );
    assertEquals(denied.code, "HUMAN_AUTHORITY_REQUIRED");
    const superseded = await service.transitionImpact({
      context,
      scope,
      aggregateType: "impact",
      id: approved.value.id,
      expectedVersion: approved.value.version,
      next: "superseded",
      basis: approved.value.basis,
      actor,
      idempotencyKey: key("approved-impact-human-supersede"),
    });
    assertEquals(superseded.value.state, "superseded");
    assertEquals(superseded.value.version, requiredVersion(3));
  },
);

function serviceFor(repository: MemoryRepository): DiligenceDecisionService {
  return new DiligenceDecisionService({
    transactions: new MemoryRunner(),
    repository,
    authorization: new FakeAuthorization(),
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
    return Promise.reject(new Error("SQL is outside this memory test seam."));
  }
}

class FakeBasisVerifier implements EvidenceBasisVerificationPort {
  verify(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeAuthorization implements DecisionAuthorizationPort {
  authorize(input: {
    readonly context: RequestContext;
    readonly scope: DiligenceScope;
    readonly resource: { readonly kind: string; readonly id: string };
    readonly action: Action;
  }): Promise<AuthorizationDecision> {
    return Promise.resolve(
      allowedDecision({
        request: {
          context: input.context,
          actor: human(input.context.actorId),
          scope: input.scope,
          resource: {
            kind: input.resource.kind as never,
            id: input.resource.id,
          },
          action: input.action,
          requestedFields: [],
          roleFacts: [],
          grantFacts: [],
          restrictionFacts: [],
          relationshipFacts: [],
          clock: { now: () => now().toISOString() },
        },
        allowedActions: [input.action],
        fieldMask: {
          include: [],
          omit: [],
          redact: [],
          approvedClassifications: [],
        },
      }),
    );
  }
}

class FakeAuthority implements ApprovalAuthoritySnapshotPort {
  resolve(input: Parameters<ApprovalAuthoritySnapshotPort["resolve"]>[0]) {
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
  append(): Promise<void> {
    return Promise.resolve();
  }
}

class MemoryIdempotency implements DiligenceIdempotencyPort {
  private readonly claims = new Map<string, string>();

  claim(
    _transaction: TransactionHandle,
    claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    const identity =
      `${claim.commandType}:${claim.targetId}:${claim.idempotencyKey}`;
    const existing = this.claims.get(identity);
    if (existing === undefined) {
      this.claims.set(identity, claim.payloadDigest);
      return Promise.resolve({ status: "claimed" });
    }
    if (existing !== claim.payloadDigest) {
      return Promise.reject(new Error("Idempotency payload changed."));
    }
    return Promise.resolve({
      status: "replay",
      state: "completed",
      resultReference: undefined,
      errorReference: undefined,
    });
  }

  complete(): Promise<void> {
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

function basis(id: string) {
  return createExactEvidenceBasis({
    scope,
    references: [{
      kind: "fact_version",
      factVersionId: `factver_${id}` as never,
    }],
    basisDigest: "b".repeat(64),
    capturedAt: now(),
  });
}

function human(value: string): ActorReference {
  return { id: required(value, parseActorId), kind: "human", state: "active" };
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
