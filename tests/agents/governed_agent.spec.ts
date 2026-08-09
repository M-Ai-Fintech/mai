import { assertEquals, assertRejects } from "@std/assert";
import {
  type AgentDefinition,
  createDefinitionCatalog,
  createSpecialistDefinitionCatalog,
} from "../../src/agent/governed.ts";
import {
  createGovernedSpecialist,
  type GovernedExecutionBinding,
  type GovernedExecutionContext,
  type GovernedProposalPort,
  type GovernedProposalRequest,
  type GovernedProposalResponse,
  GovernedProvenanceError,
  type GovernedProvenanceVerificationRequest,
  type GovernedProvenanceVerifier,
} from "../../src/agent/governed.ts";
import type {
  ResultRecord,
  RuntimeScope,
} from "../../src/agent_runtime/model.ts";
import type { VerifiedAgentLineage } from "../../src/agent/definitions/index.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

class RecordingProposalPort implements GovernedProposalPort {
  readonly requests: GovernedProposalRequest[] = [];

  constructor(private readonly response: GovernedProposalResponse) {}

  propose(
    request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse> {
    this.requests.push(request);
    return Promise.resolve(this.response);
  }
}

class NamedFakeRuntimeReceiptVerifier implements GovernedProvenanceVerifier {
  readonly requests: GovernedProvenanceVerificationRequest[] = [];

  constructor(
    private readonly returnExecution?: GovernedExecutionBinding,
    private readonly stale = false,
    private readonly durableValue: Readonly<Record<string, unknown>> =
      proposedOutput,
    private readonly resultKind: ResultRecord["kind"] = "proposal",
  ) {}

  verify(
    request: GovernedProvenanceVerificationRequest,
  ): Promise<{
    execution: GovernedExecutionBinding;
    result: ResultRecord;
    lineage: VerifiedAgentLineage;
  }> {
    this.requests.push(request);
    if (this.stale) {
      return Promise.reject(
        new GovernedProvenanceError("receipt source version is stale"),
      );
    }
    if (request.resultId === "result_invented") {
      return Promise.reject(
        new GovernedProvenanceError("durable result is unavailable"),
      );
    }
    const result: ResultRecord = {
      resultId: request.resultId as never,
      runId: request.execution.runId,
      stepId: "step_result" as never,
      kind: this.resultKind,
      value: this.durableValue,
      lineage: {
        definition: {
          id: request.definition.id,
          version: request.definition.version,
        },
        definitionId: request.definition.id,
        definitionVersion: request.definition.version,
        modelPolicyReference: request.definition.modelPolicy.policyReference,
        prompt: request.definition.prompt,
        model: {
          policyReference: request.definition.modelPolicy.policyReference,
          provider: request.definition.modelPolicy.provider,
          model: request.definition.modelPolicy.model,
          modelVersion: request.definition.modelPolicy.modelVersion,
        },
        toolActivityIds: [],
        evidence: [],
      },
      cost: {} as never,
      createdAt: new Date("2026-08-08T12:00:00.000Z"),
    };
    return Promise.resolve({
      execution: this.returnExecution ?? request.execution,
      result,
      lineage: trustedLineage(request.definition),
    });
  }
}

const proposedOutput = {
  success: true,
  response: "Review proposal prepared from exact evidence.",
  timestamp: "2026-08-08T12:00:00.000Z",
};

Deno.test("all pinned specialists emit schema-valid non-authoritative proposals", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  for (
    const id of [
      "broker-orchestrator-agent",
      "deal-matching-agent",
      "financial-risk-agent",
      "general-dd-agent",
      "legal-closing-agent",
      "legal-dd-agent",
      "negotiation-agent",
      "sourcing-kyb-agent",
    ] as const
  ) {
    const port = new RecordingProposalPort({
      status: "proposed",
      resultId: "result_exact",
    });
    const verifier = new NamedFakeRuntimeReceiptVerifier();
    const result = await createGovernedSpecialist(
      catalog,
      id,
      port,
      verifier,
      executionContext(),
    ).propose({
      input: { dealId: "deal_horizon", query: "Prepare a proposal." },
      capability: "evidence.search",
    });

    assertEquals(result.status, "proposed");
    assertEquals(result.artifact.value, proposedOutput);
    assertEquals(result.artifact.authoritative, false);
    assertEquals(result.artifact.reversible, true);
    assertEquals(result.providerReadinessClaimed, false);
    assertEquals(result.lineage.definition.id, id);
    assertEquals(
      result.lineage.definition.version,
      catalog.current(id).version,
    );
    assertEquals(port.requests.length, 1);
    assertEquals(verifier.requests[0].resultId, "result_exact");
    assertEquals(verifier.requests[0].capability, "evidence.search");
  }
});

