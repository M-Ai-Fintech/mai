import { assertEquals } from "@std/assert";
import {
  DealAuthenticationUnavailableError,
  type DealManagementHttpDependencies,
  DealManagementService,
  handleDealManagementRoute,
  InMemoryDealRepository,
} from "../../src/deal_management/v1.ts";
import {
  contextFor,
  DenyingDealAuthorization,
  FixedDealClock,
  RecordingDealAuthorization,
  requiredCorrelationId,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";
import type { DealAuthenticationPort } from "../../src/deal_management/v1.ts";
import type { DealAuthorizationPort } from "../../src/deal_management/v1.ts";

class FixedDealAuthentication implements DealAuthenticationPort {
  authenticate() {
    const context = contextFor();
    return Promise.resolve({
      actor: context.actor,
      tenantId: requiredTenantId(context.request.tenantId),
      workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    });
  }
}

class UnavailableDealAuthentication implements DealAuthenticationPort {
  authenticate(): never {
    throw new DealAuthenticationUnavailableError();
  }
}

function dependencies(
  authorization: DealAuthorizationPort = new RecordingDealAuthorization(),
  authentication: DealAuthenticationPort = new FixedDealAuthentication(),
): DealManagementHttpDependencies {
  const repository = new InMemoryDealRepository();
  return {
    authentication,
    authorization,
    repository,
    service: new DealManagementService({
      repository,
      authorization,
      ids: new SequentialDealIdFactory(),
      clock: new FixedDealClock(),
    }),
    now: () => "2026-08-02T12:00:00.000Z",
    nextCorrelationId: () => requiredCorrelationId("cor_http"),
  };
}

function request(
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Authorization": "Bearer fixture", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

Deno.test("Deal Management HTTP exposes semantic commands, envelopes, and ETags", async () => {
  const deps = dependencies();
  const created = await handleDealManagementRoute(
    request("/api/v1/deals", "POST", {
      name: "HTTP deal",
      dealType: "acquisition",
      confidentiality: "sensitive",
      currency: "USD",
    }, {
      "Idempotency-Key": "idem_http-create",
      "X-Correlation-Id": "cor_http",
    }),
    deps,
  );
  assertEquals(created?.status, 201);
  assertEquals(created?.headers.get("ETag"), '"v1"');
  const createdBody = await created!.json();
  const dealId = createdBody.data.id as string;
  assertEquals(createdBody.data.parties, undefined);
  assertEquals(createdBody.data.roles, undefined);
  assertEquals(createdBody.data.authorityConstraints, undefined);
  const read = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}`, "GET", undefined, {
      "X-Correlation-Id": "cor_http",
    }),
    deps,
  );
  assertEquals(read?.status, 200);
  assertEquals((await read!.json()).data.name, "HTTP deal");
  const configured = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/configure`, "POST", {
      name: "HTTP deal configured",
    }, {
      "Idempotency-Key": "idem_http-configure",
      "If-Match": '"v1"',
      "X-Correlation-Id": "cor_http",
    }),
    deps,
  );
  assertEquals(configured?.status, 200);
  assertEquals(configured?.headers.get("ETag"), '"v2"');
});

Deno.test("Deal Management HTTP rejects missing If-Match and protects unauthorized reads", async () => {
  const deps = dependencies();
  const missingVersion = await handleDealManagementRoute(
    request("/api/v1/deals/deal_missing/configure", "POST", { name: "bad" }, {
      "Idempotency-Key": "idem_http-missing",
    }),
    deps,
  );
  assertEquals(missingVersion?.status, 422);
  assertEquals((await missingVersion!.json()).error.code, "VALIDATION_FAILED");

  const denied = await handleDealManagementRoute(
    request("/api/v1/deals/deal_secret", "GET"),
    dependencies(new DenyingDealAuthorization()),
  );
  assertEquals(denied?.status, 404);
  assertEquals((await denied!.json()).error.code, "PROTECTED_NOT_FOUND");
});

Deno.test("Deal Management HTTP authenticates and validates read route identifiers", async () => {
  const missingAuth = await handleDealManagementRoute(
    request("/api/v1/deals/deal_missing", "GET", undefined, {
      Authorization: "",
      "X-Correlation-Id": "cor_http",
    }),
    dependencies(),
  );
  assertEquals(missingAuth?.status, 401);
  assertEquals((await missingAuth!.json()).error.code, "UNAUTHENTICATED");

  const malformedRoute = await handleDealManagementRoute(
    request("/api/v1/deals/not-a-deal", "GET", undefined, {
      "X-Correlation-Id": "cor_http",
    }),
    dependencies(),
  );
  assertEquals(malformedRoute?.status, 422);
  assertEquals(
    (await malformedRoute!.json()).error.code,
    "VALIDATION_FAILED",
  );
  const unavailable = await handleDealManagementRoute(
    request("/api/v1/deals/deal_missing", "GET", undefined, {
      "X-Correlation-Id": "cor_http",
    }),
    dependencies(
      new RecordingDealAuthorization(),
      new UnavailableDealAuthentication(),
    ),
  );
  assertEquals(unavailable?.status, 503);
  assertEquals(
    (await unavailable!.json()).error.code,
    "DEPENDENCY_UNAVAILABLE",
  );
});

Deno.test("Deal Management HTTP returns dependency unavailable without wiring", async () => {
  const response = await handleDealManagementRoute(
    request("/api/v1/deals", "POST", { name: "no service" }, {
      "X-Correlation-Id": "cor_http",
    }),
    undefined,
  );
  assertEquals(response?.status, 503);
  assertEquals((await response!.json()).error.code, "DEPENDENCY_UNAVAILABLE");
});
