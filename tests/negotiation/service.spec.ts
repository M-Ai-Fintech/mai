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
  await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 1, "idem_mandate"),
    mandate,
  );
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
        recipientId: "counterparty_buyer",
        purpose: "negotiation_proposal",
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
  await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 1, "idem_delivery-mandate"),
    {
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
    },
  );
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
      recipientId: "counterparty_buyer",
      purpose: "negotiation_proposal",
    },
  );
  assertEquals(delivered.round.deliveryRequests[0]?.status, "queued");
  assertEquals(delivered.round.deliveryReceipts[0]?.state, "pending");
  assertEquals(jobs.length, 1);
  assertEquals(
    (jobs[0] as { readonly proposalVersionId: string }).proposalVersionId,
    "proposal_version_delivery-1",
  );
});

Deno.test("counterproposal supersedes the replied proposal for approval", async () => {
  const { negotiation } = service();
  await negotiation.createRound({
    context: contextFor(),
    scope,
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    number: 1,
    actor: actor(),
    idempotencyKey: "idem_supersede-create" as never,
  });
  await negotiation.openRound(command(actor(), 1, "idem_supersede-open"));
  await negotiation.createProposal(command(actor(), 2, "idem_supersede-a"), {
    proposalId: "proposal_a",
    fromParty: "buyer",
    terms: negotiationTerms,
    origin: "human",
  });
  await negotiation.submitProposal(
    command(actor(), 3, "idem_supersede-submit-a"),
    "proposal_a",
  );
  const countered = await negotiation.counterProposal(
    command(actor("actor_bob"), 4, "idem_supersede-b"),
    {
      proposalId: "proposal_b",
      fromParty: "seller",
      terms: negotiationTerms,
      origin: "human",
      inReplyToProposalId: "proposal_a",
    },
  );
  assertEquals(countered.round.currentProposalId, "proposal_b");
  assertEquals(countered.round.proposals[0]?.status, "superseded");
  await assertRejects(
    () =>
      negotiation.requestApproval(
        command(actor(), 5, "idem_supersede-approval-a"),
        {
          proposalId: "proposal_a",
          approvalId: "negotiation_approval_a",
          namedApproverId: "actor_bob" as never,
        },
      ),
    NegotiationError,
    "superseded",
  );
});

Deno.test("only a human authority command can establish an active mandate", async () => {
  const authority: ConsumedNegotiationAuthority = {
    actor: Object.freeze(actor("actor_alice")),
    proof: {
      proofId: "authority_proof_mandate-human",
      proofVersion: 1,
      evaluationId: "evaluation_mandate-human",
      evaluationDigest: "1".repeat(64),
      proofDigest: "2".repeat(64),
    },
    dispatchId: "work_target_mandate-human",
    idempotencyIdentity: "mandate-human",
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
    idempotencyKey: "idem_mandate-authority-create" as never,
  });
  const mandate = {
    mandateId: "mandate_authority",
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
  assertThrows(
    () =>
      negotiation.setMandate(
        authorityCommand(actor("agent_copilot", "ai"), 1, "idem_mandate-ai"),
        mandate,
      ),
    NegotiationError,
    "active human",
  );
  const result = await negotiation.setMandate(
    authorityCommand(actor(), 1, "idem_mandate-human"),
    mandate,
  );
  assertEquals(result.round.internal?.mandate?.status, "active");
  assertEquals(
    result.round.internal?.mandateAuthorityProofId,
    "authority_proof_mandate-human",
  );
});

