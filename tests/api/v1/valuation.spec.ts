import { assertEquals } from "@std/assert";
import {
  parseCorrelationId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
} from "../../../src/platform/api/v1.ts";
import type { DurableJob } from "../../../src/platform/jobs/v1.ts";
import {
  type ApproveValuationCommand,
  type CommandResult,
  type EnqueueValuationComputeCommand,
  type InvalidateValuationCommand,
} from "../../../src/valuation/commands.ts";
import type { ValuationScope } from "../../../src/valuation/basis.ts";
import type {
  ValuationApproval,
  ValuationAuthoritySnapshot,
  ValuationComparison,
  ValuationInvalidation,
  ValuationResult,
  ValuationScenario,
} from "../../../src/valuation/model.ts";
import { parseValuationInvalidationId } from "../../../src/valuation/ids.ts";
import type { ValuationReadPort } from "../../../src/valuation/read.ts";
import {
  type ValuationAuthenticatedContext,
  type ValuationAuthorityPort,
  type ValuationAuthorizationPort,
  type ValuationCommandPort,
  ValuationV1Application,
} from "../../../src/api/v1/valuation.ts";
import { handleValuationV1Route } from "../../../src/api/v1/valuation_routes.ts";
import {
  computedScenario,
  humanActor,
  NOW,
  scope,
} from "../../valuation/fixtures.ts";

Deno.test("Valuation API authorizes before protected reads and emits strong ETags", async () => {
  const current = computedScenario();
  const reads = new MemoryReads(current.scenario, current.result);
  const authorization = new MemoryAuthorization();
  const application = applicationFor(reads, authorization);
  const authenticated = authenticatedContext();
  const dependencies = routeDependencies(application, authenticated);
  const response = await handleValuationV1Route(
    new Request(
      `http://localhost/api/v1/valuation/scenarios/${current.scenario.id}`,
    ),
    dependencies,
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers.get("ETag"), '"v5"');
  assertEquals(reads.scenarioReads, 1);
  authorization.allowed = false;
  const denied = await handleValuationV1Route(
    new Request(
      `http://localhost/api/v1/valuation/scenarios/${current.scenario.id}`,
    ),
    dependencies,
  );
  assertEquals(denied?.status, 404);
  assertEquals(reads.scenarioReads, 1);
});

Deno.test("compute route requires idempotency and If-Match and returns an accepted job", async () => {
  const current = computedScenario();
  const commands = new MemoryCommands(makeJob());
  const application = applicationFor(
    new MemoryReads(current.scenario, current.result),
    new MemoryAuthorization(),
    commands,
  );
  const request = new Request(
    `http://localhost/api/v1/valuation/scenarios/${current.scenario.id}/compute`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": "idem_api-compute",
        "If-Match": '"v5"',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: "job_api-compute",
        operationId: "op_api-compute",
      }),
    },
  );
  const response = await handleValuationV1Route(
    request,
    routeDependencies(application, authenticatedContext()),
  );
  assertEquals(response?.status, 202);
  const body = await response?.json() as {
    readonly data: {
      readonly jobId: string;
      readonly operationId: string;
      readonly statusUrl: string;
    };
  };
  assertEquals(body.data.jobId, "job_api-compute");
  assertEquals(body.data.operationId, "op_api-compute");
  assertEquals(body.data.statusUrl, "/api/v1/jobs/job_api-compute");
  assertEquals(commands.enqueued.length, 1);
});

Deno.test("approval route fails closed without a server authority snapshot", async () => {
  const current = computedScenario();
  const authority = new MemoryAuthority();
  const application = applicationFor(
    new MemoryReads(current.scenario, current.result),
    new MemoryAuthorization(),
    new MemoryCommands(makeJob()),
    authority,
  );
  const request = new Request(
    `http://localhost/api/v1/valuation/scenarios/${current.scenario.id}/results/${current.result.id}/approve`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": "idem_api-approve",
        "If-Match": '"v5"',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approvalId: "valuation_approval_api" }),
    },
  );
  const response = await handleValuationV1Route(
    request,
    routeDependencies(application, authenticatedContext()),
  );
  assertEquals(response?.status, 403);
});

Deno.test("invalidation route preserves stale automation as a semantic command", async () => {
  const current = computedScenario();
  const commands = new MemoryCommands(makeJob());
  const application = applicationFor(
    new MemoryReads(current.scenario, current.result),
    new MemoryAuthorization(),
    commands,
  );
  const request = new Request(
    `http://localhost/api/v1/valuation/scenarios/${current.scenario.id}/invalidate`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": "idem_api-stale",
        "If-Match": '"v5"',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invalidationId: "valuation_invalidation_api",
        kind: "stale",
        reason: "Source version changed",
        resultId: current.result.id,
      }),
    },
  );
  const response = await handleValuationV1Route(
    request,
    routeDependencies(application, authenticatedContext()),
  );
  assertEquals(response?.status, 200);
  assertEquals(commands.invalidations[0].kind, "stale");
});

