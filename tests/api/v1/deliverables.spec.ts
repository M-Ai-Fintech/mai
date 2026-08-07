import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  type DeliverableAuthorizationRequest,
  type DeliverablesAuthorizationPort,
  type DeliverableScheduleInput,
  type DeliverablesReadPort,
  DeliverablesV1Application,
} from "../../../src/api/v1/deliverables.ts";
import {
  type DeliverablesRequestContextPort,
  handleDeliverablesV1Route,
} from "../../../src/api/v1/deliverables_routes.ts";
import {
  approveContent,
  authorizeRelease,
  createDeliverable,
  createDeliverableVersion,
  type Deliverable,
  type DeliverableScope,
  type DeliverableVersion,
  recordReleaseAuthorization,
  type ReleaseAuthorization,
  submitForReview,
} from "../../../src/deliverables/v1.ts";
import {
  deriveDeliverableIdempotencyKey,
} from "../../../src/deliverables/jobs.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseJobId,
  parseOperationId,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../../src/platform/api/v1.ts";
import {
  parseDeliverableId,
  parseDeliverableVersionId,
} from "../../../src/deliverables/ids.ts";

Deno.test("deliverables v1 reads are scoped, authorized, etagged, and paginated", async () => {
  const first = fixtureVersion("delivver_diligence-v1", 1);
  const second = fixtureVersion("delivver_diligence-v2", 2);
  const reads = new FakeDeliverablesReadPort([fixtureDeliverable()], [
    first,
    second,
  ]);
  const application = applicationFor(reads);
  const page = await route(application, "/api/v1/deliverables?limit=1");
  assertEquals(page.status, 200);
  const body = await page.json();
  assertEquals(body.data[0].deliverableId, "deliverable_diligence");
  assert(body.meta.nextCursor);

  const detail = await route(
    application,
    "/api/v1/deliverables/deliverable_diligence",
  );
  assertEquals(detail.status, 200);
  assertEquals(detail.headers.get("ETag"), '"v1"');
  assertEquals((await detail.json()).data.title, "Diligence Report");
});

Deno.test("deliverables v1 protects denied reads before loading scoped data", async () => {
  const reads = new FakeDeliverablesReadPort([], []);
  const authorization = new RecordingAuthorizationPort(false);
  const application = new DeliverablesV1Application(
    authorization,
    reads,
    new RecordingDeliverableScheduler(),
  );
  const response = await route(
    application,
    "/api/v1/deliverables/deliverable_diligence",
  );
  assertEquals(response.status, 404);
  assertEquals((await response.json()).error.code, "PROTECTED_NOT_FOUND");
  assertFalse(reads.findDeliverableCalls > 0);
});

Deno.test("deliverables v1 export commands require approved current versions and deterministic idempotency", async () => {
  const version = fixtureVersion("delivver_diligence-v1", 1);
  const reads = new FakeDeliverablesReadPort([], [version]);
  const scheduler = new RecordingDeliverableScheduler();
  const application = new DeliverablesV1Application(
    new RecordingAuthorizationPort(true),
    reads,
    scheduler,
  );
  const key = await deriveDeliverableIdempotencyKey({
    actorId: context().actorId,
    commandType: "deliverables.export",
    targetType: "DeliverableVersion",
    targetId: version.versionId,
  });
  const response = await route(
    application,
    `/api/v1/deliverables/${version.versionId}/exports`,
    "POST",
    { format: "pdf", releaseAuthorizationId: "release_diligence-v1" },
    { "If-Match": '"v4"', "Idempotency-Key": key },
  );
  assertEquals(response.status, 202);
  assertEquals((await response.json()).data.status, "queued");
  assertEquals(
    scheduler.input?.inputVersionReferences[0].aggregateType,
    "DeliverableVersion",
  );

  const missingRelease = await route(
    application,
    `/api/v1/deliverables/${version.versionId}/exports`,
    "POST",
    { format: "pdf" },
    { "If-Match": '"v4"', "Idempotency-Key": key },
  );
  assertEquals(missingRelease.status, 409);
  assertEquals((await missingRelease.json()).error.code, "INVALID_TRANSITION");

  const missingHeaders = await route(
    application,
    `/api/v1/deliverables/${version.versionId}/exports`,
    "POST",
    { format: "pdf" },
  );
  assertEquals(missingHeaders.status, 422);
  assertEquals((await missingHeaders.json()).error.code, "VALIDATION_FAILED");
});

async function route(
  application: DeliverablesV1Application,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Readonly<Record<string, string>> = {},
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined
      ? headers
      : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await handleDeliverablesV1Route(request, {
    context: new FixtureRequestContextPort(),
    application,
  });
  assert(response);
  return response;
}

function applicationFor(
  reads: DeliverablesReadPort,
): DeliverablesV1Application {
  return new DeliverablesV1Application(
    new RecordingAuthorizationPort(true),
    reads,
    new RecordingDeliverableScheduler(),
  );
}

class FixtureRequestContextPort implements DeliverablesRequestContextPort {
  contextFor(_request: Request): RequestContext {
    return context();
  }
}

