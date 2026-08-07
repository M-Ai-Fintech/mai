import { assertEquals } from "@std/assert";
import {
  type AuthorizedToolInvocation,
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/tool_gateway.ts";
import type { ToolActivityId } from "../../src/agent_runtime/ids.ts";
import type {
  RuntimeActor,
  RuntimeScope,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  DenyingAuthorization,
  SequencedAuthorization,
} from "./authorization_support.ts";

Deno.test("denied tool invocation has no tool effect", async () => {
  const tool = new RecordingProposalTool();
  const gateway = new ToolGateway(
    [tool],
    new DenyingAuthorization(),
  );
  const result = await gateway.invoke(fixtureRequest("proposal_tool"));

  assertEquals(result, { status: "denied", reason: "GRANT_REVOKED" });
  assertEquals(tool.invocations, 0);
});

Deno.test("gateway reauthorizes every invocation and observes permission loss", async () => {
  const tool = new RecordingProposalTool();
  const authorizer = new SequencedAuthorization(["allow", "deny"]);
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
    new DenyingAuthorization(),
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
    context: {
      actorId: "actor_alpha",
      tenantId: "tenant_alpha",
      workspaceId: "workspace_alpha",
      correlationId: "cor_alpha",
      origin: "http",
    } as RequestContext,
    beforeEffect: () => Promise.resolve(),
  };
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