Deno.test("unavailable and prohibited capabilities never reach a proposal port", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const port = new RecordingProposalPort({
    status: "proposed",
    resultId: "result_exact",
  });
  const verifier = new NamedFakeRuntimeReceiptVerifier();
  const agent = createGovernedSpecialist(
    catalog,
    "sourcing-kyb-agent",
    port,
    verifier,
    executionContext(),
  );

  const unavailable = await agent.propose({
    input: { dealId: "deal_horizon", query: "Search a registry." },
    capability: "provider.registry-verification",
  });
  const denied = await agent.propose({
    input: { dealId: "deal_horizon", query: "Release the result." },
    capability: "release",
  });

  assertEquals(unavailable.status, "unavailable");
  assertEquals(denied.status, "denied");
  assertEquals(port.requests.length, 0);
});

Deno.test("durable result value wins over every untrusted proposal field", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const response = {
    status: "proposed" as const,
    resultId: "result_exact",
    value: {
      success: false,
      response: "attacker-controlled value",
      timestamp: "not-a-date",
    },
    kind: "reversible_draft",
    provenanceClaims: {
      tools: [{ activityId: "activity_invented" }],
      evidence: [{ sourceId: "docv_invented" }],
    },
  } as unknown as GovernedProposalResponse;
  const result = await createAgentWithResponse(catalog, response).propose({
    input: { dealId: "deal_horizon", query: "Review." },
    capability: "evidence.search",
  });

  assertEquals(result.status, "proposed");
  assertEquals(result.artifact.value, proposedOutput);
  assertEquals(result.artifact.kind, "proposal");
});

Deno.test("durable result value must satisfy the selected specialist schema", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const agent = createGovernedSpecialist(
    catalog,
    "legal-dd-agent",
    new RecordingProposalPort({
      status: "proposed",
      resultId: "result_exact",
    }),
    new NamedFakeRuntimeReceiptVerifier(undefined, false, {
      success: true,
      response: "Missing timestamp.",
    }),
    executionContext(),
  );

  await assertRejects(
    () =>
      agent.propose({
        input: { dealId: "deal_horizon", query: "Review contracts." },
        capability: "evidence.search",
      }),
    Error,
  );
});

Deno.test("historical selection preserves the selected definition in lineage", async () => {
  const current = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const historical = {
    ...current,
    version: "0.9.0",
  } as AgentDefinition;
  const catalog = createSpecialistDefinitionCatalogWith(historical);
  const result = await createGovernedSpecialist(
    catalog,
    "broker-orchestrator-agent",
    new RecordingProposalPort({
      status: "proposed",
      resultId: "result_exact",
    }),
    new NamedFakeRuntimeReceiptVerifier(),
    executionContext(),
    "0.9.0",
  ).propose({
    input: { dealId: "deal_horizon", query: "Route this request." },
    capability: "evidence.search",
  });

  assertEquals(result.lineage.definition.version, "0.9.0");
  assertEquals(catalog.current("broker-orchestrator-agent").version, "1.0.0");
});

