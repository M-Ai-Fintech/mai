import { assertEquals, assertExists } from "@std/assert";
import {
  AllowingAuthorization,
  DenyingAuthorization,
} from "../agent_runtime/authorization_support.ts";
import {
  createGovernedFinancialRiskTools,
} from "../../src/agent/tools/financial_risk_tools.ts";
import { ToolGateway } from "../../src/agent_runtime/tool_gateway.ts";
import type {
  RuntimeActor,
  RuntimeScope,
} from "../../src/agent_runtime/model.ts";
import type { FinancialRiskInferenceResult } from "../../src/financial_risk/inference.ts";
import { FinancialRiskApplication } from "../../src/financial_risk/application.ts";
import { InMemoryFinancialRiskRepository } from "../../src/financial_risk/repository.ts";
import {
  computeRequest,
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  FALLBACK_RESULT,
  FINANCIAL_RISK_ALL_FIELD_MASK,
  financialRiskContext,
  financialRiskScope,
  MODEL_OUTPUTS,
  MODEL_RESULT,
  RecordingFinancialRiskFindingProposalPort,
  RecordingReferenceVerifier,
  TEST_CHECKSUM,
} from "./support.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import {
  FINANCIAL_RISK_PROJECTION_FIELDS,
} from "../../src/financial_risk/projection.ts";
import { financialRiskDefinition } from "../../src/agent/definitions/specialists.ts";
import { DURABLE_CAPABILITY_BINDINGS } from "../../src/agent/governed_capability_binding.ts";

Deno.test("governed financial-risk read reauthorizes and returns exact receipts", async () => {
  const application = await seededApplication(MODEL_RESULT);
  const tool = createGovernedFinancialRiskTools(application)[0];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(
      invocation(tool.name, "read_financial_risk_assessment", {}),
    );

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.kind, "read");
  assertEquals(result.output.value.authoritative, false);
  assertEquals(result.output.value.state, "completed");
  assertEquals(
    (result.output.value.provenance as Record<string, unknown>).kind,
    "model-inference",
  );
  assertExists(result.output.value.outputs);
  assertEquals(
    (result.output.value.outputs as { readonly industry4Score: number })
      .industry4Score,
    MODEL_OUTPUTS.industry4Score,
  );
  assertEquals(result.output.discoveredSourceVersions?.length, 3);
  assertEquals(
    result.output.discoveredSourceVersions?.[1]?.version,
    `${TEST_CHECKSUM}:evidence_alpha`,
  );
});

Deno.test("governed financial-risk finding access is proposal-only and human-authority fenced", async () => {
  const application = await seededApplication(MODEL_RESULT);
  const tools = createGovernedFinancialRiskTools(application);
  const tool = tools[1];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(
      invocation(tool.name, "propose_financial_risk_finding", {
        title: "Review model-backed financial risk",
        statement: "The exact assessment should be reviewed by the banker.",
      }),
    );

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.kind, "proposal");
  const proposal = result.output.value.proposal as Record<string, unknown>;
  assertEquals(proposal.proposalOnly, true);
  assertEquals(proposal.authoritative, false);
  assertEquals(proposal.persisted, false);
  assertEquals(proposal.approved, false);
  assertEquals(proposal.final, false);
  assertEquals(proposal.humanAuthorityRequired, true);
  assertEquals(
    (proposal.provenance as Record<string, unknown>).kind,
    "model-inference",
  );
});

Deno.test("gateway denial prevents financial-risk protected access", async () => {
  const application = await seededApplication(MODEL_RESULT);
  const authorization = new FakeFinancialRiskAuthorization();
  const tool = createGovernedFinancialRiskTools(application)[0];
  const result = await new ToolGateway([tool], new DenyingAuthorization())
    .invoke(
      invocation(tool.name, "read_financial_risk_assessment", {}),
    );

  assertEquals(result.status, "denied");
  assertEquals(authorization.calls, 0);
});

Deno.test("governed financial-risk fallback remains explicitly non-model", async () => {
  const application = await seededApplication(FALLBACK_RESULT);
  const tool = createGovernedFinancialRiskTools(application)[0];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(
      invocation(tool.name, "read_financial_risk_assessment", {}),
    );

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.value.state, "fallback");
  const provenance = result.output.value.provenance as Record<string, unknown>;
  assertEquals(provenance.kind, "configured-fallback");
  assertEquals(provenance.modelId, undefined);
});

Deno.test("financial-risk projections omit fields outside the approved grant", async () => {
  const fieldMask = restrictedFieldMask();
  const application = await seededApplication(
    MODEL_RESULT,
    new FakeFinancialRiskAuthorization("allow", fieldMask),
  );
  const tool = createGovernedFinancialRiskTools(application)[0];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(invocation(tool.name, "read_financial_risk_assessment", {}));

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.value.assessmentId, "risk_assessment_alpha");
  assertEquals(result.output.value.state, "completed");
  assertEquals(result.output.value.outputs, undefined);
  assertEquals(result.output.value.references, undefined);
  assertEquals(result.output.value.scope, undefined);
  assertEquals(result.output.discoveredSourceVersions, undefined);
});

