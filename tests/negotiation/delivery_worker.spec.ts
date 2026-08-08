import { assertEquals, assertRejects } from "@std/assert";
import { InMemoryNegotiationEffects } from "../../src/negotiation/effects.ts";
import {
  type NegotiationDeliveryAuthorizationPort,
  NegotiationDeliveryExecutor,
} from "../../src/negotiation/delivery_worker.ts";
import {
  NamedFakeNegotiationTransport,
  type NegotiationDeliveryJobInput,
} from "../../src/negotiation/jobs.ts";
import { NegotiationService } from "../../src/negotiation/service.ts";
import type { ConsumedNegotiationAuthority } from "../../src/negotiation/authority.ts";
import type {
  ClaimedJob,
  JobExecutionContext,
} from "../../src/platform/jobs/v1.ts";
import type {
  NegotiationCommandIdentity,
  NegotiationTransaction,
  NegotiationUnitOfWork,
  NegotiationUnitOfWorkResult,
} from "../../src/negotiation/repository.ts";
import { InMemoryNegotiationUnitOfWork } from "../../src/negotiation/repository.ts";
import { createNormalizedTerms } from "../../src/negotiation/terms.ts";
import {
  actor,
  AllowingNegotiationAuthorization,
  contextFor,
  scope,
} from "./support.ts";

const now = "2026-08-08T12:00:00.000Z";
const terms = createNormalizedTerms({
  currency: "USD",
  valuation: { minorUnits: 100_000, currency: "USD" },
});

function command(
  actorValue = actor(),
  expectedVersion = 1,
  idempotencyKey = "idem_worker-command",
) {
  return {
    context: contextFor(actorValue),
    scope,
    roundId: "round_solar",
    actor: actorValue,
    expectedVersion: expectedVersion as never,
    idempotencyKey: idempotencyKey as never,
  };
}

function authorityCommand(
  actorValue: ReturnType<typeof actor>,
  expectedVersion: number,
  idempotencyKey: string,
) {
  return {
    ...command(actorValue, expectedVersion, idempotencyKey),
    authority: {
      protectedCommand: { command: idempotencyKey },
      resolver: { resolve: () => Promise.resolve(undefined) },
    },
  };
}

function authorityFor(actorId: string): ConsumedNegotiationAuthority {
  return {
    actor: Object.freeze(actor(actorId)),
    proof: {
      proofId: "authority_proof_worker",
      proofVersion: 1,
      evaluationId: "evaluation_worker",
      evaluationDigest: "a".repeat(64),
      proofDigest: "b".repeat(64),
    },
    dispatchId: "work_target_worker",
    idempotencyIdentity: "worker",
  };
}

async function scenario(): Promise<{
  readonly negotiation: NegotiationService;
  readonly unitOfWork: InMemoryNegotiationUnitOfWork;
  readonly job: NegotiationDeliveryJobInput;
}> {
  const unitOfWork = new InMemoryNegotiationUnitOfWork();
  const jobs: NegotiationDeliveryJobInput[] = [];
  const negotiation = new NegotiationService({
    unitOfWork,
    effects: new InMemoryNegotiationEffects(),
    authorization: new AllowingNegotiationAuthorization(),
    clock: { now: () => now },
    authority: {
      consume: (input) => Promise.resolve(authorityFor(input.actorId)),
    },
    deliveryFeatureGate: { deliveryEnabled: () => true },
    jobScheduler: {
      enqueue: (_transaction, job) => {
        jobs.push(job);
        return Promise.resolve();
      },
    },
  });
  await negotiation.createRound({
    context: contextFor(),
    scope,
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    number: 1,
    actor: actor(),
    idempotencyKey: "idem_worker-create" as never,
  });
  await negotiation.openRound(command(actor(), 1, "idem_worker-open"));
  await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 2, "idem_worker-mandate"),
    {
      mandateId: "mandate_worker",
      scope,
      constraints: [{
        id: "valuation-floor",
        key: "valuation",
        operator: "minimum",
        value: 100_000,
        unit: "minor_units",
        mandatory: true,
        source: "human-mandate",
      }],
      status: "active",
      now,
    },
  );
  await negotiation.createProposal(command(actor(), 3, "idem_worker-draft"), {
    proposalId: "proposal_worker",
    fromParty: "buyer",
    terms,
    origin: "human",
  });
  await negotiation.submitProposal(
    command(actor(), 4, "idem_worker-submit"),
    "proposal_worker",
  );
  await negotiation.requestApproval(
    command(actor(), 5, "idem_worker-approval-request"),
    {
      proposalId: "proposal_worker",
      approvalId: "negotiation_approval_worker",
      namedApproverId: "actor_bob" as never,
    },
  );
  await negotiation.approveProposal(
    {
      ...authorityCommand(actor("actor_bob"), 6, "idem_worker-approve"),
      expectedProposalVersion: 2 as never,
    },
    "proposal_worker",
    "negotiation_approval_worker",
  );
  await negotiation.requestDelivery(
    {
      ...authorityCommand(actor("actor_bob"), 7, "idem_worker-delivery"),
      expectedProposalVersion: 2 as never,
    },
    {
      proposalId: "proposal_worker",
      approvalId: "negotiation_approval_worker",
      deliveryRequestId: "delivery_request_worker",
      recipientId: "counterparty_buyer",
      purpose: "negotiation_proposal",
    },
  );
  const job = jobs[0];
  if (job === undefined) throw new Error("Expected one durable delivery job.");
  return { negotiation, unitOfWork, job };
}

