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
import { sourceVersionKey } from "./model.ts";
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
  /** Exact source versions discovered by this execution, if any. */
  readonly discoveredSourceVersions?: readonly SourceVersionReference[];
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
      assertDiscoveredEvidence(output);
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

function assertDiscoveredEvidence(output: ToolOutput): void {
  const discovered = output.discoveredSourceVersions ?? [];
  const recorded = new Map(
    discovered.map((reference) => [sourceVersionKey(reference), reference]),
  );
  if (recorded.size !== discovered.length) {
    throw new Error(
      "Tool output discovered evidence contains duplicates; expected one exact source version per reference.",
    );
  }
  for (const reference of discovered) assertSourceVersion(reference);
  for (const reference of extractSourceVersions(output.value)) {
    if (recorded.has(sourceVersionKey(reference))) continue;
    throw new Error(
      `Tool output returned source "${reference.sourceType}:${reference.sourceId}@${reference.version}" without a discovered evidence receipt; expected every returned exact reference in durable lineage.`,
    );
  }
}

function extractSourceVersions(value: unknown): SourceVersionReference[] {
  const references: SourceVersionReference[] = [];
  const visited = new Set<object>();
  visitSourceValues(value, references, visited);
  return references;
}

function visitSourceValues(
  value: unknown,
  references: SourceVersionReference[],
  visited: Set<object>,
): void {
  if (typeof value !== "object" || value === null) return;
  if (visited.has(value)) return;
  visited.add(value);
  if (isExactSourceValue(value)) references.push(toSourceReference(value));
  if (Array.isArray(value)) {
    for (const entry of value) visitSourceValues(entry, references, visited);
    return;
  }
  for (const entry of Object.values(value)) {
    visitSourceValues(entry, references, visited);
  }
}

function isExactSourceValue(
  value: object,
): value is {
  readonly documentVersionId: string;
  readonly version: number;
  readonly checksum: { readonly algorithm: string; readonly value: string };
} {
  const candidate = value as Record<string, unknown>;
  const checksum = candidate.checksum;
  return typeof candidate.documentVersionId === "string" &&
    typeof candidate.version === "number" &&
    Number.isSafeInteger(candidate.version) && candidate.version > 0 &&
    typeof checksum === "object" && checksum !== null &&
    (checksum as Record<string, unknown>).algorithm === "sha256" &&
    typeof (checksum as Record<string, unknown>).value === "string" &&
    /^[0-9a-f]{64}$/.test(
      (checksum as Record<string, unknown>).value as string,
    );
}

function toSourceReference(value: {
  readonly documentVersionId: string;
  readonly version: number;
  readonly checksum: { readonly algorithm: string; readonly value: string };
}): SourceVersionReference {
  return {
    sourceType: "document_version",
    sourceId: value.documentVersionId,
    version: value.version as SourceVersionReference["version"],
    checksum: value.checksum.value,
  };
}

function assertSourceVersion(reference: SourceVersionReference): void {
  if (
    reference.sourceType.trim() && reference.sourceId.trim() &&
    Number.isSafeInteger(reference.version) && reference.version > 0 &&
    (reference.checksum === undefined ||
      /^[0-9a-f]{64}$/.test(reference.checksum))
  ) return;
  throw new Error(
    `Tool output discovered source "${reference.sourceType}:${reference.sourceId}@${reference.version}" is malformed; expected an exact positive version and checksum.`,
  );
}
