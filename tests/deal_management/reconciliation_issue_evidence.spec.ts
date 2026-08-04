import { assert, assertEquals, assertFalse } from "@std/assert";
import { mapDealError } from "../../src/deal_management/http_response.ts";
import { boundedIssueEvidence } from "../../src/deal_management/issue_evidence.ts";
import {
  applyIssue,
  verificationIssue,
} from "../../src/deal_management/reconciliation_records.ts";
import type { LegacyDealRecord } from "../../src/deal_management/legacy_contracts.ts";
import { requiredTenantId, requiredWorkspaceId } from "./support.ts";

const marker = "SENSITIVE_SECRET_MARKER_DATABASE_URL_TOKEN";
const record: LegacyDealRecord = {
  source: "legacy.fixture",
  legacyDealId: "legacy-safe-evidence",
  tenantId: requiredTenantId("tenant_test"),
  workspaceId: requiredWorkspaceId("workspace_test"),
  name: marker,
  dealType: "acquisition",
  confidentiality: "sensitive",
  currency: "USD",
  parties: [],
  team: [],
};

function serializedIssue(value: unknown): string {
  return JSON.stringify(value);
}

Deno.test("reconciliation issue evidence withholds Deal and provider content", () => {
  const intended = {
    id: "deal_safe",
    name: marker,
    parties: [{ label: marker }],
    mandate: { transactionValueCeiling: 999999 },
  };
  const issue = verificationIssue(record, intended as never, intended as never);
  const serialized = serializedIssue(issue);
  assertFalse(serialized.includes(marker));
  assertFalse(serialized.includes("parties"));
  assertFalse(serialized.includes("999999"));
  assert(issue.receivedDigest?.startsWith("digest:") === true);
  assert(issue.expectedDigest?.startsWith("digest:") === true);
  assert((issue.mismatchPaths?.length ?? 0) > 0);
  assert(issue.explanation.length <= 160);
});

Deno.test("apply issue and captured CLI-style JSON contain only bounded diagnostics", () => {
  const issue = applyIssue(record, new Error(`provider failed: ${marker}`));
  const output = serializedIssue({
    mode: "apply",
    outcomes: [{ record: { issue } }],
  });
  assertFalse(output.includes(marker));
  const originalLog = console.log;
  let captured = "";
  console.log = (...values: unknown[]) => {
    captured += values.map((value) => String(value)).join(" ");
  };
  try {
    console.log(output);
  } finally {
    console.log = originalLog;
  }
  assertFalse(captured.includes(marker));
  assertEquals(issue.received, "provider or validation failure");
  assert(issue.receivedDigest?.startsWith("digest:") === true);
  assert(output.length < 1200);
});

Deno.test("HTTP errors do not echo sensitive unknown failures", async () => {
  const response = mapDealError(
    new Error(`SQL password=${marker} stack=${marker}`),
    "correlation_test" as never,
    new Headers(),
  );
  const body = await response.text();
  assertFalse(body.includes(marker));
  assert(body.includes("VALIDATION_FAILED"));
});

Deno.test("issue evidence bounds summaries and preserves diagnostic paths", () => {
  const issue = boundedIssueEvidence({
    code: "UNSUPPORTED_LEGACY_SHAPE",
    legacyDealId: marker,
    received: marker,
    expected: marker,
    explanation: marker.repeat(30),
    mismatchPaths: [marker, "legacyDeal.name"],
  });
  const output = serializedIssue(issue);
  assertFalse(output.includes(marker));
  assertEquals(
    issue.received,
    "content withheld; inspect the digest and mismatch paths",
  );
  assertEquals(
    issue.expected,
    "content withheld; inspect the digest and mismatch paths",
  );
  assertEquals(issue.mismatchPaths?.[0], "redacted.path");
  assertEquals(issue.mismatchPaths?.[1], "legacyDeal.name");
  assert(issue.explanation.length <= 160);
});

Deno.test("persisted evidence retains digests without retaining source content", () => {
  const issue = boundedIssueEvidence({
    code: "RECONCILIATION_DRIFT",
    legacyDealId: "legacy-safe",
    received: "source fingerprint differs",
    expected: "persisted source fingerprint",
    explanation: "Source content drift requires operator review.",
    receivedContent: marker,
    expectedContent: { secret: marker },
  });
  const persisted = serializedIssue({ issue });
  assertFalse(persisted.includes(marker));
  assert(issue.receivedDigest?.startsWith("digest:") === true);
  assert(issue.expectedDigest?.startsWith("digest:") === true);
  const roundTrip = JSON.parse(persisted) as { issue: typeof issue };
  assertEquals(roundTrip.issue.receivedDigest, issue.receivedDigest);
  assertEquals(roundTrip.issue.expectedDigest, issue.expectedDigest);
});