Deno.test("invented, stale, cross-run, and definition-mismatched bindings are rejected", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  await assertRejects(
    () =>
      createAgentWithResponse(catalog, {
        status: "proposed",
        resultId: "result_invented",
      }).propose(agentRequest()),
    GovernedProvenanceError,
    "unavailable",
  );
  await assertRejects(
    () =>
      createAgentWithResponse(
        catalog,
        { status: "proposed", resultId: "result_exact" },
        { stale: true },
      ).propose(agentRequest()),
    GovernedProvenanceError,
    "stale",
  );

  const crossRun = executionContext("run_other");
  await assertRejects(
    () =>
      createAgentWithResponse(
        catalog,
        { status: "proposed", resultId: "result_exact" },
        {
          returnExecution: {
            ...crossRun,
            definition: {
              id: "broker-orchestrator-agent",
              version: "1.0.0",
            },
          },
        },
      ).propose(agentRequest()),
    GovernedProvenanceError,
    "cross-scope, cross-run",
  );

  const mismatchedDefinition = executionContext();
  await assertRejects(
    () =>
      createAgentWithResponse(
        catalog,
        { status: "proposed", resultId: "result_exact" },
        {
          returnExecution: {
            ...mismatchedDefinition,
            definition: {
              id: "legal-dd-agent",
              version: "1.0.0",
            },
          },
        },
      ).propose(agentRequest()),
    GovernedProvenanceError,
    "definition-mismatched",
  );
});

Deno.test("malformed or missing result bindings are rejected before value use", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const missing = createAgentWithResponse(catalog, {
    status: "proposed",
  } as unknown as GovernedProposalResponse);
  await assertRejects(
    () => missing.propose(agentRequest()),
    GovernedProvenanceError,
    "malformed",
  );
  const blank = createAgentWithResponse(catalog, {
    status: "proposed",
    resultId: " ",
  });
  await assertRejects(
    () => blank.propose(agentRequest()),
    GovernedProvenanceError,
    "malformed",
  );
});

Deno.test("malformed unknown capabilities become explicit denied results", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const agent = createAgentWithResponse(catalog, {
    status: "proposed",
    resultId: "result_exact",
  });
  const result = await agent.propose({
    input: { dealId: "deal_horizon", query: "Malformed capability." },
    capability: { forged: true },
  });

  assertEquals(result.status, "denied");
  assertEquals(result.artifact.value, {
    capability: "unknown.capability",
    reason:
      "Capability object is malformed; expected a lowercase capability name.",
    status: "denied",
  });
});

function createAgentWithResponse(
  catalog: ReturnType<typeof createSpecialistDefinitionCatalog>,
  response: GovernedProposalResponse,
  options: {
    readonly returnExecution?: GovernedExecutionBinding;
    readonly stale?: boolean;
    readonly durableValue?: Readonly<Record<string, unknown>>;
    readonly resultKind?: ResultRecord["kind"];
  } = {},
) {
  return createGovernedSpecialist(
    catalog,
    "broker-orchestrator-agent",
    new RecordingProposalPort(response),
    new NamedFakeRuntimeReceiptVerifier(
      options.returnExecution,
      options.stale,
      options.durableValue,
      options.resultKind,
    ),
    executionContext(),
  );
}

function agentRequest(): { input: Record<string, string>; capability: string } {
  return {
    input: { dealId: "deal_horizon", query: "Review." },
    capability: "evidence.search",
  };
}

function executionContext(
  runId: string = "run_governed",
): GovernedExecutionContext {
  const scope: RuntimeScope = {
    tenantId: "tenant_horizon" as never,
    workspaceId: "workspace_horizon" as never,
    dealId: "deal_horizon" as never,
  };
  const context: RequestContext = {
    actorId: "actor_governed" as never,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_governed" as never,
    origin: "internal",
  };
  return {
    context,
    actor: { actorId: context.actorId, kind: "ai", state: "active" },
    scope,
    runId: runId as never,
  };
}

function trustedLineage(
  definition: Pick<
    AgentDefinition,
    "id" | "version" | "prompt" | "modelPolicy"
  >,
  overrides: Partial<VerifiedAgentLineage> = {},
): VerifiedAgentLineage {
  return {
    definition: {
      id: definition.id,
      version: definition.version,
    },
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
    ...overrides,
  };
}

function createSpecialistDefinitionCatalogWith(
  historical: AgentDefinition,
) {
  const catalog = createSpecialistDefinitionCatalog();
  const definitions = [
    historical,
    ...[
      "broker-orchestrator-agent",
      "deal-matching-agent",
      "financial-risk-agent",
      "general-dd-agent",
      "legal-closing-agent",
      "legal-dd-agent",
      "negotiation-agent",
      "sourcing-kyb-agent",
    ].map((id) => catalog.current(id as AgentDefinition["id"])),
  ];
  return createDefinitionCatalog(definitions);
}
