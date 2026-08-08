import { assertEquals } from "@std/assert";
import type {
  ActorReference,
  AuthorizationDecision,
} from "../../../src/platform/authz/v1.ts";
import { field } from "../../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../../src/platform/api/v1.ts";
import { MatchingV1Application } from "../../../src/api/v1/matching.ts";
import {
  handleMatchingV1Route,
  type MatchingV1RouteDependencies,
} from "../../../src/api/v1/matching_routes.ts";
import { createInMemoryMatchingTestComposition } from "../../../src/matching/v1.ts";
import { LEGACY_ADAPTER_CONTRACT_VERSION } from "../../../src/engines/optimization/matching/types.ts";

const context: RequestContext = {
  actorId: "actor_api_idempotency" as never,
  tenantId: "tenant_api_idempotency" as never,
  workspaceId: "workspace_api_idempotency" as never,
  dealId: "deal_api_idempotency" as never,
  correlationId: "cor_api_idempotency" as never,
  origin: "http",
};
const actor: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};

Deno.test("Matching API carries idempotency through every mutation route", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
  });
  const dependencies = dependenciesFor(
    new MatchingV1Application(composition.service),
  );
  const criteriaBody = { id: "criteria_routes", selection: criteria() };
  await expectStatus(
    dependencies,
    post("/api/v1/matching/criteria", criteriaBody, "idem_create-routes"),
    201,
  );
  await expectStatus(
    dependencies,
    post("/api/v1/matching/criteria", criteriaBody, "idem_create-routes"),
    201,
  );
  await expectStatus(
    dependencies,
    post("/api/v1/matching/criteria", {
      ...criteriaBody,
      selection: { ...criteria(), budgetLimit: 9 },
    }, "idem_create-routes"),
    409,
  );

  await expectStatus(
    dependencies,
    empty(
      "/api/v1/matching/criteria/criteria_routes/activate",
      "idem_activate-routes",
      '"v1"',
    ),
    200,
  );
  await expectStatus(
    dependencies,
    empty(
      "/api/v1/matching/criteria/criteria_routes/activate",
      "idem_activate-routes",
      '"v1"',
    ),
    200,
  );

  const runBody = {
    id: "run_routes",
    criteriaId: "criteria_routes",
    candidates: [candidate("candidate_routes", 9)],
  };
  await expectStatus(
    dependencies,
    post("/api/v1/matching/runs", runBody, "idem_start-routes"),
    202,
  );
  await expectStatus(
    dependencies,
    post("/api/v1/matching/runs", runBody, "idem_start-routes"),
    202,
  );
  await expectStatus(
    dependencies,
    empty("/api/v1/matching/runs/run_routes/execute", "idem_execute-routes"),
    200,
  );
  await expectStatus(
    dependencies,
    empty("/api/v1/matching/runs/run_routes/execute", "idem_execute-routes"),
    200,
  );

  const conflictBody = {
    id: "conflict_routes",
    candidateId: "candidate_routes",
    kind: "manual",
  };
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/conflicts",
      conflictBody,
      "idem_open-conflict-routes",
    ),
    201,
  );
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/conflicts",
      conflictBody,
      "idem_open-conflict-routes",
    ),
    201,
  );
  await expectStatus(
    dependencies,
    empty(
      "/api/v1/matching/conflicts/conflict_routes/resolve",
      "idem_resolve-conflict-routes",
      '"v1"',
    ),
    200,
  );
  await expectStatus(
    dependencies,
    empty(
      "/api/v1/matching/conflicts/conflict_routes/resolve",
      "idem_resolve-conflict-routes",
      '"v1"',
    ),
    200,
  );

  const restrictionBody = {
    id: "restriction_routes",
    candidateId: "candidate_routes",
    category: "restricted_identity",
  };
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/restrictions",
      restrictionBody,
      "idem_open-restriction-routes",
    ),
    201,
  );
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/restrictions",
      restrictionBody,
      "idem_open-restriction-routes",
    ),
    201,
  );
  const clearBody = { candidateId: "candidate_routes" };
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/restrictions/restriction_routes/clear",
      clearBody,
      "idem_clear-restriction-routes",
      '"v1"',
    ),
    200,
  );
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/restrictions/restriction_routes/clear",
      clearBody,
      "idem_clear-restriction-routes",
      '"v1"',
    ),
    200,
  );

  const shortlistBody = {
    id: "shortlist_routes",
    runId: "run_routes",
    candidateId: "candidate_routes",
    state: "shortlisted",
    authoritySnapshotReference: "authority_api_idempotency",
  };
  await expectStatus(
    dependencies,
    post("/api/v1/matching/shortlist", shortlistBody, "idem_shortlist-routes"),
    201,
  );
  await expectStatus(
    dependencies,
    post("/api/v1/matching/shortlist", shortlistBody, "idem_shortlist-routes"),
    201,
  );

  const outreachBody = {
    id: "outreach_routes",
    shortlistDecisionId: "shortlist_routes",
    candidateId: "candidate_routes",
    authoritySnapshotReference: "authority_api_idempotency",
  };
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/outreach",
      outreachBody,
      "idem_authorize-outreach-routes",
    ),
    201,
  );
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/outreach",
      outreachBody,
      "idem_authorize-outreach-routes",
    ),
    201,
  );
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/outreach/outreach_routes/revoke",
      outreachBody,
      "idem_revoke-outreach-routes",
      '"v1"',
    ),
    200,
  );
  await expectStatus(
    dependencies,
    post(
      "/api/v1/matching/outreach/outreach_routes/revoke",
      outreachBody,
      "idem_revoke-outreach-routes",
      '"v1"',
    ),
    200,
  );
  assertEquals(
    (composition.scheduler as unknown as { jobs: readonly unknown[] }).jobs
      .length,
    1,
  );
});

