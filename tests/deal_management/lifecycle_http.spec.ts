import { assertEquals } from "@std/assert";
import {
  type AuthorizationDecision,
  field,
} from "../../src/platform/authz/v1.ts";
import {
  type DealAuthorizationInput,
  type DealAuthorizationPort,
  type DealManagementHttpDependencies,
  DealManagementService,
  handleDealManagementRoute,
  InMemoryDealRepository,
  type LifecycleIdFactory,
  milestoneId,
} from "../../src/deal_management/v1.ts";
import {
  contextFor,
  FixedDealClock,
  RecordingDealAuthorization,
  requiredCorrelationId,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";
import type { DealAuthenticationPort } from "../../src/deal_management/v1.ts";
import { sessionId, userIdentityId } from "../../src/identity_access/v1.ts";

class FixedDealAuthentication implements DealAuthenticationPort {
  authenticate() {
    const context = contextFor();
    return {
      actor: context.actor,
      sessionId: sessionId("session_lifecycle-http"),
      identityId: userIdentityId("identity_lifecycle-http"),
      tenantId: requiredTenantId(context.request.tenantId),
      workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    };
  }
}

class SequentialLifecycleIds implements LifecycleIdFactory {
  private milestoneSequence = 0;
  private transitionSequence = 0;

  nextMilestoneId() {
    this.milestoneSequence += 1;
    return milestoneId(`milestone_http-${this.milestoneSequence}`);
  }

  nextTransitionId(): string {
    this.transitionSequence += 1;
    return `transition_http-${this.transitionSequence}`;
  }
}

class LifecycleReadMaskAuthorization implements DealAuthorizationPort {
  authorize(input: DealAuthorizationInput): AuthorizationDecision {
    return {
      outcome: "allow",
      reasonCode: "ALLOWED",
      allowedActions: [input.action],
      approvedScope: undefined as never,
      fieldMask: {
        include: [field("lifecycle"), field("milestones")],
        omit: [field("activity")],
        redact: [],
        approvedClassifications: [
          { name: field("lifecycle"), classification: "public" },
          { name: field("milestones"), classification: "public" },
        ],
      },
    };
  }
}

function dependencies(
  authorization: DealAuthorizationPort = new RecordingDealAuthorization(),
): DealManagementHttpDependencies {
  const repository = new InMemoryDealRepository();
  return {
    authentication: new FixedDealAuthentication(),
    authorization,
    repository,
    service: new DealManagementService({
      repository,
      authorization,
      ids: new SequentialDealIdFactory("lifecycle-http"),
      lifecycleIds: new SequentialLifecycleIds(),
      clock: new FixedDealClock(),
    }),
    now: () => "2026-08-02T12:00:00.000Z",
    nextCorrelationId: () => requiredCorrelationId("cor_lifecycle-http"),
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
    headers: { Authorization: "Bearer fixture", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function data(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

function errorCode(body: Record<string, unknown>): unknown {
  return (body.error as Record<string, unknown>).code;
}

async function createHttpDeal(
  dependencies: DealManagementHttpDependencies,
): Promise<string> {
  const response = await handleDealManagementRoute(
    request("/api/v1/deals", "POST", {
      name: "Lifecycle HTTP deal",
      dealType: "acquisition",
      confidentiality: "standard",
      currency: "USD",
    }, { "Idempotency-Key": "idem_lifecycle-http-create" }),
    dependencies,
  );
  const body = await data(response!);
  const value = body.data as Record<string, unknown>;
  return value.id as string;
}

Deno.test("lifecycle HTTP exposes named commands, projections, ETags, and activity", async () => {
  const dependencies = dependenciesForTest();
  const dealId = await createHttpDeal(dependencies);
  const milestone = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/milestones`, "POST", {
      milestoneId: "milestone_http-1",
      key: "target_identified",
      title: "Target identified",
    }, {
      "Idempotency-Key": "idem_lifecycle-http-milestone",
      "If-Match": '"v1"',
    }),
    dependencies,
  );
  assertEquals(milestone?.status, 200);
  assertEquals(milestone?.headers.get("ETag"), '"v2"');
  const milestoneBody = await data(milestone!);
  const lifecycle = milestoneBody.data as Record<string, unknown>;
  assertEquals(
    (lifecycle.lifecycle as Record<string, unknown>).state,
    "draft",
  );

  const phase = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/phase-transitions`, "POST", {
      toState: "sourcing",
    }, {
      "Idempotency-Key": "idem_lifecycle-http-phase",
      "If-Match": '"v2"',
    }),
    dependencies,
  );
  assertEquals(phase?.status, 200);
  assertEquals(phase?.headers.get("ETag"), '"v3"');

  const milestoneTransition = await handleDealManagementRoute(
    request(
      `/api/v1/deals/${dealId}/milestones/milestone_http-1/transition`,
      "POST",
      { toState: "active" },
      {
        "Idempotency-Key": "idem_lifecycle-http-milestone-transition",
        "If-Match": '"v3"',
      },
    ),
    dependencies,
  );
  assertEquals(milestoneTransition?.status, 200);
  assertEquals(milestoneTransition?.headers.get("ETag"), '"v4"');

  const read = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/lifecycle`, "GET"),
    dependencies,
  );
  assertEquals(read?.status, 200);
  const readBody = await data(read!);
  const readValue = readBody.data as Record<string, unknown>;
  assertEquals(
    (readValue.lifecycle as Record<string, unknown>).state,
    "sourcing",
  );
  assertEquals((readValue.activity as readonly unknown[]).length, 3);

  const milestones = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/milestones`, "GET"),
    dependencies,
  );
  const milestoneData = (await data(milestones!)).data as Record<
    string,
    unknown
  >;
  assertEquals(
    (milestoneData.milestones as readonly Record<string, unknown>[])[0]!.state,
    "active",
  );
});

Deno.test("lifecycle HTTP enforces idempotent replay, stale ETags, and validation", async () => {
  const dependencies = dependenciesForTest();
  const dealId = await createHttpDeal(dependencies);
  const command = {
    toState: "sourcing",
  };
  const headers = {
    "Idempotency-Key": "idem_lifecycle-http-replay",
    "If-Match": '"v1"',
  };
  const first = await handleDealManagementRoute(
    request(
      `/api/v1/deals/${dealId}/phase-transitions`,
      "POST",
      command,
      headers,
    ),
    dependencies,
  );
  const replay = await handleDealManagementRoute(
    request(
      `/api/v1/deals/${dealId}/phase-transitions`,
      "POST",
      command,
      headers,
    ),
    dependencies,
  );
  assertEquals(first?.status, 200);
  assertEquals(await data(first!), await data(replay!));

  const mismatch = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/phase-transitions`, "POST", {
      toState: "archived",
    }, headers),
    dependencies,
  );
  assertEquals(mismatch?.status, 409);
  assertEquals(errorCode(await data(mismatch!)), "IDEMPOTENCY_CONFLICT");

  const stale = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/phase-transitions`, "POST", command, {
      "Idempotency-Key": "idem_lifecycle-http-stale",
      "If-Match": '"v1"',
    }),
    dependencies,
  );
  assertEquals(stale?.status, 409);
  assertEquals(errorCode(await data(stale!)), "VERSION_CONFLICT");

  const invalid = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/phase-transitions`, "POST", {
      toState: "not-a-state",
    }, {
      "Idempotency-Key": "idem_lifecycle-http-invalid",
      "If-Match": '"v2"',
    }),
    dependencies,
  );
  assertEquals(invalid?.status, 422);
  assertEquals(errorCode(await data(invalid!)), "VALIDATION_FAILED");
});

Deno.test("lifecycle HTTP preserves protected not-found and field-masked activity", async () => {
  const standard = dependenciesForTest();
  const dealId = await createHttpDeal(standard);
  const masked: DealManagementHttpDependencies = {
    ...standard,
    authorization: new LifecycleReadMaskAuthorization(),
  };
  const read = await handleDealManagementRoute(
    request(`/api/v1/deals/${dealId}/lifecycle`, "GET"),
    masked,
  );
  const value = (await data(read!)).data as Record<string, unknown>;
  assertEquals(value.activity, undefined);

  const missing = await handleDealManagementRoute(
    request("/api/v1/deals/deal_missing/lifecycle", "GET"),
    dependenciesForTest(new LifecycleReadMaskAuthorization()),
  );
  assertEquals(missing?.status, 404);
  assertEquals(errorCode(await data(missing!)), "PROTECTED_NOT_FOUND");
});

function dependenciesForTest(
  authorization: DealAuthorizationPort = new RecordingDealAuthorization(),
): DealManagementHttpDependencies {
  return dependencies(authorization);
}
