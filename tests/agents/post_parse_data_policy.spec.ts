import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { z } from "zod";
import {
  type AgentDefinition,
  agentDefinitionEnvelopeSchema,
  createSpecialistDefinitionCatalog,
  type VerifiedAgentLineage,
} from "../../src/agent/definitions/index.ts";
import {
  canonicalizePostParseData,
  canonicalizePostParseRecord,
  PostParseDataPolicyError,
} from "../../src/agent/definitions/post_parse_data_policy.ts";
import {
  type GovernedExecutionContext,
  type GovernedProposalPort,
  type GovernedProposalRequest,
  type GovernedProvenanceVerificationRequest,
  type GovernedProvenanceVerifier,
  GovernedSpecialistAgent,
  type GovernedVerifiedProvenance,
} from "../../src/agent/governed_agent.ts";
import { governedStepInput } from "../../src/agent/governed_runtime_adapter_support.ts";
import type {
  ResultRecord,
  RuntimeScope,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

class ProviderClientFake {
  readonly provider = "fake";
}

class RecordingProposalPort implements GovernedProposalPort {
  readonly requests: GovernedProposalRequest[] = [];

  propose(
    request: GovernedProposalRequest,
  ): Promise<{ readonly status: "proposed"; readonly resultId: string }> {
    this.requests.push(request);
    return Promise.resolve({ status: "proposed", resultId: "result_policy" });
  }
}

class StaticProvenanceVerifier implements GovernedProvenanceVerifier {
  constructor(private readonly value: Readonly<Record<string, unknown>>) {}

  verify(
    request: GovernedProvenanceVerificationRequest,
  ): Promise<GovernedVerifiedProvenance> {
    const lineage = trustedLineage(request.definition);
    const runtimeLineage = {
      ...lineage,
      definitionId: request.definition.id,
      definitionVersion: request.definition.version,
      toolActivityIds: [] as never[],
      evidence: [],
    };
    const result: ResultRecord = {
      resultId: request.resultId as never,
      runId: request.execution.runId,
      stepId: "step_policy" as never,
      kind: "proposal",
      value: this.value,
      lineage: runtimeLineage,
      cost: zeroCost(),
      createdAt: new Date("2026-08-09T12:00:00.000Z"),
    };
    return Promise.resolve({ execution: request.execution, result, lineage });
  }
}

const safeInput = {
  dealId: "deal_policy",
  query: "Review the governed context.",
  context: {
    tokenizedQuery: "review:deal_policy",
    clientName: "Horizon Capital",
  },
};

const safeOutput = {
  success: true,
  response: "Proposal prepared.",
  timestamp: "2026-08-09T12:00:00.000Z",
};

Deno.test("recursive policy rejects nested credentials in arrays and records", () => {
  const hostile = {
    context: {
      records: [
        {
          metadata: {
            credentials: [{ apiKey: "secret" }],
          },
        },
      ],
    },
  };

  assertThrows(
    () => canonicalizePostParseData(hostile, "input"),
    PostParseDataPolicyError,
    "input.context.records[0].metadata.credentials",
  );
});

Deno.test("normalized field segments preserve legitimate tokenized query and client name", () => {
  const canonical = canonicalizePostParseRecord(safeInput, "input");

  assertEquals(canonical, safeInput);
  assert(Object.isFrozen(canonical));
  assert(Object.isFrozen(canonical.context));
});

Deno.test("field policy rejects credential and client-shaped names without substring false positives", () => {
  for (
    const key of [
      "apiKey",
      "API_KEY",
      "private-key",
      "providerClient",
      "raw_client",
      "accessToken",
      "passwordHash",
      "secretValue",
    ]
  ) {
    assertThrows(
      () => canonicalizePostParseData({ context: { [key]: "value" } }, "input"),
      PostParseDataPolicyError,
      `input.context${pathSuffix(key)}`,
    );
  }

  assertEquals(
    canonicalizePostParseData({ context: { tokenizedQuery: "safe" } }, "input"),
    { context: { tokenizedQuery: "safe" } },
  );
});

Deno.test("policy rejects functions, symbols, class instances, accessors, and data cycles", () => {
  const accessor = {} as Record<string, unknown>;
  Object.defineProperty(accessor, "context", {
    enumerable: true,
    get: () => ({ query: "unsafe accessor" }),
  });
  const cyclic: Record<string, unknown> = {};
  cyclic.context = cyclic;
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  const hostileValues: readonly [string, unknown][] = [
    ["input.context.callback", { context: { callback: () => "no" } }],
    ["input.context.marker", { context: { marker: Symbol("no") } }],
    ["input.context.client", { context: { client: new ProviderClientFake() } }],
    ["input.context", accessor],
    ["input.context", cyclic],
    ["input.context", { context: revoked.proxy }],
  ];

  for (const [path, value] of hostileValues) {
    assertThrows(
      () => canonicalizePostParseData(value, "input"),
      PostParseDataPolicyError,
      path,
    );
  }
});

Deno.test("all governed validator fields reject ZodEffects transforms", () => {
  const current = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const transformed = z.object({ safe: z.string() }).transform(() => ({
    apiKey: "secret",
  }));

  for (
    const field of [
      "inputValidator",
      "outputValidator",
      "inputSchema",
      "outputSchema",
    ] as const
  ) {
    const candidate = { ...current, [field]: transformed } as AgentDefinition;
    assertEquals(
      agentDefinitionEnvelopeSchema.safeParse(candidate).success,
      false,
      `${field} accepted a governed transform`,
    );
  }
});

Deno.test("transformed input output cannot bypass the post-parse policy", async () => {
  const base = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const transformedInput = z.object({
    dealId: z.string(),
    query: z.string(),
  }).transform(() => ({ apiKey: "secret" }));
  const port = new RecordingProposalPort();
  const agent = new GovernedSpecialistAgent(
    { ...base, inputValidator: transformedInput } as AgentDefinition,
    port,
    new StaticProvenanceVerifier(safeOutput),
    executionContext(),
  );

  await assertRejects(
    () => agent.propose({ input: safeInput, capability: "evidence.search" }),
    PostParseDataPolicyError,
    "input.parsed.apiKey",
  );
  assertEquals(port.requests.length, 0);
});

Deno.test("transformed output containing a provider client is rejected after parsing", async () => {
  const base = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const transformedOutput = z.object({
    success: z.boolean(),
    response: z.string(),
    timestamp: z.string(),
  }).transform(() => ({ providerClient: new ProviderClientFake() }));
  const agent = new GovernedSpecialistAgent(
    { ...base, outputValidator: transformedOutput } as AgentDefinition,
    new RecordingProposalPort(),
    new StaticProvenanceVerifier(safeOutput),
    executionContext(),
  );

  await assertRejects(
    () => agent.propose({ input: safeInput, capability: "evidence.search" }),
    PostParseDataPolicyError,
    "output.parsed.providerClient",
  );
});

Deno.test("direct durable step construction applies the same input policy", () => {
  const definition = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const execution = executionContext();
  const request = {
    definition,
    execution: {
      ...execution,
      definition: { id: definition.id, version: definition.version },
    },
    input: { context: { apiKey: "secret" } },
    capability: "evidence.search",
  };

  assertThrows(
    () => governedStepInput(request),
    PostParseDataPolicyError,
    "durable.step.input.request.context.apiKey",
  );
  const safe = governedStepInput({ ...request, input: safeInput });
  assertEquals(safe.request, safeInput);
  assert(Object.isFrozen(safe));
});

Deno.test("schema cycles remain accepted while data cycles remain rejected", () => {
  const current = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const cyclicSchema: z.ZodTypeAny = z.lazy(() => cyclicSchema);

  assertEquals(
    agentDefinitionEnvelopeSchema.safeParse({
      ...current,
      inputValidator: cyclicSchema,
    }).success,
    true,
  );
  const cyclicData: Record<string, unknown> = {};
  cyclicData.self = cyclicData;
  assertThrows(
    () => canonicalizePostParseData(cyclicData, "output"),
    PostParseDataPolicyError,
    "output.self",
  );
});

function executionContext(): GovernedExecutionContext {
  const scope: RuntimeScope = {
    tenantId: "tenant_policy" as never,
    workspaceId: "workspace_policy" as never,
    dealId: "deal_policy" as never,
  };
  const context: RequestContext = {
    actorId: "actor_policy" as never,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_policy" as never,
    origin: "internal",
  };
  return {
    context,
    actor: { actorId: context.actorId, kind: "ai", state: "active" },
    scope,
    runId: "run_policy" as never,
  };
}

function trustedLineage(
  definition: Pick<
    AgentDefinition,
    "id" | "version" | "prompt" | "modelPolicy"
  >,
): VerifiedAgentLineage {
  return {
    definition: { id: definition.id, version: definition.version },
    prompt: definition.prompt,
    modelPolicyReference: definition.modelPolicy.policyReference,
    model: {
      policyReference: definition.modelPolicy.policyReference,
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
    },
    tools: [],
    evidence: [],
  };
}

function zeroCost(): ResultRecord["cost"] {
  return {
    currency: "USD",
    inputTokens: 0,
    outputTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };
}

function pathSuffix(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `.${key}`
    : `[${JSON.stringify(key)}]`;
}