function dependenciesFor(
  application: MatchingV1Application,
): MatchingV1RouteDependencies {
  return {
    context: { contextFor: () => Promise.resolve({ context, actor }) },
    application,
  };
}

async function expectStatus(
  dependencies: MatchingV1RouteDependencies,
  request: Request,
  expected: number,
): Promise<void> {
  const response = await handleMatchingV1Route(request, dependencies);
  if (response === null) {
    throw new Error("Matching test route was not handled.");
  }
  assertEquals(response.status, expected);
}

function post(
  path: string,
  body: Record<string, unknown>,
  key: string,
  ifMatch?: string,
): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      ...(ifMatch === undefined ? {} : { "If-Match": ifMatch }),
    },
  });
}

function empty(path: string, key: string, ifMatch?: string): Request {
  return post(path, {}, key, ifMatch);
}

function criteria() {
  return { budgetLimit: 10, riskThreshold: 1, taxDebtCap: 10 };
}

function candidate(id: string, synergyValue: number) {
  return {
    id,
    restrictedIdentityReference: `identity_${id.replace("candidate_", "")}`,
    sourceReference: `source_${id.replace("candidate_", "")}`,
    candidate: {
      id,
      synergyValue,
      acquisitionCost: 10,
      sector: "technology",
      riskScore: 0.2,
      taxDebt: 0,
      eligibility: {
        contractVersion: LEGACY_ADAPTER_CONTRACT_VERSION,
        status: "legacy-compatible",
      },
    },
  };
}

function allow(): AuthorizationDecision {
  const names = ["candidate_metrics", "candidate_source", "candidate_identity"];
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [],
    approvedScope: undefined as never,
    authoritySnapshotReference: "authority_api_idempotency" as never,
    fieldMask: {
      include: names.map(field),
      omit: [],
      redact: [],
      approvedClassifications: names.map((name) => ({
        name: field(name),
        classification: name === "candidate_metrics"
          ? "public" as const
          : "restricted" as const,
      })),
    },
  };
}
