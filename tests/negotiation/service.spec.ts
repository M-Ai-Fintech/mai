import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { InMemoryNegotiationEffects } from "../../src/negotiation/effects.ts";
import { NegotiationError } from "../../src/negotiation/model.ts";
import { InMemoryNegotiationUnitOfWork } from "../../src/negotiation/repository.ts";
import { NegotiationService } from "../../src/negotiation/service.ts";
import type { ConsumedNegotiationAuthority } from "../../src/negotiation/authority.ts";
import { createNormalizedTerms } from "../../src/negotiation/terms.ts";
import {
  actor,
  AllowingNegotiationAuthorization,
  contextFor,
  scope,
} from "./support.ts";

const now = "2026-08-08T12:00:00.000Z";
const negotiationTerms = createNormalizedTerms({
  currency: "USD",
  valuation: { minorUnits: 100_000, currency: "USD" },
});

function command(
  actorValue = actor(),
  expectedVersion = 1,
  idempotencyKey = "idem_command-1",
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

function service(options: {
  readonly authority?: {
    consume(input: unknown): Promise<ConsumedNegotiationAuthority>;
  };
  readonly deliveryEnabled?: boolean;
  readonly scheduler?: {
    enqueue(transaction: unknown, job: unknown): Promise<void>;
  };
} = {}) {
  const unitOfWork = new InMemoryNegotiationUnitOfWork();
  const effects = new InMemoryNegotiationEffects();
  const authorization = new AllowingNegotiationAuthorization();
  const jobs: unknown[] = [];
  const negotiation = new NegotiationService({
    unitOfWork,
    effects,
    authorization,
    clock: { now: () => now },
    authority: options.authority,
    deliveryFeatureGate: {
      deliveryEnabled: () => options.deliveryEnabled ?? false,
    },
    jobScheduler: options.scheduler ?? {
      enqueue: (_transaction, job) => {
        jobs.push(job);
        return Promise.resolve();
      },
    },
  });
  return { negotiation, unitOfWork, effects, authorization, jobs };
}

Deno.test("negotiation service keeps draft/recommendation and submission authority distinct", async () => {
  const { negotiation, effects } = service();
  const created = await negotiation.createRound({
    context: contextFor(),
    scope,
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    number: 1,
    actor: actor(),
    idempotencyKey: "idem_create-round" as never,
  });
  assertEquals(created.round.status, "draft");
  const opened = await negotiation.openRound(
    command(actor(), 1, "idem_open-round"),
  );
  assertEquals(opened.round.status, "open");
  const draft = await negotiation.createProposal(
    command(actor(), 2, "idem_draft"),
    {
      proposalId: "proposal_solar",
      fromParty: "buyer",
      terms: negotiationTerms,
      origin: "human",
    },
  );
  assertEquals(draft.round.proposals[0].status, "draft");
  const replay = await negotiation.openRound(
    command(actor(), 1, "idem_open-round"),
  );
  assertEquals(replay.replayed, true);
  assertEquals(replay.round.version, 2);
  assertThrows(
    () =>
      negotiation.submitProposal(
        command(actor("agent_copilot", "ai"), 3, "idem_agent-submit"),
        "proposal_solar",
      ),
    NegotiationError,
    "active human",
  );
  const submitted = await negotiation.submitProposal(
    command(actor(), 3, "idem_submit"),
    "proposal_solar",
  );
  assertEquals(submitted.round.proposals[0].status, "submitted");
  assertEquals(submitted.round.proposals[0].versions[0].status, "submitted");
  await assertRejects(
    () =>
      negotiation.createProposal(command(actor(), 1, "idem_stale"), {
        proposalId: "proposal_stale",
        fromParty: "seller",
        terms: negotiationTerms,
        origin: "human",
      }),
    NegotiationError,
    "stale",
  );
  assertEquals(
    effects.effects.filter((effect) => effect.kind === "audit").length,
    4,
  );
});

Deno.test("negotiation approval consumes mandate comparison and separate human authority", async () => {
  const authority: ConsumedNegotiationAuthority = {
    actor: Object.freeze(actor("actor_bob")),
    proof: {
      proofId: "authority_proof_test",
      proofVersion: 1,
      evaluationId: "evaluation_test",
      evaluationDigest: "a".repeat(64),
      proofDigest: "b".repeat(64),
    },
    dispatchId: "work_target_command_test",
    idempotencyIdentity:
      "tenant_alpha|workspace_main|deal_solar|actor_bob|approve_approval_request|approval_test|idem_approve",
  };
  const { negotiation } = service({
    authority: { consume: () => Promise.resolve(authority) },
  });
  await negotiation.createRound({
    context: contextFor(),
    scope,
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    number: 1,
    actor: actor(),
    idempotencyKey: "idem_create-round" as never,
  });
  const mandate = {
    mandateId: "mandate_solar",
    scope,
    constraints: [{
      id: "valuation-floor",
      key: "valuation" as const,
      operator: "minimum" as const,
      value: 100_000,
      unit: "minor_units" as const,
      mandatory: true,
      source: "human-mandate",
    }],
    status: "active" as const,
    now,
  };
  await negotiation.setMandate(command(actor(), 1, "idem_mandate"), mandate);
  await negotiation.createProposal(command(actor(), 2, "idem_draft"), {
    proposalId: "proposal_solar",
    fromParty: "buyer",
    terms: negotiationTerms,
    origin: "human",
  });
  await negotiation.submitProposal(
    command(actor(), 3, "idem_submit"),
    "proposal_solar",
  );
  const requested = await negotiation.requestApproval(
    command(actor(), 4, "idem_request-approval"),
    {
      proposalId: "proposal_solar",
      approvalId: "negotiation_approval_solar",
      namedApproverId: "actor_bob" as never,
    },
  );
  assertEquals(requested.round.approvals[0].status, "pending");
  const approved = await negotiation.approveProposal(
    {
      ...command(actor("actor_bob"), 5, "idem_approve"),
      authority: {
        protectedCommand: { opaque: true },
        resolver: { resolve: () => Promise.resolve(undefined) },
      },
      expectedProposalVersion: 2 as never,
    },
    "proposal_solar",
    "negotiation_approval_solar",
  );
  assertEquals(approved.round.approvals[0].status, "approved");
  assertEquals(approved.round.proposals[0].status, "submitted");
  assert(approved.round.approvals[0].authorityProof !== undefined);
});

Deno.test("delivery remains disabled until independently authorized and feature-gated", () => {
  const authority: ConsumedNegotiationAuthority = {
    actor: Object.freeze(actor("actor_bob")),
    proof: {
      proofId: "authority_proof_delivery",
      proofVersion: 1,
      evaluationId: "evaluation_delivery",
      evaluationDigest: "c".repeat(64),
      proofDigest: "d".repeat(64),
    },
    dispatchId: "work_target_command_delivery",
    idempotencyIdentity:
      "tenant_alpha|workspace_main|deal_solar|actor_bob|request|delivery|idem_delivery",
  };
  const disabled = service({
    authority: { consume: () => Promise.resolve(authority) },
  });
  assertThrows(
    () =>
      disabled.negotiation.requestDelivery({
        ...command(actor("actor_bob"), 1, "idem_delivery"),
        authority: {
          protectedCommand: {},
          resolver: { resolve: () => Promise.resolve(undefined) },
        },
      }, {
        proposalId: "proposal_solar",
        approvalId: "negotiation_approval_solar",
      }),
    NegotiationError,
    "disabled",
  );
});

Deno.test("enabled delivery records one exact proposal-version job and receipt", async () => {
  const authority: ConsumedNegotiationAuthority = {
    actor: Object.freeze(actor("actor_bob")),
    proof: {
      proofId: "authority_proof_delivery-enabled",
      proofVersion: 1,
      evaluationId: "evaluation_delivery-enabled",
      evaluationDigest: "e".repeat(64),
      proofDigest: "f".repeat(64),
    },
    dispatchId: "work_target_command_delivery-enabled",
    idempotencyIdentity: "delivery-enabled",
  };
  const { negotiation, jobs } = service({
    authority: { consume: () => Promise.resolve(authority) },
    deliveryEnabled: true,
  });
  await negotiation.createRound({
    context: contextFor(),
    scope,
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    number: 1,
    actor: actor(),
    idempotencyKey: "idem_create-delivery-round" as never,
  });
  await negotiation.setMandate(command(actor(), 1, "idem_delivery-mandate"), {
    mandateId: "mandate_delivery",
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
  });
  await negotiation.createProposal(command(actor(), 2, "idem_delivery-draft"), {
    proposalId: "proposal_delivery",
    fromParty: "buyer",
    terms: negotiationTerms,
    origin: "human",
  });
  await negotiation.submitProposal(
    command(actor(), 3, "idem_delivery-submit"),
    "proposal_delivery",
  );
  await negotiation.requestApproval(
    command(actor(), 4, "idem_delivery-approval-request"),
    {
      proposalId: "proposal_delivery",
      approvalId: "negotiation_approval_delivery",
      namedApproverId: "actor_bob" as never,
    },
  );
  await negotiation.approveProposal(
    {
      ...command(actor("actor_bob"), 5, "idem_delivery-approve"),
      authority: {
        protectedCommand: { opaque: true },
        resolver: { resolve: () => Promise.resolve(undefined) },
      },
      expectedProposalVersion: 2 as never,
    },
    "proposal_delivery",
    "negotiation_approval_delivery",
  );
  const delivered = await negotiation.requestDelivery(
    {
      ...command(actor("actor_bob"), 6, "idem_delivery-request"),
      authority: {
        protectedCommand: { opaque: true },
        resolver: { resolve: () => Promise.resolve(undefined) },
      },
      expectedProposalVersion: 2 as never,
    },
    {
      proposalId: "proposal_delivery",
      approvalId: "negotiation_approval_delivery",
      deliveryRequestId: "delivery_request_solar",
    },
  );
  assertEquals(delivered.round.deliveryRequests[0]?.status, "requested");
  assertEquals(delivered.round.deliveryReceipts[0]?.state, "pending");
  assertEquals(jobs.length, 1);
  assertEquals(
    (jobs[0] as { readonly proposalVersionId: string }).proposalVersionId,
    "proposal_version_delivery-1",
  );
});
