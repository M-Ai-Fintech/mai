import type { ActorId } from "../shared/contracts/identifiers.ts";
import type {
  RuntimeActor,
  RuntimeAuthority,
  RuntimeScope,
  SourceVersionReference,
} from "./model.ts";
import type { ToolActivityId } from "./ids.ts";

export type ToolCapability = "read" | "proposal" | "reversible_draft";

export interface ToolInvocationRequest {
  readonly activityId: ToolActivityId;
  readonly actor: RuntimeActor;
  readonly scope: RuntimeScope;
  readonly toolName: string;
  readonly action: string;
  readonly resourceKind: string;
  readonly resourceId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly sourceVersions: readonly SourceVersionReference[];
}

export interface RuntimeAuthorizationRequest {
  readonly activityId: ToolActivityId;
  readonly actorId: ActorId;
  readonly scope: RuntimeScope;
  readonly action: string;
  readonly resourceKind: string;
  readonly resourceId: string;
}

export type RuntimeAuthorization =
  | { readonly outcome: "allow"; readonly authority: RuntimeAuthority }
  | { readonly outcome: "deny"; readonly reason: string };

export interface RuntimeAuthorizer {
  authorize(
    request: RuntimeAuthorizationRequest,
  ): Promise<RuntimeAuthorization>;
}

export type ToolOutput = {
  readonly kind: ToolCapability;
  readonly value: Readonly<Record<string, unknown>>;
};

export interface AuthorizedToolInvocation extends ToolInvocationRequest {
  readonly authority: RuntimeAuthority;
}

export interface ToolDefinition {
  readonly name: string;
  readonly capability: ToolCapability;
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
      actorId: request.actor.actorId,
      scope: request.scope,
      action: request.action,
      resourceKind: request.resourceKind,
      resourceId: request.resourceId,
    });
    if (authorization.outcome === "deny") {
      return { status: "denied", reason: authorization.reason };
    }
    try {
      const output = await definition.execute({
        ...request,
        authority: authorization.authority,
      });
      assertOutputCapability(definition, output);
      return {
        status: "succeeded",
        output,
        authority: authorization.authority,
      };
    } catch {
      return { status: "failed", reason: "TOOL_EXECUTION_FAILED" };
    }
  }

  reauthorize(
    request: RuntimeAuthorizationRequest,
  ): Promise<RuntimeAuthorization> {
    return this.authorizer.authorize(request);
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
