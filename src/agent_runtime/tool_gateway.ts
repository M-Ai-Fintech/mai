import {
  action,
  type AuthorizationDecision,
  resourceKind,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  RuntimeActor,
  RuntimeAuthority,
  RuntimeScope,
  SourceVersionReference,
} from "./model.ts";
import type { ToolActivityId } from "./ids.ts";
import {
  actorReference,
  runtimeAuthority,
  type RuntimeAuthorizationInput,
} from "./authorization.ts";

export type ToolCapability = "read" | "proposal" | "reversible_draft";

export interface ToolInvocationRequest {
  readonly activityId: ToolActivityId;
  readonly context: RequestContext;
  readonly actor: RuntimeActor;
  readonly scope: RuntimeScope;
  readonly toolName: string;
  readonly action: string;
  readonly resourceKind: string;
  readonly resourceId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly sourceVersions: readonly SourceVersionReference[];
  /** Gateway-owned admission fence immediately before the non-effecting invocation. */
  readonly beforeEffect: () => Promise<void>;
}

export interface RuntimeAuthorizationRequest extends RuntimeAuthorizationInput {
  readonly activityId: ToolActivityId;
}

export type RuntimeAuthorization = AuthorizationDecision;

export interface RuntimeAuthorizer {
  authorize(
    request: RuntimeAuthorizationRequest,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export type ToolOutput = {
  readonly kind: ToolCapability;
  readonly value: Readonly<Record<string, unknown>>;
};

export interface AuthorizedToolInvocation
  extends Omit<ToolInvocationRequest, "beforeEffect"> {
  readonly authority: RuntimeAuthority;
}

export interface ToolDefinition {
  readonly name: string;
  readonly capability: ToolCapability;
  /** Executes a data-only capability; durable or external effects are not permitted here. */
  execute(request: AuthorizedToolInvocation): Promise<ToolOutput>;
}

export type ToolInvocationResult =
  | {
    readonly status: "succeeded";
    readonly output: ToolOutput;
    readonly authority: RuntimeAuthority;
  }
  | { readonly status: "denied"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: "TOOL_EXECUTION_FAILED" };

export class ToolGateway {
  private readonly definitions: ReadonlyMap<string, ToolDefinition>;

  constructor(
    definitions: readonly ToolDefinition[],
    private readonly authorizer: RuntimeAuthorizer,
  ) {
    this.definitions = indexDefinitions(definitions);
  }

  /**
   * Reauthorizes and invokes one registered non-effecting tool capability.
   *
   * @example await gateway.invoke(request)
   */
  async invoke(request: ToolInvocationRequest): Promise<ToolInvocationResult> {
    const definition = this.definitions.get(request.toolName);
    if (definition === undefined) {
      return { status: "denied", reason: "TOOL_NOT_REGISTERED" };
    }
    const authorization = await this.reauthorize({
      activityId: request.activityId,
      context: request.context,
      actor: actorReference(request.actor),
      scope: request.scope,
      action: action(request.action),
      resource: {
        kind: resourceKind(request.resourceKind),
        id: request.resourceId,
      },
      requestedFields: [],
    });
    if (authorization.outcome === "deny") {
      return { status: "denied", reason: authorization.reasonCode };
    }
    const authority = runtimeAuthority(authorization);
    const { beforeEffect, ...safeRequest } = request;
    await beforeEffect();
    try {
      const output = await definition.execute({
        ...safeRequest,
        authority,
      });
      assertOutputCapability(definition, output);
      return {
        status: "succeeded",
        output,
        authority,
      };
    } catch {
      return { status: "failed", reason: "TOOL_EXECUTION_FAILED" };
    }
  }

  async reauthorize(
    request: RuntimeAuthorizationRequest,
  ): Promise<AuthorizationDecision> {
    return await this.authorizer.authorize(request);
  }
}

function indexDefinitions(
  definitions: readonly ToolDefinition[],
): ReadonlyMap<string, ToolDefinition> {
  const indexed = new Map<string, ToolDefinition>();
  for (const definition of definitions) {
    assertToolDefinition(definition);
    if (indexed.has(definition.name)) {
      throw new Error(
        `Tool "${definition.name}" is duplicated; expected one registered definition.`,
      );
    }
    indexed.set(definition.name, definition);
  }
  return indexed;
}

function assertToolDefinition(definition: ToolDefinition): void {
  if (
    definition.name.trim() && /^[a-z][a-z0-9_.-]{0,127}$/.test(definition.name)
  ) return;
  throw new Error(
    `Tool "${definition.name}" is invalid; expected a lowercase bounded capability name.`,
  );
}

function assertOutputCapability(
  definition: ToolDefinition,
  output: ToolOutput,
): void {
  if (output.kind === definition.capability) return;
  throw new Error(
    `Tool "${definition.name}" returned capability "${output.kind}"; expected "${definition.capability}".`,
  );
}
