import { assertEquals, assertRejects } from "@std/assert";
import { createInMemoryWorkManagementTestComposition } from "../../src/work_management/composition.ts";
import {
  actor,
  aggregateVersion,
  approvalRequestId,
} from "../../src/work_management/ids.ts";
import {
  allow,
  approver,
  command,
  composition,
  context,
  ExactTargetPort,
  NamedAuthorityPort,
  openRequest,
  requester,
  restrictiveProjection,
  scope,
  ScopedEvidencePort,
  StaleTargetPort,
  target,
} from "./approval_test_support.ts";

Deno.test("server-trusted approval creation, semantic events, and dispatch are replay-safe", async () => {
  const fixture = composition();
  const request = await fixture.service.createApprovalRequest({
    ...command(
      approvalRequestId("approval_trusted"),
      "create-trusted",
      requester,
    ),
    namedApproverId: approver.id,
    action: "approve_evidence",
    target: target(),
    evidence: [{
      sourceType: "document",
      sourceId: "document_one",
      sourceVersion: "7",
    }],
    payload: { summary: "review", nested: { amount: 10 } },
  });
  assertEquals(request.requesterId, requester.id);
  assertEquals(request.package.authoritySnapshot.actorId, approver.id);
  assertEquals(request.state, "draft");
  const opened = await fixture.service.openApprovalRequest({
    ...command(request.id, "open-trusted", requester, 1),
  });
  const approved = await fixture.service.decideApprovalRequest({
    ...command(opened.id, "approve-trusted", approver, 2),
    outcome: "approved",
    reason: "Verified",
  });
  const replay = await fixture.service.decideApprovalRequest({
    ...command(opened.id, "approve-trusted", approver, 2),
    outcome: "approved",
    reason: "Verified",
  });
  assertEquals(replay, approved);
  const history = await fixture.repository.listHistory(
    scope,
    "approval_request",
    request.id,
  );
  assertEquals(history.map((event) => event.eventType), [
    "approval.draft_created",
    "approval.requested",
    "approval.approved",
  ]);
  assertEquals(history[0].payload.notification, undefined);
  assertEquals(history[1].payload.notification, {
    notificationType: "approval_request_opened",
    eventType: "approval.requested",
    approvalRequestId: request.id,
    approvalRequestVersion: aggregateVersion(2),
    recipientId: approver.id,
    title: "Approval request requires review",
    body: `Approval request ${request.id} is ready for review.`,
  });
  assertEquals(history[2].payload.notification, undefined);
  const serialized = JSON.stringify(history[1].payload.notification);
  for (
    const restricted of [
      "target",
      "evidence",
      "authority",
      "rationale",
      "payload",
    ]
  ) {
    assertEquals(serialized.includes(restricted), false);
  }
  const dispatches = await fixture.repository.listTargetCommands(
    scope,
    request.id,
  );
  assertEquals(dispatches.length, 1);
  assertEquals(dispatches[0].decisionId, approved.decision?.id);
  assertEquals(dispatches[0].expectedTargetVersion, target().expectedVersion);
  assertEquals(dispatches[0].packageDigest, request.package.contentDigest);
});

Deno.test("rejected, stale, and AI approval commands never dispatch", async () => {
  const fixture = composition();
  const draft = await fixture.service.createApprovalRequest({
    ...command(
      approvalRequestId("approval_rejected"),
      "create-rejected",
      requester,
    ),
    namedApproverId: approver.id,
    action: "approve_evidence",
    target: target(),
    evidence: [],
    payload: { summary: "review" },
  });
  const opened = await fixture.service.openApprovalRequest({
    ...command(draft.id, "open-rejected", requester, 1),
  });
  await fixture.service.decideApprovalRequest({
    ...command(opened.id, "reject-trusted", approver, 2),
    outcome: "rejected",
  });
  assertEquals(
    (await fixture.repository.listTargetCommands(scope, draft.id)).length,
    0,
  );
  const staleFixture = createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allow },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: new StaleTargetPort(),
    evidence: new ScopedEvidencePort(),
    authority: new NamedAuthorityPort(approver.id),
  });
  const stale = await openRequest(staleFixture.service, "stale-target");
  await assertRejects(
    () =>
      staleFixture.service.decideApprovalRequest({
        ...command(stale.id, "stale-decision", approver, stale.version),
        outcome: "approved",
      }),
    Error,
    "differs from package version",
  );
  assertEquals(
    (await staleFixture.repository.listTargetCommands(scope, stale.id)).length,
    0,
  );
  const ai = {
    id: actor("actor_ai-service"),
    kind: "ai" as const,
    state: "active" as const,
  };
  await assertRejects(
    () =>
      fixture.service.createApprovalRequest({
        ...command(approvalRequestId("approval_ai-denied"), "create-ai", ai),
        namedApproverId: approver.id,
        action: "approve_evidence",
        target: target(),
        evidence: [],
        payload: {},
      }),
    Error,
    "active human",
  );
});

