import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  type EvidenceKnowledgeAuthorizationPort,
  type EvidenceKnowledgeReadPort,
  EvidenceKnowledgeV1Application,
} from "../../../src/api/v1/evidence_knowledge.ts";
import {
  type EvidenceKnowledgeRequestContextPort,
  handleEvidenceKnowledgeV1Route,
} from "../../../src/api/v1/evidence_knowledge_routes.ts";
import {
  createFact,
  type EvidenceScope,
  type Fact,
} from "../../../src/evidence_knowledge/model.ts";
import { parseFactId } from "../../../src/evidence_knowledge/v1.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../../src/platform/api/v1.ts";

Deno.test("Evidence Knowledge API authorizes before exact-ID reads and returns ETag", async () => {
  const reads = new FakeReads();
  const auth = new RecordingAuthorization(true);
  const response = await route(
    new EvidenceKnowledgeV1Application(auth, reads),
    "/api/v1/evidence-knowledge/facts/fact_net-debt",
  );
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("ETag"), '"v2"');
  assertEquals((await response.json()).data.factId, "fact_net-debt");
  assertEquals(auth.calls, ["fact:fact_net-debt"]);
  assertEquals(reads.calls, 1);
});

Deno.test("Evidence Knowledge API protects denied reads before repository load", async () => {
  const reads = new FakeReads();
  const response = await route(
    new EvidenceKnowledgeV1Application(
      new RecordingAuthorization(false),
      reads,
    ),
    "/api/v1/evidence-knowledge/facts/fact_net-debt",
  );
  assertEquals(response.status, 404);
  assertEquals((await response.json()).error.code, "PROTECTED_NOT_FOUND");
  assertFalse(reads.calls > 0);
});

Deno.test("Evidence Knowledge API has no generic query path", async () => {
  const response = await route(
    new EvidenceKnowledgeV1Application(
      new RecordingAuthorization(true),
      new FakeReads(),
    ),
    "/api/v1/evidence-knowledge/query",
  );
  assertEquals(response.status, 405);
});

async function route(
  application: EvidenceKnowledgeV1Application,
  path: string,
): Promise<Response> {
  const response = await handleEvidenceKnowledgeV1Route(
    new Request(`http://localhost${path}`),
    { context: new FixtureContext(), application },
  );
  assert(response);
  return response;
}
class FixtureContext implements EvidenceKnowledgeRequestContextPort {
  contextFor(): ReturnType<typeof context> {
    return context();
  }
}
class RecordingAuthorization implements EvidenceKnowledgeAuthorizationPort {
  readonly calls: string[] = [];
  constructor(private readonly allowed: boolean) {}
  authorize(
    request: { readonly resource: string; readonly resourceId: string },
  ): Promise<boolean> {
    this.calls.push(`${request.resource}:${request.resourceId}`);
    return Promise.resolve(this.allowed);
  }
}
class FakeReads implements EvidenceKnowledgeReadPort {
  calls = 0;
  findCitation(): Promise<undefined> {
    this.calls++;
    return Promise.resolve(undefined);
  }
  findEvidence(): Promise<undefined> {
    this.calls++;
    return Promise.resolve(undefined);
  }
  findFact(
    scope: EvidenceScope,
    id: Fact["factId"],
  ): Promise<Fact | undefined> {
    this.calls++;
    return Promise.resolve(
      id === "fact_net-debt" ? fixtureFact(scope) : undefined,
    );
  }
  findCalculation(): Promise<undefined> {
    this.calls++;
    return Promise.resolve(undefined);
  }
}
function fixtureFact(scope: EvidenceScope): Fact {
  return createFact({
    factId: required("fact_net-debt", parseFactId),
    scope,
    category: "financial",
    status: "approved",
    aggregateVersion: 2,
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
  });
}
function context() {
  return {
    actorId: required("actor_reviewer", parseActorId),
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
    correlationId: required("cor_evidence", parseCorrelationId),
    origin: "http" as const,
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
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
