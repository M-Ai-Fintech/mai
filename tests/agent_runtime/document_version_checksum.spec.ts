import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  assertSourceVersionReceipt,
  deduplicateSourceVersions,
  type SourceVersionReference,
} from "../../src/agent_runtime/model.ts";
import {
  type AuthorizedToolInvocation,
  type ToolDefinition,
  ToolGateway,
  type ToolOutput,
} from "../../src/agent_runtime/tool_gateway.ts";
import {
  resultLineageSchema,
  sourceVersionReferenceSchema,
} from "../../src/agent/definitions/contract.ts";
import type { ToolActivityId } from "../../src/agent_runtime/ids.ts";
import type {
  RuntimeActor,
  RuntimeScope,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import { AllowingAuthorization } from "./authorization_support.ts";

const CHECKSUM = "a".repeat(64);
const OTHER_CHECKSUM = "b".repeat(64);

Deno.test("ToolGateway rejects missing discovered document-version checksums", async () => {
  const result = await invokeTool({
    kind: "read",
    value: { status: "ok" },
    discoveredSourceVersions: [missingReceipt()],
  });

  assertEquals(result.status, "failed");
});

Deno.test("ToolGateway rejects malformed or mismatched nested exact references", async () => {
  const malformed = await invokeTool({
    kind: "read",
    value: { records: [{ ...exactValue(), checksum: undefined }] },
    discoveredSourceVersions: [receipt()],
  });
  const mismatched = await invokeTool({
    kind: "read",
    value: { records: [{ ...exactValue(OTHER_CHECKSUM) }] },
    discoveredSourceVersions: [receipt()],
  });

  assertEquals(malformed.status, "failed");
  assertEquals(mismatched.status, "failed");
});

Deno.test("ToolGateway deduplicates identical nested receipts and accepts exact matches", async () => {
  const result = await invokeTool({
    kind: "read",
    value: { records: [exactValue(), { references: [exactValue()] }] },
    discoveredSourceVersions: [receipt(), receipt()],
  });

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.discoveredSourceVersions, [receipt()]);
});

Deno.test("non-document source receipts may omit their checksum", async () => {
  const result = await invokeTool({
    kind: "read",
    value: { status: "ok" },
    discoveredSourceVersions: [{
      sourceType: "document",
      sourceId: "document_alpha",
      version: 2 as never,
    }],
  });

  assertEquals(result.status, "succeeded");
});

Deno.test("receipt validation preserves non-empty string versions", () => {
  const documentReceipt = {
    ...receipt(),
    version: "document-version-2" as never,
  } as SourceVersionReference;
  const evidenceReceipt = {
    sourceType: "evidence",
    sourceId: "evidence_alpha",
    version: "evidence-v1" as never,
  } as SourceVersionReference;

  assertSourceVersionReceipt(documentReceipt);
  assertSourceVersionReceipt(evidenceReceipt);
  assertEquals(
    deduplicateSourceVersions([documentReceipt, evidenceReceipt]),
    [documentReceipt, evidenceReceipt],
  );
});

Deno.test("durable aggregation validates, deduplicates, and conflicts exact receipts", () => {
  const source = receipt();

  assertEquals(deduplicateSourceVersions([source, { ...source }]), [source]);
  assertThrows(
    () =>
      deduplicateSourceVersions([source, {
        ...source,
        checksum: OTHER_CHECKSUM,
      }]),
    Error,
    "conflicts",
  );
  assertThrows(
    () =>
      deduplicateSourceVersions([
        { ...source, checksum: undefined } as SourceVersionReference,
      ]),
    Error,
    "missing",
  );
  assertThrows(
    () => deduplicateSourceVersions([{ ...source, checksum: "A".repeat(64) }]),
    Error,
    "lowercase",
  );
});

Deno.test("durable lineage schema conditionally requires document-version checksums", () => {
  assertEquals(
    sourceVersionReferenceSchema.safeParse({
      sourceType: "document_version",
      sourceId: "document_version_alpha",
      version: 2,
    }).success,
    false,
  );
  assertEquals(
    sourceVersionReferenceSchema.safeParse({
      sourceType: "document",
      sourceId: "document_alpha",
      version: 2,
    }).success,
    true,
  );
  assert(
    resultLineageSchema.safeParse({
      ...lineageFixture(),
      evidence: [receipt()],
    }).success,
  );
  assertEquals(
    resultLineageSchema.safeParse({
      ...lineageFixture(),
      evidence: [{ ...receipt(), checksum: undefined }],
    }).success,
    false,
  );
});

function receipt(
  checksum: string | undefined = CHECKSUM,
): SourceVersionReference {
  return {
    sourceType: "document_version",
    sourceId: "document_version_alpha",
    version: 2 as never,
    ...(checksum === undefined ? {} : { checksum }),
  } as SourceVersionReference;
}

function missingReceipt(): SourceVersionReference {
  return {
    sourceType: "document_version",
    sourceId: "document_version_alpha",
    version: 2 as never,
  };
}

function exactValue(checksum: string = CHECKSUM) {
  return {
    documentVersionId: "document_version_alpha",
    version: 2,
    checksum: { algorithm: "sha256", value: checksum },
  };
}

async function invokeTool(output: ToolOutput) {
  return await new ToolGateway(
    [new FixedOutputTool(output)],
    new AllowingAuthorization(),
  ).invoke({
    activityId: "activity_checksum" as ToolActivityId,
    actor: {
      actorId: "actor_checksum",
      kind: "ai",
      state: "active",
    } as RuntimeActor,
    scope: {
      tenantId: "tenant_checksum",
      workspaceId: "workspace_checksum",
      dealId: "deal_checksum",
    } as RuntimeScope,
    context: {
      actorId: "actor_checksum",
      tenantId: "tenant_checksum",
      workspaceId: "workspace_checksum",
      dealId: "deal_checksum",
      correlationId: "correlation_checksum",
      origin: "http",
    } as RequestContext,
    toolName: "checksum_tool",
    action: "read_evidence",
    resourceKind: "evidence",
    resourceId: "document_version_alpha",
    input: {},
    sourceVersions: [],
    beforeEffect: () => Promise.resolve(),
  });
}

function lineageFixture() {
  return {
    definition: { id: "broker-orchestrator-agent", version: "1.0.0" },
    definitionId: "broker-orchestrator-agent",
    definitionVersion: "1.0.0",
    prompt: {
      templateReference: "prompt/checksum",
      templateVersion: "1.0.0",
      promptDigest: `sha256:${CHECKSUM}`,
    },
    promptDigest: `sha256:${CHECKSUM}`,
    model: {
      policyReference: "policy/checksum",
      provider: "unavailable",
      model: "unavailable",
      modelVersion: "unavailable",
    },
    modelPolicyReference: "policy/checksum",
    tools: [],
    toolActivityIds: [],
    evidence: [],
  };
}

class FixedOutputTool implements ToolDefinition {
  readonly name = "checksum_tool";
  readonly capability = "read" as const;

  constructor(private readonly output: ToolOutput) {}

  execute(_request: AuthorizedToolInvocation): Promise<ToolOutput> {
    return Promise.resolve(this.output);
  }
}
