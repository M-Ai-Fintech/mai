import { assertEquals, assertThrows } from "@std/assert";
import {
  acceptConditionEvidence,
  createCondition,
  satisfyCondition,
  submitConditionEvidence,
} from "../../src/closing/conditions.ts";

const baseInput = {
  conditionId: "condition_tax-clearance",
  requirementId: "requirement_tax-clearance",
  title: "Current tax-clearance certificate",
  category: "tax",
  responsiblePartyId: "party_seller",
  reviewerId: "actor_counsel",
  now: "2026-08-07T12:00:00.000Z",
};

Deno.test("submitted evidence is not automatically condition satisfaction", () => {
  const condition = createCondition(baseInput);
  const submitted = submitConditionEvidence(condition, {
    evidenceId: "evidence_tax-1",
    sourceType: "document_version",
    sourceId: "document_tax",
    sourceVersion: "document_version_tax-3",
    submittedBy: "actor_seller",
    submittedAt: "2026-08-07T12:01:00.000Z",
  });

  assertEquals(submitted.state, "evidence_submitted");
  assertEquals(submitted.evidence[0].state, "submitted");
});

Deno.test("only accepted evidence can satisfy a condition", () => {
  const submitted = submitConditionEvidence(
    createCondition(baseInput),
    {
      evidenceId: "evidence_tax-1",
      sourceType: "document_version",
      sourceId: "document_tax",
      sourceVersion: "document_version_tax-3",
      submittedBy: "actor_seller",
      submittedAt: "2026-08-07T12:01:00.000Z",
    },
  );

  assertThrows(
    () =>
      satisfyCondition(submitted, "actor_counsel", "2026-08-07T12:02:00.000Z"),
    Error,
    "accepted evidence",
  );
  assertThrows(
    () =>
      acceptConditionEvidence(
        submitted,
        "evidence_tax-1",
        "actor_wrong-reviewer",
        "2026-08-07T12:03:00.000Z",
      ),
    Error,
    "not authorized",
  );
  const accepted = acceptConditionEvidence(
    submitted,
    "evidence_tax-1",
    "actor_counsel",
    "2026-08-07T12:03:00.000Z",
  );
  const satisfied = satisfyCondition(
    accepted,
    "actor_counsel",
    "2026-08-07T12:04:00.000Z",
  );

  assertEquals(satisfied.state, "satisfied");
  assertEquals(satisfied.satisfiedBy, "actor_counsel");
});
