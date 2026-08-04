import { assertEquals, assertRejects } from "@std/assert";
import {
  type DealAuthorizationPort,
  DealIdempotencyConflictError,
  DealLifecycleError,
  DealManagementService,
  DealVersionConflictError,
  InMemoryDealRepository,
  type LifecycleIdFactory,
  milestoneId,
} from "../../src/deal_management/v1.ts";
import {
  contextFor,
  DenyingDealAuthorization,
  FixedDealClock,
  keyFor,
  RecordingDealAuthorization,
  SequentialDealIdFactory,
} from "./support.ts";

class SequentialLifecycleIds implements LifecycleIdFactory {
  private milestoneSequence = 0;
  private transitionSequence = 0;

  nextMilestoneId() {
    this.milestoneSequence += 1;
    return milestoneId(`milestone_service-${this.milestoneSequence}`);
  }

  nextTransitionId(): string {
    this.transitionSequence += 1;
    return `transition_service-${this.transitionSequence}`;
  }
}

function service(
  authorization: DealAuthorizationPort = new RecordingDealAuthorization(),
) {
  const repository = new InMemoryDealRepository();
  const dealService = new DealManagementService({
    repository,
    authorization,
    ids: new SequentialDealIdFactory(),
    lifecycleIds: new SequentialLifecycleIds(),
    clock: new FixedDealClock(),
  });
  return { authorization, dealService, repository };
}

async function createDeal(dealService: DealManagementService) {
  return await dealService.createDeal({
    type: "create_deal",
    context: contextFor(),
    idempotencyKey: keyFor("lifecycle-create"),
    name: "Lifecycle deal",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
  });
}

Deno.test("lifecycle commands share Deal versioning, audit payloads, and replay", async () => {
  const { dealService, repository } = service();
  const created = await createDeal(dealService);
  const command = {
    type: "create_milestone" as const,
    context: contextFor(),
    idempotencyKey: keyFor("milestone-create"),
    dealId: created.deal.id,
    expectedVersion: 1,
    key: "target_identified",
    title: "Target identified",
  };
  const first = await dealService.createMilestone(command);
  const replay = await dealService.createMilestone(command);

  assertEquals(first, replay);
  assertEquals(first.deal.version, 2);
  assertEquals(first.lifecycle?.version, 2);
  assertEquals(first.lifecycle?.milestones[0]?.state, "planned");
  assertEquals(
    (await repository.listEvents(
      {
        tenantId: created.deal.tenantId,
        workspaceId: created.deal.workspaceId,
      },
      created.deal.id,
    )).at(-1)?.payload,
    {
      subjectType: "milestone",
      subjectId: first.lifecycle!.milestones[0].id,
      nextState: "planned",
      prerequisites: [],
      authorization: {
        reasonCode: "ALLOWED",
        allowedActions: ["manage_milestones"],
        approvedClassifications: [
          { name: "deal", classification: "public" },
          { name: "parties", classification: "external_shareable" },
          { name: "roles", classification: "relationship_ownership" },
          { name: "mandate_ceiling", classification: "mandate_ceiling" },
          { name: "authority_constraints", classification: "mandate_ceiling" },
        ],
      },
    },
  );
  await assertRejects(
    () => dealService.createMilestone({ ...command, title: "Changed" }),
    DealIdempotencyConflictError,
  );
});

Deno.test("lifecycle service enforces stale versions and prerequisite blockers", async () => {
  const { dealService } = service();
  const created = await createDeal(dealService);
  const milestone = await dealService.createMilestone({
    type: "create_milestone",
    context: contextFor(),
    idempotencyKey: keyFor("milestone-prerequisite"),
    dealId: created.deal.id,
    expectedVersion: 1,
    key: "target_identified",
    title: "Target identified",
  });
  const sourcing = await dealService.transitionLifecycle({
    type: "transition_lifecycle",
    context: contextFor(),
    idempotencyKey: keyFor("lifecycle-sourcing"),
    dealId: created.deal.id,
    expectedVersion: milestone.deal.version,
    toState: "sourcing",
  });
  await assertRejects(
    () =>
      dealService.transitionLifecycle({
        type: "transition_lifecycle",
        context: contextFor(),
        idempotencyKey: keyFor("lifecycle-blocked"),
        dealId: created.deal.id,
        expectedVersion: sourcing.deal.version,
        toState: "due_diligence",
      }),
    DealLifecycleError,
    "blocked",
  );
  await assertRejects(
    () =>
      dealService.transitionLifecycle({
        type: "transition_lifecycle",
        context: contextFor(),
        idempotencyKey: keyFor("lifecycle-stale"),
        dealId: created.deal.id,
        expectedVersion: 1,
        toState: "sourcing",
      }),
    DealVersionConflictError,
  );
});

Deno.test("lifecycle commands authorize before loading and protect other scopes", async () => {
  const authorization = new DenyingDealAuthorization();
  const { dealService } = service(authorization);
  await assertRejects(
    () =>
      dealService.transitionLifecycle({
        type: "transition_lifecycle",
        context: contextFor("tenant_other", "workspace_other"),
        idempotencyKey: keyFor("cross-scope"),
        dealId: "deal_absent" as never,
        expectedVersion: 1,
        toState: "sourcing",
      }),
    Error,
  );
  assertEquals(authorization.calls.length, 1);
  assertEquals(authorization.calls[0].resource.id, "deal_absent");
});
