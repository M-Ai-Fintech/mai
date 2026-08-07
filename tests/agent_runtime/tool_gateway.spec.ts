import { assertEquals } from "@std/assert";
import type {
  RuntimeAuthorization,
  RuntimeAuthorizer,
} from "../../src/agent_runtime/tool_gateway.ts";
import {
  type AuthorizedToolInvocation,
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/tool_gateway.ts";
import type { ToolActivityId } from "../../src/agent_runtime/ids.ts";
import type { RuntimeAuthorizationRequest } from "../../src/agent_runtime/tool_gateway.ts";
import type {
  RuntimeActor,
  RuntimeScope,
} from "../../src/agent_runtime/model.ts";

Deno.test("denied tool invocation has no tool effect", async () => {
  const tool = new RecordingProposalTool();
  const gateway = new ToolGateway(
    [tool],
    new DenyingAuthorizer("PERMISSION_LOST"),
  );
  const result = await gateway.invoke(fixtureRequest("proposal_tool"));

  assertEquals(result, { status: "denied", reason: "PERMISSION_LOST" });
  assertEquals(tool.invocations, 0);
});

Deno.test("gateway reauthorizes every invocation and observes permission loss", async () => {
  const tool = new RecordingProposalTool();
  const authorizer = new SequencedAuthorizer([
    allow("authority_1"),
    { outcome: "deny", reason: "GRANT_REVOKED" },
  ]);
  const gateway = new ToolGateway([tool], authorizer);

  assertEquals(
    (await gateway.invoke(fixtureRequest("proposal_tool"))).status,
    "succeeded",
  );
  assertEquals(
    (await gateway.invoke(fixtureRequest("proposal_tool"))).status,
    "denied",
  );
  assertEquals(authorizer.requests, 2);
  assertEquals(tool.invocations, 1);
});

Deno.test("gateway exposes only read, proposal, and reversible draft outputs", async () => {
  const gateway = new ToolGateway(
    [new RecordingProposalTool()],
    new DenyingAuthorizer("unused"),
  );
  const result = await gateway.invoke(fixtureRequest("missing_tool"));
  assertEquals(result, { status: "denied", reason: "TOOL_NOT_REGISTERED" });
});

function fixtureRequest(toolName: string) {
  return {
    activityId: "activity_alpha" as ToolActivityId,
    actor: {
      actorId: "actor_alpha",
      kind: "ai",
      state: "active",
    } as RuntimeActor,
    scope: {
      tenantId: "tenant_alpha",
      workspaceId: "workspace_alpha",
    } as RuntimeScope,
    toolName,
    action: "read_evidence",
    resourceKind: "evidence",
    resourceId: "evidence_alpha",
    input: { query: "alpha" },
    sourceVersions: [],
  };
}

function allow(reference: string): RuntimeAuthorization {
  return {
    outcome: "allow",
    authority: {
      snapshotReference: reference,
      decisionReference: `decision_${reference}`,
      checkedAt: new Date("2026-08-07T12:00:00.000Z"),
    },
  };
}

class DenyingAuthorizer implements RuntimeAuthorizer {
  constructor(private readonly reason: string) {}

  authorize(
    _request: RuntimeAuthorizationRequest,
  ): Promise<RuntimeAuthorization> {
    return Promise.resolve({ outcome: "deny", reason: this.reason });
  }
}

class SequencedAuthorizer implements RuntimeAuthorizer {
  requests = 0;

  constructor(private readonly decisions: readonly RuntimeAuthorization[]) {}

  authorize(
    _request: RuntimeAuthorizationRequest,
  ): Promise<RuntimeAuthorization> {
    const decision = this.decisions[this.requests++] ??
      { outcome: "deny", reason: "NO_DECISION" };
    return Promise.resolve(decision);
  }
}

class RecordingProposalTool implements ToolDefinition {
  readonly name = "proposal_tool";
  readonly capability = "proposal" as const;
  invocations = 0;

  execute(_request: AuthorizedToolInvocation) {
    this.invocations++;
    return Promise.resolve({
      kind: "proposal" as const,
      value: { proposed: true },
    });
  }
}