Deno.test("approval package rejects spoofed digest, cross-Deal evidence, and authority mismatch", async () => {
  const fixture = composition();
  await assertRejects(
    () =>
      fixture.service.createApprovalRequest({
        ...command(
          approvalRequestId("approval_digest"),
          "create-digest",
          requester,
        ),
        namedApproverId: approver.id,
        action: "approve_evidence",
        target: target(),
        evidence: [],
        payload: { changed: true },
        claimedDigest: "0".repeat(64),
      }),
    Error,
    "does not match",
  );
  await assertRejects(
    () =>
      fixture.service.createApprovalRequest({
        ...command(
          approvalRequestId("approval_cross-deal"),
          "create-cross",
          requester,
        ),
        namedApproverId: approver.id,
        action: "approve_evidence",
        target: target(),
        evidence: [{
          sourceType: "document",
          sourceId: "cross-deal",
          sourceVersion: "1",
        }],
        payload: {},
      }),
    Error,
    "cross-Deal",
  );
  const badAuthority = composition(
    new NamedAuthorityPort(actor("actor_wrong-approver")),
  );
  await assertRejects(
    () =>
      badAuthority.service.createApprovalRequest({
        ...command(
          approvalRequestId("approval_authority"),
          "create-authority",
          requester,
        ),
        namedApproverId: approver.id,
        action: "approve_evidence",
        target: target(),
        evidence: [],
        payload: {},
      }),
    Error,
    "does not match",
  );
});

Deno.test("approval terminal events never reuse the review notification", async () => {
  const fixture = composition();
  const rejected = await openRequest(fixture.service, "event-rejected");
  await fixture.service.decideApprovalRequest({
    ...command(rejected.id, "event-reject", approver, rejected.version),
    outcome: "rejected",
  });
  const withdrawn = await openRequest(fixture.service, "event-withdrawn");
  await fixture.service.withdrawApprovalRequest({
    ...command(withdrawn.id, "event-withdraw", requester, withdrawn.version),
  });
  const expired = await openRequest(fixture.service, "event-expired");
  await fixture.service.expireApprovalRequest({
    ...command(expired.id, "event-expire", requester, expired.version),
  });
  const invalidated = await openRequest(fixture.service, "event-invalidated");
  await fixture.service.invalidateApprovalRequest({
    ...command(
      invalidated.id,
      "event-invalidate",
      requester,
      invalidated.version,
    ),
    reason: "Dependency changed",
  });
  const expected = new Map([
    [rejected.id, "approval.rejected"],
    [withdrawn.id, "approval.withdrawn"],
    [expired.id, "approval.expired"],
    [invalidated.id, "approval.invalidated"],
  ]);
  for (const [requestId, eventType] of expected) {
    const history = await fixture.repository.listHistory(
      scope,
      "approval_request",
      requestId,
    );
    assertEquals(history.at(-1)?.eventType, eventType);
    assertEquals(history.at(-1)?.payload.notification, undefined);
    assertEquals(
      (await fixture.repository.listTargetCommands(scope, requestId)).length,
      0,
    );
  }
});

Deno.test("approval read DTO never serializes fields outside the final mask", async () => {
  let restrictiveRead = false;
  const fixture = createInMemoryWorkManagementTestComposition({
    authorization: {
      authorize: () => restrictiveRead ? restrictiveProjection() : allow(),
    },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: new ExactTargetPort(),
    evidence: new ScopedEvidencePort(),
    authority: new NamedAuthorityPort(approver.id),
  });
  const request = await fixture.service.createApprovalRequest({
    ...command(
      approvalRequestId("approval_projection-safe"),
      "projection-safe",
      requester,
    ),
    namedApproverId: approver.id,
    action: "approve_evidence",
    target: target(),
    evidence: [{
      sourceType: "document",
      sourceId: "document_secret",
      sourceVersion: "1",
    }],
    payload: { secret: "package-secret" },
  });
  restrictiveRead = true;
  const result = await fixture.service.getApprovalRequest({
    context,
    actor: requester,
    scope,
    id: request.id,
  });
  assertEquals(result.kind, "loaded");
  if (result.kind === "loaded") {
    assertEquals(result.value.id, request.id);
    assertEquals(result.value.workflowState, "draft");
    const serialized = JSON.stringify(result.value);
    for (
      const secret of [
        "package-secret",
        "document_secret",
        requester.id,
        approver.id,
        "authority-snapshot-v1",
        "evidence_one",
      ]
    ) {
      assertEquals(serialized.includes(secret), false);
    }
  }
});
