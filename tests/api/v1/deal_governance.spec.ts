import { assertEquals, assertStringIncludes } from "@std/assert";
import { DealGovernanceV1Application } from "../../../src/api/v1/deal_governance.ts";
import { handleDealGovernanceV1Route } from "../../../src/api/v1/deal_governance_routes.ts";
import {
  commandContext,
  idempotency,
  testClock,
  testComposition,
} from "../../deal_governance/helpers.ts";
import { createInMemoryDealGovernanceTestComposition } from "../../../src/deal_governance/composition.ts";
import type { GovernanceCommandContext } from "../../../src/deal_governance/service_contracts.ts";

Deno.test("Deal Governance route initializes, previews, transitions, and returns strong ETags", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  const application = new DealGovernanceV1Application(composition.service);
  const context = commandContext(clock);
  const dependencies = routeDependencies(context, application);

  const created = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/initialize", {
      headers: { "Idempotency-Key": "idem_api-create" },
      body: {},
    }),
    dependencies,
  );
  assertEquals(created?.status, 201);
  assertEquals(created?.headers.get("ETag"), '"v1"');
  assertEquals(
    created?.headers.get("X-Correlation-Id"),
    context.request.correlationId,
  );

  const preview = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/preview/pause"),
    dependencies,
  );
  assertEquals(preview?.status, 200);
  const previewPayload = await preview!.json() as {
    readonly data: { readonly previewId: string };
  };
  assertStringIncludes(previewPayload.data.previewId, "preview_");

  const transition = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/transition/pause", {
      headers: { "Idempotency-Key": "idem_api-pause", "If-Match": '"v1"' },
      body: {
        preview: {
          previewId: previewPayload.data.previewId,
          outcome: "blocked",
          blockers: [{ code: "ACTIVE_LEGAL_HOLD" }],
          effects: [],
          toState: "terminated",
        },
      },
    }),
    dependencies,
  );
  assertEquals(transition?.status, 200);

  const freshPreview = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/preview/restore"),
    dependencies,
  );
  const freshPayload = await freshPreview!.json() as {
    readonly data: Record<string, unknown>;
  };
  const successfulTransition = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/transition/restore", {
      headers: {
        "Idempotency-Key": "idem_api-pause-retry",
        "If-Match": '"v2"',
      },
      body: {
        preview: {
          ...freshPayload.data,
          outcome: "blocked",
          blockers: [{ code: "MANDATORY_RETENTION" }],
          effects: [],
          toState: "terminated",
        },
      },
    }),
    dependencies,
  );
  assertEquals(successfulTransition?.status, 200);
  assertEquals(successfulTransition?.headers.get("ETag"), '"v3"');

  const read = await handleDealGovernanceV1Route(
    request("GET", "/api/v1/deal-governance"),
    dependencies,
  );
  assertEquals(read?.status, 200);
  assertEquals(read?.headers.get("ETag"), '"v3"');
  const readPayload = await read!.json() as {
    readonly data: { readonly governance: { readonly state: string } };
  };
  assertEquals(readPayload.data.governance.state, "active");
});

Deno.test("Deal Governance route validates idempotency and protects denied commands", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  const application = new DealGovernanceV1Application(composition.service);
  const context = commandContext(clock);
  const dependencies = routeDependencies(context, application);
  const missingKey = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/initialize", { body: {} }),
    dependencies,
  );
  assertEquals(missingKey?.status, 422);
  assertStringIncludes(await missingKey!.text(), "Idempotency-Key");

  const deniedComposition = createInMemoryDealGovernanceTestComposition({
    authorization: { authorize: () => false },
    clock,
  });
  const deniedApplication = new DealGovernanceV1Application(
    deniedComposition.service,
  );
  const denied = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/initialize", {
      headers: { "Idempotency-Key": "idem_api-denied" },
      body: {},
    }),
    routeDependencies(context, deniedApplication),
  );
  assertEquals(denied?.status, 403);
  assertStringIncludes(await denied!.text(), "ACTION_FORBIDDEN");
});

Deno.test("Deal Governance route rejects caller-owned erasure gates", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  const application = new DealGovernanceV1Application(composition.service);
  const context = commandContext(clock);
  const response = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/orchestrations", {
      headers: { "Idempotency-Key": "idem_api-forged-gate" },
      body: {
        requestId: "deletion_request-forged",
        categories: ["documents"],
        gate: {
          policyApproved: true,
          infrastructureApproved: true,
          physicalErasureEnabled: true,
        },
      },
    }),
    routeDependencies(context, application),
  );
  assertEquals(response?.status, 422);
  assertStringIncludes(await response!.text(), "server-controlled");
});

Deno.test("forged allowed preview fields cannot bypass mandatory retention", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  const context = commandContext(clock);
  const application = new DealGovernanceV1Application(composition.service);
  const created = await composition.service.createGovernance({
    type: "create_governance",
    context,
    idempotencyKey: idempotency("api-retention-create"),
  });
  await composition.service.assignRetention({
    type: "assign_retention",
    context,
    idempotencyKey: idempotency("api-retention-assign"),
    expectedVersion: created.version,
    policySource: "records-policy",
    policyVersion: "2026.1",
    retainedCategories: ["documents"],
    retentionStartEvent: "termination",
    retentionUntil: "2026-08-10T00:00:00.000Z",
    disposition: "retain_complete_record",
    mandatory: true,
  });
  const terminationPreview = await composition.service.previewTransition(
    context,
    "terminate",
  );
  const terminated = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency("api-retention-terminate"),
    action: "terminate",
    expectedVersion: created.version + 1,
    previewId: terminationPreview.previewId,
  });
  const archivePreview = await composition.service.previewTransition(
    context,
    "archive",
  );
  assertEquals(archivePreview.outcome, "blocked");
  const response = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/transition/archive", {
      headers: {
        "Idempotency-Key": "idem_api-forged-retention-preview",
        "If-Match": `"v${terminated.version}"`,
      },
      body: {
        preview: {
          ...archivePreview,
          outcome: "allowed",
          blockers: [],
          effects: [],
          toState: "archived",
        },
      },
    }),
    { context: { contextFor: () => context }, application },
  );
  assertEquals(response?.status, 423);
  assertStringIncludes(await response!.text(), "Retention remains active");
});

function routeDependencies(
  context: GovernanceCommandContext,
  application: DealGovernanceV1Application,
) {
  return { context: { contextFor: () => context }, application };
}

function request(
  method: string,
  path: string,
  options: {
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
}
