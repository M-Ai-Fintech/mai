import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  action,
  authoritySnapshotReference,
  type AuthorizationDecision,
} from "../../../src/platform/authz/v1.ts";
import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "../../../src/work_management/approval_package_factory.ts";
import { createInMemoryWorkManagementTestComposition } from "../../../src/work_management/composition.ts";
import {
  actor,
  deal,
  targetCommandType,
  tenant,
  type WorkScope,
  workspace,
} from "../../../src/work_management/ids.ts";
import {
  type EvidenceSnapshotReference,
  type TargetReference,
  WorkManagementError,
} from "../../../src/work_management/model.ts";
import { WorkManagementV1Application } from "../../../src/api/v1/work_management.ts";
import { handleWorkManagementV1Route } from "../../../src/api/v1/work_management_routes.ts";

const scope: WorkScope = {
  tenantId: tenant("tenant_api-security"),
  workspaceId: workspace("workspace_api-security"),
  dealId: deal("deal_api-security"),
};
const human = {
  id: actor("actor_api-requester"),
  kind: "human" as const,
  state: "active" as const,
};
const approverId = actor("actor_api-approver");
const context = {
  actorId: human.id,
  ...scope,
  correlationId:
    "cor_api_security" as import("../../../src/platform/api/v1.ts").CorrelationId,
  origin: "http" as const,
};

Deno.test("approval HTTP boundary rejects requester and authority spoofing", async () => {
  for (
    const forged of [
      { requesterId: actor("actor_spoofed") },
      { authoritySnapshot: { snapshotId: "forged" } },
      { policyVersion: "forged" },
      { package: { contentDigest: "0".repeat(64) } },
    ]
  ) {
    const response = await request({ ...validBody("spoof"), ...forged });
    assertEquals(response.status, 422);
    assertStringIncludes(await response.text(), "server-owned");
  }
});

Deno.test("approval HTTP action is only a requested selector", async () => {
  const response = await request({
    ...validBody("requested-action"),
    action: "reject_evidence",
  });
  assertEquals(response.status, 403);
});

Deno.test("approval HTTP creation requires a bounded requested action", async () => {
  const response = await request({
    ...validBody("missing-action"),
    action: undefined,
  });
  assertEquals(response.status, 422);
  assertStringIncludes(await response.text(), "VALIDATION_FAILED");
});

Deno.test("approval HTTP boundary rejects tampering and malformed nested values", async () => {
  const tampered = await request({
    ...validBody("tampered"),
    payload: { summary: "modified" },
    contentDigest: "0".repeat(64),
  });
  assertEquals(tampered.status, 409);
  assertStringIncludes(await tampered.text(), "STALE_VERSION");
  const malformed = await request({
    ...validBody("malformed"),
    payload: "not-an-object",
  });
  assertEquals(malformed.status, 422);
  assertStringIncludes(await malformed.text(), "payload");
});

Deno.test("approval HTTP boundary validates approver and evidence through trusted ports", async () => {
  const mismatch = await request(
    validBody("mismatch"),
    new TrustedAuthorityPort(actor("actor_wrong-api-approver")),
  );
  assertEquals(mismatch.status, 403);
  assertStringIncludes(await mismatch.text(), "ACTION_FORBIDDEN");
  const crossDeal = await request({
    ...validBody("cross-deal"),
    evidence: [{
      sourceType: "document",
      sourceId: "cross-deal",
      sourceVersion: "1",
    }],
  });
  assertEquals(crossDeal.status, 403);
  assertStringIncludes(await crossDeal.text(), "ACTION_FORBIDDEN");
});

Deno.test("approval HTTP boundary creates from authenticated human identity", async () => {
  const response = await request(validBody("valid"));
  assertEquals(response.status, 201);
  assertEquals(response.headers.get("ETag"), '"v1"');
  const body = await response.text();
  assertStringIncludes(body, "approval_valid");
  assertEquals(body.includes("requesterId"), false);
  assertEquals(body.includes("authoritySnapshot"), false);
  assertEquals(body.includes("package"), false);
});

async function request(
  body: Record<string, unknown>,
  authority: ApprovalAuthoritySnapshotPort = new TrustedAuthorityPort(
    approverId,
  ),
): Promise<Response> {
  const composition = createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allow },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: new TrustedTargetPort(),
    evidence: new TrustedEvidencePort(),
    authority,
  });
  const response = await handleWorkManagementV1Route(
    new Request("http://localhost/api/v1/work-management/approval-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `idem_${String(body.id).slice("approval_".length)}`,
      },
      body: JSON.stringify(body),
    }),
    {
      context: { contextFor: () => ({ context, actor: human }) },
      application: new WorkManagementV1Application(composition.service),
    },
  );
  if (response === null) {
    throw new Error("Expected Work Management route response.");
  }
  return response;
}

function validBody(suffix: string): Record<string, unknown> {
  return {
    id: `approval_${suffix}`,
    namedApproverId: approverId,
    action: "approve_evidence",
    target: {
      aggregateType: "evidence",
      aggregateId: `evidence_${suffix}`,
      expectedVersion: 1,
    },
    evidence: [{
      sourceType: "document",
      sourceId: `document_${suffix}`,
      sourceVersion: "1",
      checksum: "a".repeat(64),
    }],
    payload: { summary: "review" },
  };
}

class TrustedTargetPort implements ApprovalTargetPort {
  validate(
    expected: WorkScope,
    target: TargetReference,
  ): Promise<TargetReference> {
    if (target.scope.dealId !== expected.dealId) {
      return Promise.reject(
        new WorkManagementError(
          "SCOPE_MISMATCH",
          "Target is cross-Deal; expected exact scope.",
        ),
      );
    }
    return Promise.resolve(target);
  }

  currentVersion(target: TargetReference) {
    return Promise.resolve(target.expectedVersion);
  }
}

class TrustedEvidencePort implements ApprovalEvidencePort {
  validate(
    _expected: WorkScope,
    evidence: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]> {
    if (evidence.some((item) => item.sourceId === "cross-deal")) {
      return Promise.reject(
        new WorkManagementError(
          "REFERENCE_MISMATCH",
          "Evidence is cross-Deal; expected exact scope.",
        ),
      );
    }
    return Promise.resolve(evidence);
  }
}

class TrustedAuthorityPort implements ApprovalAuthoritySnapshotPort {
  constructor(
    private readonly actorId:
      import("../../../src/work_management/ids.ts").ActorId,
  ) {}

  resolve(input: Parameters<ApprovalAuthoritySnapshotPort["resolve"]>[0]) {
    const snapshot = {
      snapshotId: "authority-snapshot-api-v1",
      actorId: this.actorId,
      actorKind: "human" as const,
      policyVersion: "policy-api-v1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope: input.scope,
    };
    return Promise.resolve({
      requirement: {
        commandType: targetCommandType("approve_evidence"),
        target: input.target,
        namedApproverId: this.actorId,
        policyVersion: snapshot.policyVersion,
        snapshotReference: snapshot.snapshotId,
        scope: input.scope,
        effectiveAt: "2026-08-06T11:00:00.000Z",
        expiresAt: "2026-08-06T13:00:00.000Z",
        applicableLimits: [{ name: "max_amount", value: 1_000_000 }],
        humanOnly: true as const,
      },
      snapshot,
    });
  }
}

function allow(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [action("create")],
    approvedScope: undefined as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
    authoritySnapshotReference: authoritySnapshotReference(
      "authority-snapshot-api-v1",
    ),
  };
}