Deno.test("mandate replacement invalidates an existing approval", async () => {
  const authority: ConsumedNegotiationAuthority = {
    actor: Object.freeze(actor("actor_bob")),
    proof: {
      proofId: "authority_proof_mandate-replace",
      proofVersion: 1,
      evaluationId: "evaluation_mandate-replace",
      evaluationDigest: "3".repeat(64),
      proofDigest: "4".repeat(64),
    },
    dispatchId: "work_target_mandate-replace",
    idempotencyIdentity: "mandate-replace",
  };
  const { negotiation } = service({
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
    idempotencyKey: "idem_replace-create" as never,
  });
  const mandate = {
    mandateId: "mandate_replace-one",
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
  await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 1, "idem_replace-mandate-one"),
    mandate,
  );
  await negotiation.createProposal(command(actor(), 2, "idem_replace-draft"), {
    proposalId: "proposal_replace",
    fromParty: "buyer",
    terms: negotiationTerms,
    origin: "human",
  });
  await negotiation.submitProposal(
    command(actor(), 3, "idem_replace-submit"),
    "proposal_replace",
  );
  await negotiation.requestApproval(
    command(actor(), 4, "idem_replace-request"),
    {
      proposalId: "proposal_replace",
      approvalId: "negotiation_approval_replace",
      namedApproverId: "actor_bob" as never,
    },
  );
  const approved = await negotiation.approveProposal(
    {
      ...authorityCommand(actor("actor_bob"), 5, "idem_replace-approve"),
      expectedProposalVersion: 2 as never,
    },
    "proposal_replace",
    "negotiation_approval_replace",
  );
  assertEquals(approved.round.approvals[0]?.status, "approved");
  const replaced = await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 6, "idem_replace-mandate-two"),
    { ...mandate, mandateId: "mandate_replace-two" },
  );
  assertEquals(replaced.round.approvals[0]?.status, "invalidated");
  await assertRejects(
    () =>
      negotiation.requestDelivery(
        {
          ...authorityCommand(actor("actor_bob"), 7, "idem_replace-delivery"),
          expectedProposalVersion: 2 as never,
        },
        {
          proposalId: "proposal_replace",
          approvalId: "negotiation_approval_replace",
          recipientId: "counterparty_buyer",
          purpose: "negotiation_proposal",
        },
      ),
    NegotiationError,
    "approved",
  );
});

Deno.test("idempotency conflicts when semantic mandate input changes", async () => {
  const authority: ConsumedNegotiationAuthority = {
    actor: Object.freeze(actor("actor_bob")),
    proof: {
      proofId: "authority_proof_idempotency-mandate",
      proofVersion: 1,
      evaluationId: "evaluation_idempotency-mandate",
      evaluationDigest: "5".repeat(64),
      proofDigest: "6".repeat(64),
    },
    dispatchId: "work_target_idempotency-mandate",
    idempotencyIdentity: "idempotency-mandate",
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
    idempotencyKey: "idem_semantic-mandate-create" as never,
  });
  const firstMandate = {
    mandateId: "mandate_semantic",
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
  await negotiation.setMandate(
    authorityCommand(actor("actor_bob"), 1, "idem_semantic-mandate"),
    firstMandate,
  );
  await assertRejects(
    () =>
      negotiation.setMandate(
        authorityCommand(actor("actor_bob"), 1, "idem_semantic-mandate"),
        {
          ...firstMandate,
          constraints: [{
            ...firstMandate.constraints[0],
            value: 90_000,
          }],
        },
      ),
    NegotiationError,
    "IDEMPOTENCY_CONFLICT",
  );
});

Deno.test("terminal rounds reject ordinary negotiation mutations centrally", async () => {
  const { negotiation } = service();
  await negotiation.createRound({
    context: contextFor(),
    scope,
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    number: 1,
    actor: actor(),
    idempotencyKey: "idem_terminal-create" as never,
  });
  await negotiation.openRound(command(actor(), 1, "idem_terminal-open"));
  const closed = await negotiation.closeRound(
    command(actor(), 2, "idem_terminal-close"),
  );
  assertEquals(closed.round.status, "closed");
  await assertRejects(
    () =>
      negotiation.recordBatna(
        command(actor(), 3, "idem_terminal-batna"),
        {
          side: "buyer",
          alternatives: [{ id: "alternative_terminal", label: "walk away" }],
        },
      ),
    NegotiationError,
    "terminal",
  );
  await assertRejects(
    () =>
      negotiation.createProposal(
        command(actor(), 3, "idem_terminal-proposal"),
        {
          proposalId: "proposal_terminal",
          fromParty: "buyer",
          terms: negotiationTerms,
          origin: "human",
        },
      ),
    NegotiationError,
    "terminal",
  );
});
