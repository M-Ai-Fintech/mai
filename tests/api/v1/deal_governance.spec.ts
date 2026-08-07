import { assertEquals, assertStringIncludes } from "@std/assert";
import { DealGovernanceV1Application } from "../../../src/api/v1/deal_governance.ts";
import { handleDealGovernanceV1Route } from "../../../src/api/v1/deal_governance_routes.ts";
import {
  commandContext,
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
      body: { preview: { previewId: previewPayload.data.previewId } },
    }),
    dependencies,
  );
  assertEquals(transition?.status, 409);
  assertStringIncludes(await transition!.text(), "Consequence preview");

  const freshPreview = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/preview/pause"),
    dependencies,
  );
  const freshPayload = await freshPreview!.json() as {
    readonly data: Record<string, unknown>;
  };
  const successfulTransition = await handleDealGovernanceV1Route(
    request("POST", "/api/v1/deal-governance/transition/pause", {
      headers: {
        "Idempotency-Key": "idem_api-pause-retry",
        "If-Match": '"v1"',
      },
      body: { preview: freshPayload.data },
    }),
    dependencies,
  );
  assertEquals(successfulTransition?.status, 200);
  assertEquals(successfulTransition?.headers.get("ETag"), '"v2"');

  const read = await handleDealGovernanceV1Route(
    request("GET", "/api/v1/deal-governance"),
    dependencies,
  );
  assertEquals(read?.status, 200);
  assertEquals(read?.headers.get("ETag"), '"v2"');
  const readPayload = await read!.json() as {
    readonly data: { readonly governance: { readonly state: string } };
  };
  assertEquals(readPayload.data.governance.state, "paused");
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
