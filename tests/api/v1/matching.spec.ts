import { assertEquals, assertStringIncludes } from "@std/assert";
import type {
  ActorReference,
  AuthorizationDecision,
} from "../../../src/platform/authz/v1.ts";
import { field } from "../../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../../src/platform/api/v1.ts";
import {
  createInMemoryMatchingTestComposition,
} from "../../../src/matching/v1.ts";
import { MatchingV1Application } from "../../../src/api/v1/matching.ts";
import {
  handleMatchingV1Route,
  type MatchingV1RouteDependencies,
} from "../../../src/api/v1/matching_routes.ts";
import { LEGACY_ADAPTER_CONTRACT_VERSION } from "../../../src/engines/optimization/matching/types.ts";

const context: RequestContext = {
  actorId: "actor_api" as never,
  tenantId: "tenant_api" as never,
  workspaceId: "workspace_api" as never,
  dealId: "deal_api" as never,
  correlationId: "cor_api_matching" as never,
  origin: "http",
};
const actor: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};

Deno.test("Matching API returns protected-not-found and does not reveal candidate existence", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(deny()) },
  });
  const dependencies = dependenciesFor(
    new MatchingV1Application(composition.service),
  );
  const response = await handleMatchingV1Route(
    new Request("http://localhost/api/v1/matching/candidates/candidate_secret"),
    dependencies,
  );
  assertEquals(response?.status, 404);
  assertStringIncludes(await response!.text(), "PROTECTED_NOT_FOUND");
});

Deno.test("Matching API enforces idempotency, strong ETags, and accepted jobs", async () => {
  const composition = createInMemoryMatchingTestComposition({
    authorization: { authorize: () => Promise.resolve(allow()) },
    clock: { now: () => new Date("2026-08-07T18:45:00.000Z") },
  });
  const dependencies = dependenciesFor(
    new MatchingV1Application(composition.service),
  );
  const missingKey = await handleMatchingV1Route(
    new Request("http://localhost/api/v1/matching/criteria", {
      method: "POST",
      body: JSON.stringify({ id: "criteria_api", selection: criteria() }),
      headers: { "Content-Type": "application/json" },
    }),
    dependencies,
  );
  assertEquals(missingKey?.status, 422);
  assertStringIncludes(await missingKey!.text(), "Idempotency-Key");

  const created = await handleMatchingV1Route(
    new Request("http://localhost/api/v1/matching/criteria", {
      method: "POST",
      body: JSON.stringify({ id: "criteria_api", selection: criteria() }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_criteria-api",
      },
    }),
    dependencies,
  );
  assertEquals(created?.status, 201);
  assertEquals(created?.headers.get("ETag"), '"v1"');

  const activated = await handleMatchingV1Route(
    new Request(
      "http://localhost/api/v1/matching/criteria/criteria_api/activate",
      {
        method: "POST",
        headers: { "Idempotency-Key": "idem_activate-api", "If-Match": '"v1"' },
      },
    ),
    dependencies,
  );
  assertEquals(activated?.status, 200);
  assertEquals(activated?.headers.get("ETag"), '"v2"');

  const started = await handleMatchingV1Route(
    new Request("http://localhost/api/v1/matching/runs", {
      method: "POST",
      body: JSON.stringify({
        id: "run_api",
        criteriaId: "criteria_api",
        candidates: [
          candidate("candidate_api", 9),
          candidate("candidate_api-low", 2),
        ],
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_run-api",
      },
    }),
    dependencies,
  );
  assertEquals(started?.status, 202);
  assertStringIncludes(await started!.text(), "/api/v1/jobs/job_matching-api");
});

function dependenciesFor(
  application: MatchingV1Application,
): MatchingV1RouteDependencies {
  return {
    context: { contextFor: () => Promise.resolve({ context, actor }) },
    application,
  };
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
    authoritySnapshotReference: "authority_api" as never,
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