class MemoryAuthorization implements ValuationAuthorizationPort {
  allowed = true;
  readonly requests: string[] = [];

  authorize(request: { readonly resourceId: string }): Promise<boolean> {
    this.requests.push(request.resourceId);
    return Promise.resolve(this.allowed);
  }
}

class MemoryReads implements ValuationReadPort {
  scenarioReads = 0;

  constructor(
    private readonly scenario: ValuationScenario,
    private readonly result: ValuationResult,
  ) {}

  findScenario(
    _scope: ValuationScope,
    _id: ValuationScenario["id"],
  ): Promise<ValuationScenario> {
    this.scenarioReads += 1;
    return Promise.resolve(this.scenario);
  }
  findResult(
    _scope: ValuationScope,
    _id: ValuationResult["id"],
  ): Promise<ValuationResult> {
    return Promise.resolve(this.result);
  }
  findComparison(
    _scope: ValuationScope,
    _id: ValuationComparison["id"],
  ): Promise<ValuationComparison | undefined> {
    return Promise.resolve(undefined);
  }
}

class MemoryAuthority implements ValuationAuthorityPort {
  snapshot: ValuationAuthoritySnapshot | undefined;

  resolve(): Promise<ValuationAuthoritySnapshot | undefined> {
    return Promise.resolve(this.snapshot);
  }
}

class MemoryCommands implements ValuationCommandPort {
  readonly enqueued: EnqueueValuationComputeCommand[] = [];
  readonly approvals: ApproveValuationCommand[] = [];
  readonly invalidations: InvalidateValuationCommand[] = [];

  constructor(private readonly job: DurableJob) {}

  enqueueCompute(
    command: EnqueueValuationComputeCommand,
  ): Promise<CommandResult<DurableJob>> {
    this.enqueued.push(command);
    return Promise.resolve({
      status: "accepted",
      value: {
        ...this.job,
        jobId: command.jobId,
        operationId: command.operationId,
      },
    });
  }
  approve(
    command: ApproveValuationCommand,
  ): Promise<CommandResult<ValuationApproval>> {
    this.approvals.push(command);
    return Promise.reject(new Error("not used"));
  }
  invalidate(
    command: InvalidateValuationCommand,
  ): Promise<CommandResult<ValuationInvalidation>> {
    this.invalidations.push(command);
    return Promise.resolve({
      status: "accepted",
      value: { ...currentInvalidation(), id: command.invalidationId },
    });
  }
}

function applicationFor(
  reads: ValuationReadPort,
  authorization: ValuationAuthorizationPort,
  commands = new MemoryCommands(makeJob()),
  authority = new MemoryAuthority(),
): ValuationV1Application {
  return new ValuationV1Application(authorization, reads, commands, authority);
}

function routeDependencies(
  application: ValuationV1Application,
  authenticated: ValuationAuthenticatedContext,
) {
  return { application, context: { contextFor: () => authenticated } };
}

function authenticatedContext(): ValuationAuthenticatedContext {
  const actor = humanActor();
  return {
    actor,
    context: {
      actorId: actor.id,
      tenantId: scope().tenantId,
      workspaceId: scope().workspaceId,
      dealId: scope().dealId,
      correlationId: required("cor_valuation-api", parseCorrelationId),
      origin: "http",
    },
  };
}

function makeJob(): DurableJob {
  const actor = humanActor();
  return {
    jobId: required("job_api", parseJobId),
    operationId: required("op_api", parseOperationId),
    jobType: "valuation.compute",
    schemaVersion: 1,
    tenantId: scope().tenantId,
    workspaceId: scope().workspaceId,
    dealId: scope().dealId,
    initiatingActorId: actor.id,
    correlationId: required("cor_valuation-api", parseCorrelationId),
    idempotencyKey: required("idem_api", parseIdempotencyKey),
    inputVersionReferences: [],
    payload: {},
    timeoutAt: new Date(NOW.getTime() + 60_000),
    createdAt: NOW,
  };
}

function currentInvalidation(): ValuationInvalidation {
  const current = computedScenario();
  return {
    aggregateType: "valuation_invalidation",
    id: required(
      "valuation_invalidation_current",
      parseValuationInvalidationId,
    ),
    scope: current.scenario.scope,
    scenarioId: current.scenario.id,
    scenarioVersion: current.scenario.version,
    resultId: current.result.id,
    kind: "stale",
    reason: "fixture",
    actor: humanActor(),
    createdAt: NOW,
  };
}

function required<T>(
  value: unknown,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture identifier "${String(value)}" is invalid.`);
}