function claimed(job: NegotiationDeliveryJobInput): ClaimedJob {
  return {
    ...job,
    state: "running",
    attemptNumber: 1,
    workerId: "worker_negotiation-test",
    attemptStartedAt: new Date(now),
    leaseExpiresAt: new Date("2026-08-08T12:10:00.000Z"),
    progress: 0,
  };
}

function context(): JobExecutionContext {
  return {
    deadline: new Date("2026-08-09T12:00:00.000Z"),
    currentLeaseExpiry: () => new Date("2026-08-08T12:10:00.000Z"),
    cancellationRequested: () => Promise.resolve(false),
    heartbeat: () => Promise.resolve(new Date("2026-08-08T12:10:00.000Z")),
    beforeExternalEffect: () => Promise.resolve(),
  };
}

function revalidator(
  callback: () => void | Promise<void>,
): NegotiationDeliveryAuthorizationPort {
  return { assertCurrent: callback };
}

class FailSentOnceUnitOfWork implements NegotiationUnitOfWork {
  private failed = false;

  constructor(private readonly inner: InMemoryNegotiationUnitOfWork) {}

  read<TResult>(
    operation: (transaction: NegotiationTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.inner.read(operation);
  }

  run(
    identity: NegotiationCommandIdentity,
    operation: (
      transaction: NegotiationTransaction,
    ) => Promise<import("../../src/negotiation/model.ts").NegotiationRound>,
  ): Promise<NegotiationUnitOfWorkResult> {
    if (
      identity.commandType === "negotiation_delivery_sent" && !this.failed
    ) {
      this.failed = true;
      return Promise.reject(new Error("LOCAL_COMPLETION_UNAVAILABLE"));
    }
    return this.inner.run(identity, operation);
  }
}

Deno.test("delivery executor denies revocation before the external effect", async () => {
  const { unitOfWork, job } = await scenario();
  let revoked = true;
  const transport = new NamedFakeNegotiationTransport();
  const executor = new NegotiationDeliveryExecutor(
    unitOfWork,
    transport,
    revalidator(() => {
      if (revoked) throw new Error("DELIVERY_REVOKED");
    }),
    { deliveryEnabled: () => true },
    { now: () => new Date(now) },
  );
  await assertRejects(
    () => executor.execute(claimed(job), context()),
    Error,
    "REVOKED",
  );
  assertEquals(transport.sent.length, 0);
  revoked = false;
});

Deno.test("delivery executor rejects a proposal superseded after job creation", async () => {
  const { negotiation, unitOfWork, job } = await scenario();
  await negotiation.counterProposal(
    command(actor("actor_bob"), 8, "idem_worker-supersede"),
    {
      proposalId: "proposal_worker-counter",
      fromParty: "seller",
      terms,
      origin: "human",
      inReplyToProposalId: "proposal_worker",
    },
  );
  const transport = new NamedFakeNegotiationTransport();
  const executor = new NegotiationDeliveryExecutor(
    unitOfWork,
    transport,
    revalidator(() => Promise.resolve()),
    { deliveryEnabled: () => true },
    { now: () => new Date(now) },
  );
  await assertRejects(
    () => executor.execute(claimed(job), context()),
    Error,
    "superseded",
  );
  assertEquals(transport.sent.length, 0);
});

Deno.test("delivery executor rejects a mandate replacement after job creation", async () => {
  const { negotiation, unitOfWork, job } = await scenario();
  await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 8, "idem_worker-mandate-replace"),
    {
      mandateId: "mandate_worker-replacement",
      scope,
      constraints: [{
        id: "valuation-floor",
        key: "valuation",
        operator: "minimum",
        value: 100_000,
        unit: "minor_units",
        mandatory: true,
        source: "human-mandate",
      }],
      status: "active",
      now,
    },
  );
  const transport = new NamedFakeNegotiationTransport();
  const executor = new NegotiationDeliveryExecutor(
    unitOfWork,
    transport,
    revalidator(() => Promise.resolve()),
    { deliveryEnabled: () => true },
    { now: () => new Date(now) },
  );
  await assertRejects(
    () => executor.execute(claimed(job), context()),
    Error,
    "approved",
  );
  assertEquals(transport.sent.length, 0);
});

Deno.test("delivery executor rejects a terminal round before the external effect", async () => {
  const { negotiation, unitOfWork, job } = await scenario();
  await negotiation.closeRound(command(actor(), 8, "idem_worker-close"));
  const transport = new NamedFakeNegotiationTransport();
  const executor = new NegotiationDeliveryExecutor(
    unitOfWork,
    transport,
    revalidator(() => Promise.resolve()),
    { deliveryEnabled: () => true },
    { now: () => new Date(now) },
  );
  await assertRejects(
    () => executor.execute(claimed(job), context()),
    Error,
    "terminal",
  );
  assertEquals(transport.sent.length, 0);
});

Deno.test("provider success followed by local completion failure retries with one logical identity", async () => {
  const { unitOfWork: inner, job } = await scenario();
  const unitOfWork = new FailSentOnceUnitOfWork(inner);
  const transport = new NamedFakeNegotiationTransport({
    providerReference: "provider_delivery_worker",
  });
  const executor = new NegotiationDeliveryExecutor(
    unitOfWork,
    transport,
    revalidator(() => Promise.resolve()),
    { deliveryEnabled: () => true },
    { now: () => new Date(now) },
  );
  await assertRejects(
    () => executor.execute(claimed(job), context()),
    Error,
    "LOCAL_COMPLETION",
  );
  const completed = await executor.execute(claimed(job), context());
  assertEquals(completed.resultReference, "delivery_receipt_worker-delivery");
  assertEquals(transport.sent.length, 1);
  assertEquals(transport.sent[0]?.logicalDeliveryId, "delivery_request_worker");
});