class RecordingAuthorizationPort implements DeliverablesAuthorizationPort {
  readonly requests: DeliverableAuthorizationRequest[] = [];

  constructor(private readonly allowed: boolean) {}

  authorize(request: DeliverableAuthorizationRequest): Promise<boolean> {
    this.requests.push(request);
    return Promise.resolve(this.allowed);
  }
}

class FakeDeliverablesReadPort implements DeliverablesReadPort {
  findDeliverableCalls = 0;

  constructor(
    private readonly deliverables: readonly Deliverable[],
    private readonly versions: readonly DeliverableVersion[],
  ) {}

  findDeliverable(
    _scope: DeliverableScope,
    deliverableId: Deliverable["deliverableId"],
  ): Promise<Deliverable | undefined> {
    this.findDeliverableCalls += 1;
    return Promise.resolve(
      this.deliverables.find((item) => item.deliverableId === deliverableId),
    );
  }

  listDeliverables(): Promise<readonly Deliverable[]> {
    return Promise.resolve(this.deliverables);
  }

  findVersion(
    _scope: DeliverableScope,
    versionId: DeliverableVersion["versionId"],
  ): Promise<DeliverableVersion | undefined> {
    return Promise.resolve(
      this.versions.find((item) => item.versionId === versionId),
    );
  }

  findReleaseAuthorization(
    _scope: DeliverableScope,
    versionId: DeliverableVersion["versionId"],
    authorizationId: string,
  ): Promise<ReleaseAuthorization | undefined> {
    const version = this.versions.find((item) => item.versionId === versionId);
    if (version === undefined || authorizationId !== "release_diligence-v1") {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(authorizeRelease(version, {
      authorizationId,
      actorId: context().actorId,
      actorKind: "human",
      audience: {
        audienceType: "internal_committee",
        purpose: "committee_review",
        recipientIds: ["actor_owner"],
      },
      approvedFormats: ["pdf"],
      confidentiality: "internal_restricted",
      authorizedAt: new Date("2026-08-07T11:05:00.000Z"),
    }));
  }
}

class RecordingDeliverableScheduler {
  input: DeliverableScheduleInput | undefined;

  schedule(input: DeliverableScheduleInput) {
    this.input = input;
    return Promise.resolve({
      status: "accepted" as const,
      job: {
        jobId: required("job_diligence-export", parseJobId),
        operationId: required("op_diligence-export", parseOperationId),
      },
    });
  }
}

function fixtureVersion(
  versionId: string,
  versionNumber: number,
): DeliverableVersion {
  const deliverable = fixtureDeliverable();
  const draft = createDeliverableVersion({
    versionId: required(versionId, parseDeliverableVersionId),
    deliverable,
    versionNumber,
    versionLabel: `v${versionNumber}`,
    sourceSnapshot: {
      snapshotId: "snapshot_diligence-v1" as never,
      scope: scope(),
      sourceCutoffAt: new Date("2026-08-07T10:00:00.000Z"),
      references: [{
        sourceObjectType: "DocumentVersion",
        sourceObjectId: "docver_contract-v3",
        sourceObjectVersion: 3,
        documentVersionId: "docver_contract-v3",
        accessLevel: "internal_restricted",
      }],
      createdBy: context().actorId,
      createdAt: new Date("2026-08-07T10:00:00.000Z"),
    },
    content: { summary: "Approved" },
    classifications: { summary: "public" },
    createdBy: context().actorId,
    createdAt: new Date("2026-08-07T10:00:00.000Z"),
  });
  const reviewed = submitForReview(draft, context().actorId);
  const approved = approveContent(reviewed, {
    approvalId: "approval_diligence-v1",
    actorId: context().actorId,
    actorKind: "human",
    decision: "approved",
    decidedAt: new Date("2026-08-07T11:00:00.000Z"),
  }).version;
  return recordReleaseAuthorization(
    approved,
    authorizeRelease(approved, {
      authorizationId: "release_diligence-v1",
      actorId: context().actorId,
      actorKind: "human",
      audience: {
        audienceType: "internal_committee",
        purpose: "committee_review",
        recipientIds: ["actor_owner"],
      },
      approvedFormats: ["pdf"],
      confidentiality: "internal_restricted",
      authorizedAt: new Date("2026-08-07T11:05:00.000Z"),
    }),
  );
}

function fixtureDeliverable(): Deliverable {
  return createDeliverable({
    deliverableId: required("deliverable_diligence", parseDeliverableId),
    scope: scope(),
    deliverableType: "diligence_report",
    title: "Diligence Report",
    ownerId: context().actorId,
    defaultAudienceType: "internal_committee",
    confidentiality: "internal_restricted",
    createdBy: context().actorId,
    createdAt: new Date("2026-08-07T10:00:00.000Z"),
    updatedAt: new Date("2026-08-07T10:00:00.000Z"),
  });
}

function scope(): DeliverableScope {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function context(): RequestContext {
  return {
    actorId: required("actor_owner", parseActorId),
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
    correlationId: required("cor_deliverables", parseCorrelationId),
    origin: "http",
  };
}

function required<T>(
  value: string,
  parser: (candidate: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