Deno.test("restricted read masks keep detailed result reasons out of the public reason code", async () => {
  const application = await seededApplication(
    RESTRICTED_RESULT,
    new FakeFinancialRiskAuthorization("allow", restrictedFieldMask()),
  );
  const tool = createGovernedFinancialRiskTools(application)[0];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(invocation(tool.name, "read_financial_risk_assessment", {}));

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.value.reasonCode, "FINANCIAL_RISK_COMPLETED");
  assertEquals(result.output.value.reason, undefined);
});

Deno.test("restricted output masks preserve explicit fallback semantics without blocking the read", async () => {
  const application = await seededApplication(
    FALLBACK_RESULT,
    new FakeFinancialRiskAuthorization("allow", fallbackFieldMask()),
  );
  const tool = createGovernedFinancialRiskTools(application)[0];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(invocation(tool.name, "read_financial_risk_assessment", {}));

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  assertEquals(result.output.value.status, "fallback");
  assertEquals(result.output.value.state, undefined);
  assertEquals(result.output.value.provenance, undefined);
  assertExists(result.output.value.outputs);
});

Deno.test("financial-risk capabilities bind to governed tools, not deterministic ports", () => {
  assertEquals(
    DURABLE_CAPABILITY_BINDINGS["financial-risk.read"],
    {
      toolName: "governed.financial-risk.assessment",
      action: "read_financial_risk_assessment",
    },
  );
  assertEquals(
    DURABLE_CAPABILITY_BINDINGS["financial-risk.finding-propose"],
    {
      toolName: "governed.financial-risk.finding-proposal",
      action: "propose_financial_risk_finding",
    },
  );
  assertEquals(financialRiskDefinition.calculationBindings, []);
});

Deno.test("finding proposal persists only through the Diligence proposal port", async () => {
  const application = await seededApplication(MODEL_RESULT);
  const proposals = new RecordingFinancialRiskFindingProposalPort();
  const tool = createGovernedFinancialRiskTools(application, proposals)[1];
  const result = await new ToolGateway([tool], new AllowingAuthorization())
    .invoke(
      invocation(tool.name, "propose_financial_risk_finding", {
        title: "Review model-backed financial risk",
        statement: "The exact assessment should be reviewed by the banker.",
        findingId: "finding_alpha",
        idempotencyKey: "idem_finding-alpha",
      }),
    );

  assertEquals(result.status, "succeeded");
  if (result.status !== "succeeded") return;
  const proposal = result.output.value.proposal as Record<string, unknown>;
  assertEquals(proposals.calls, 1);
  assertEquals(proposals.lastInput?.findingId, "finding_alpha");
  assertEquals(proposal.persisted, true);
  assertEquals(
    (proposal.finding as Record<string, unknown>).state,
    "proposed",
  );
  assertEquals(proposal.approved, false);
  assertEquals(proposal.final, false);
});

async function seededApplication(
  inferenceResult: FinancialRiskInferenceResult,
  authorization = new FakeFinancialRiskAuthorization(),
): Promise<FinancialRiskApplication> {
  const application = new FinancialRiskApplication(
    authorization,
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(inferenceResult),
    new InMemoryFinancialRiskRepository(),
  );
  const scope = financialRiskScope();
  const context = financialRiskContext(scope, "actor_agent" as never);
  await application.compute(
    computeRequest({
      context,
      actor: { id: context.actorId, kind: "ai", state: "active" },
    }),
  );
  return application;
}

const RESTRICTED_RESULT = {
  ...MODEL_RESULT,
  reason: "restricted internal inference detail",
} as unknown as FinancialRiskInferenceResult;

function restrictedFieldMask() {
  return {
    ...FINANCIAL_RISK_ALL_FIELD_MASK,
    omit: [
      FINANCIAL_RISK_PROJECTION_FIELDS.outputs,
      FINANCIAL_RISK_PROJECTION_FIELDS.references,
      FINANCIAL_RISK_PROJECTION_FIELDS.reason,
    ],
    redact: [FINANCIAL_RISK_PROJECTION_FIELDS.scope],
  };
}

function fallbackFieldMask() {
  return {
    ...FINANCIAL_RISK_ALL_FIELD_MASK,
    omit: [
      FINANCIAL_RISK_PROJECTION_FIELDS.state,
      FINANCIAL_RISK_PROJECTION_FIELDS.provenance,
      FINANCIAL_RISK_PROJECTION_FIELDS.references,
      FINANCIAL_RISK_PROJECTION_FIELDS.reason,
    ],
  };
}

function invocation(
  toolName: string,
  action: string,
  input: Readonly<Record<string, unknown>>,
) {
  const scope = financialRiskScope() as RuntimeScope;
  const context = financialRiskContext(
    scope,
    "actor_agent" as never,
  ) as RequestContext;
  const actor: RuntimeActor = {
    actorId: context.actorId,
    kind: "ai",
    state: "active",
  };
  return {
    activityId: "activity_financial-risk" as never,
    context,
    actor,
    scope,
    toolName,
    action,
    resourceKind: "financial-risk-assessment",
    resourceId: "risk_assessment_alpha",
    input,
    sourceVersions: [],
    beforeEffect: () => Promise.resolve(),
  };
}
