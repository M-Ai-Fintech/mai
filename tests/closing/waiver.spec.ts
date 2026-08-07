import { assertEquals, assertThrows } from "@std/assert";
import {
  approveWaiver,
  confirmWaiverLegalReview,
  createWaiver,
} from "../../src/closing/waivers.ts";

const input = {
  waiverId: "waiver_tax-1",
  conditionId: "condition_tax-clearance" as never,
  scope: "temporary" as const,
  proposedBy: "actor_seller",
  beneficiary: "actor_buyer",
  reason: "Commercial timing exception",
  residualRisk: "Counsel will obtain the certificate post-closing",
  requiredApprovalIds: ["approval_counsel-1"],
  approvalAuthority: "counsel",
};

Deno.test("waiver requires legal review and separation of duties", () => {
  const proposed = createWaiver(input);
  const reviewed = confirmWaiverLegalReview(proposed);
  const approved = approveWaiver(
    reviewed,
    "actor_counsel",
    "2026-08-07T12:00:00.000Z",
  );
  assertEquals(approved.status, "approved");
  assertEquals(approved.legalReviewState, "confirmed");
  assertThrows(
    () => approveWaiver(reviewed, input.proposedBy, "2026-08-07T12:00:00.000Z"),
    Error,
    "cannot approve",
  );
});

Deno.test("waiver rejects an empty approval set", () => {
  assertThrows(
    () => createWaiver({ ...input, requiredApprovalIds: [] }),
    Error,
    "no required approvals",
  );
});
