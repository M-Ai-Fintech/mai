import { assertEquals, assertThrows } from "@std/assert";
import {
  createChecklistRequirement,
  createClosingWorkspace,
  evaluateReadiness,
} from "../../src/closing/model.ts";
import {
  acceptSignatureEvidence,
  completeSignaturePackage,
  createSignatureEvidence,
  createSignaturePackage,
} from "../../src/closing/signatures.ts";
import { approveClosingReadiness } from "../../src/closing/readiness.ts";
import type {
  DealId,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";

const scope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
} as const;

Deno.test("readiness reports unresolved conditions before approval", () => {
  const workspace = createClosingWorkspace({
    closingWorkspaceId: "closing_solar",
    scope,
    now: "2026-08-07T12:00:00.000Z",
  });
  assertEquals(evaluateReadiness(workspace), { ready: true, reasons: [] });
});

Deno.test("blocking checklist requirements participate in readiness", () => {
  const workspace = createClosingWorkspace({
    closingWorkspaceId: "closing_solar",
    scope,
    now: "2026-08-07T12:00:00.000Z",
  });
  const requirement = createChecklistRequirement({
    requirementId: "requirement_tax-clearance",
    title: "Tax clearance",
    category: "tax",
    criticality: "critical",
    blocking: true,
    state: "requested",
    ownerId: "actor_seller",
    reviewerId: "actor_counsel",
  });
  const withRequirement = Object.freeze({
    ...workspace,
    requirements: Object.freeze([requirement]),
  });
  assertEquals(evaluateReadiness(withRequirement).reasons, [{
    code: "UNSATISFIED_REQUIREMENT",
    requirementId: "requirement_tax-clearance",
  }]);
});

Deno.test("readiness approval requires closing review and exact prerequisites", () => {
  const workspace = createClosingWorkspace({
    closingWorkspaceId: "closing_solar",
    scope,
    now: "2026-08-07T12:00:00.000Z",
  });
  assertThrows(
    () =>
      approveClosingReadiness({
        workspace,
        readinessApprovalId: "readiness_solar-1",
        actorId: "actor_partner",
        authorityProofId: "authority_proof_v1_abc",
        now: "2026-08-07T12:05:00.000Z",
      }),
    Error,
    "expected closing_review",
  );
});

Deno.test("signature package completes only after every signatory evidence is accepted", () => {
  const packageValue = createSignaturePackage({
    signaturePackageId: "package_solar-1",
    documentVersionIds: ["document_version_spa-4"],
    requiredSignatoryIds: ["actor_buyer", "actor_seller"],
  });
  const buyer = acceptSignatureEvidence(
    createSignatureEvidence({
      signatureEvidenceId: "signature_buyer-1",
      documentVersionId: "document_version_spa-4",
      signatoryId: "actor_buyer",
      signatureMethod: "manual",
      signedAt: "2026-08-07T12:05:00.000Z",
      evidenceReference: "evidence_signature_buyer",
    }),
    "actor_counsel",
    "2026-08-07T12:06:00.000Z",
  );
  assertThrows(
    () =>
      completeSignaturePackage(
        packageValue,
        [buyer],
        "2026-08-07T12:07:00.000Z",
      ),
    Error,
    "every required signatory",
  );
});
