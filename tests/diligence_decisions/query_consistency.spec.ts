import { assertEquals, assertRejects } from "@std/assert";
import type {
  Action,
  ActorReference,
  AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import {
  allowedDecision,
  resourceKind,
} from "../../src/platform/authz/vocabulary.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";
import type { ApprovalAuthoritySnapshotPort } from "../../src/work_management/v1.ts";
import {
  createDecisionProjection,
  createDecisionRequest,
  createExactEvidenceBasis,
  type DiligenceDecisionEffects,
  DiligenceDecisionError,
  type DiligenceScope,
  type EvidenceBasisVerificationPort,
  parseDecisionRecordId,
  parseDecisionRequestId,
  parseFindingId,
} from "../../src/diligence_decisions/v1.ts";
import { DiligenceDecisionQueries } from "../../src/diligence_decisions/query_service.ts";
import type {
  DiligenceTransactionRunner,
} from "../../src/diligence_decisions/contracts.ts";
import { MemoryRepository } from "./service_support.ts";
import type { TransactionHandle } from "../../src/platform/persistence/v1.ts";

const scope: DiligenceScope = {
  tenantId: required("tenant_query", parseTenantId),
  workspaceId: required("workspace_query", parseWorkspaceId),
  dealId: required("deal_query", parseDealId),
};
const actor = human("actor_query");
const context: RequestContext = {
  actorId: actor.id,
  ...scope,
  correlationId: required("cor_query", parseCorrelationId),
  origin: "internal",
};

Deno.test(
  "decision queries reject contradictory current references at both read boundaries",
  async () => {
    const repository = new MemoryRepository();
    const request = decidedRequest();
    const projection = createDecisionProjection({
      requestId: request.id,
      currentRecordId: required("decision_record_new", parseDecisionRecordId),
      state: "active",
      version: 2 as never,
      updatedAt: now(),
    });
    repository.requests.set(request.id, request);
    repository.projections.set(request.id, projection);
    const queries = queryFor(repository);

    const requestError = await assertRejects(
      () => queries.getDecisionRequest(context, scope, request.id),
      DiligenceDecisionError,
    );
    const projectionError = await assertRejects(
      () => queries.getDecisionProjection(context, scope, request.id),
      DiligenceDecisionError,
    );
    assertEquals(requestError.code, "REFERENCE_MISMATCH");
    assertEquals(projectionError.code, "REFERENCE_MISMATCH");
  },
);

function queryFor(repository: MemoryRepository): DiligenceDecisionQueries {
  return new DiligenceDecisionQueries({
    config: {
      transactions: new MemoryRunner(),
      repository,
      authorization: new AllowAuthorization(),
      authority: new UnusedAuthority(),
      basis: new UnusedBasisVerifier(),
      effects: new UnusedEffects(),
    },
    clock: { now },
    idempotency: new UnusedIdempotency(),
  });
}

class MemoryRunner implements DiligenceTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(new MemoryTransaction()));
  }
}

class MemoryTransaction implements TransactionHandle {
  readonly metadata = {};

  query<TRow = Record<string, unknown>>(): Promise<{
    readonly rows: TRow[];
    readonly rowCount: number;
  }> {
    return Promise.reject(new Error("SQL is outside this query test seam."));
  }
}

class AllowAuthorization {
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
          actor,
          scope: input.scope,
          resource: {
            kind: resourceKind(input.resource.kind),
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

class UnusedAuthority implements ApprovalAuthoritySnapshotPort {
  resolve(): Promise<never> {
    return Promise.reject(
      new Error("Authority is outside this query test seam."),
    );
  }
}

class UnusedBasisVerifier implements EvidenceBasisVerificationPort {
  verify(): Promise<void> {
    return Promise.reject(new Error("Basis is outside this query test seam."));
  }
}

class UnusedEffects implements DiligenceDecisionEffects {
  append(): Promise<void> {
    return Promise.reject(
      new Error("Effects are outside this query test seam."),
    );
  }
}

class UnusedIdempotency {
  claim(): Promise<never> {
    return Promise.reject(
      new Error("Idempotency is outside this query test seam."),
    );
  }

  complete(): Promise<never> {
    return Promise.reject(
      new Error("Idempotency is outside this query test seam."),
    );
  }
}

function decidedRequest() {
  const draft = createDecisionRequest({
    id: required("decision_request_query", parseDecisionRequestId),
    scope,
    subject: {
      kind: "finding",
      id: required("finding_query", parseFindingId),
    },
    question: "Should this finding be accepted?",
    basis: basis(),
    requester: actor,
    namedApproverId: required("actor_approver", parseActorId),
    now: now(),
  });
  return {
    ...draft,
    state: "decided" as const,
    decisionRecordId: required("decision_record_old", parseDecisionRecordId),
    version: 3 as never,
  };
}

function basis() {
  return createExactEvidenceBasis({
    scope,
    references: [{
      kind: "fact_version",
      factVersionId: "factver_query" as never,
    }],
    basisDigest: "b".repeat(64),
    capturedAt: now(),
  });
}

function human(id: string): ActorReference {
  return { id: required(id, parseActorId), kind: "human", state: "active" };
}

function now(): Date {
  return new Date("2026-08-07T12:00:00.000Z");
}

function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid query fixture "${value}".`);
}
