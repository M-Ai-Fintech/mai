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
import {
  assertSourceVersionReceipt,
  deduplicateSourceVersions,
  isLowercaseSha256Checksum,
  sourceVersionKey,
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
  /** Exact source versions discovered by this execution, if any. */
  readonly discoveredSourceVersions?: readonly SourceVersionReference[];
};

export type ToolOutputSemanticStatus =
  | "ok"
  | "proposal"
  | "denied"
  | "unavailable"
  | "stale"
  | "not_found"
  | "unknown";

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
  | {
    readonly status: "blocked";
    readonly semanticStatus: ToolOutputSemanticStatus;
    readonly output: ToolOutput;
    readonly authority: RuntimeAuthority;
    readonly reason: string;
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
      const normalizedOutput = normalizeToolOutput(output);
      const semanticStatus = blockedOutputStatus(normalizedOutput.value);
      if (semanticStatus !== undefined) {
        return {
          status: "blocked",
          semanticStatus,
          output: normalizedOutput,
          authority,
          reason: outputBlockReason(normalizedOutput.value, semanticStatus),
        };
      }
      return {
        status: "succeeded",
        output: normalizedOutput,
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

function blockedOutputStatus(
  value: Readonly<Record<string, unknown>>,
): ToolOutputSemanticStatus | undefined {
  const status = semanticStatus(value.status);
  return status === undefined || status === "ok" || status === "proposal"
    ? undefined
    : status;
}

function semanticStatus(value: unknown): ToolOutputSemanticStatus | undefined {
  if (typeof value !== "string") return undefined;
  return value === "ok" || value === "proposal" || value === "denied" ||
      value === "unavailable" || value === "stale" || value === "not_found"
    ? value
    : "unknown";
}

function outputBlockReason(
  value: Readonly<Record<string, unknown>>,
  status: ToolOutputSemanticStatus,
): string {
  const reasonCode = value.reasonCode;
  return typeof reasonCode === "string"
    ? `TOOL_OUTPUT_${status.toUpperCase()}:${reasonCode}`
    : `TOOL_OUTPUT_${status.toUpperCase()}`;
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

function normalizeToolOutput(output: ToolOutput): ToolOutput {
  const discovered = deduplicateSourceVersions(
    output.discoveredSourceVersions ?? [],
  );
  assertDiscoveredEvidence(output.value, discovered);
  if (discovered.length === (output.discoveredSourceVersions ?? []).length) {
    return output;
  }
  return {
    ...output,
    discoveredSourceVersions: Object.freeze([...discovered]),
  };
}

function assertDiscoveredEvidence(
  value: Readonly<Record<string, unknown>>,
  discovered: readonly SourceVersionReference[],
): void {
  for (const reference of discovered) assertSourceVersionReceipt(reference);
  const recorded = new Map(
    discovered.map((reference) => [sourceVersionKey(reference), reference]),
  );
  for (
    const reference of deduplicateSourceVersions(extractSourceVersions(value))
  ) {
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
  if (isDocumentVersionValue(value)) references.push(toSourceReference(value));
  if (Array.isArray(value)) {
    for (const entry of value) visitSourceValues(entry, references, visited);
    return;
  }
  for (const entry of Object.values(value)) {
    visitSourceValues(entry, references, visited);
  }
}

function isDocumentVersionValue(value: object): boolean {
  const candidate = value as Record<string, unknown>;
  return typeof candidate.documentVersionId === "string" &&
    Object.prototype.hasOwnProperty.call(candidate, "version");
}

function toSourceReference(value: object): SourceVersionReference {
  const candidate = value as Record<string, unknown>;
  const checksum = candidate.checksum;
  if (
    typeof candidate.version !== "number" ||
    !Number.isSafeInteger(candidate.version) || candidate.version <= 0 ||
    typeof checksum !== "object" || checksum === null ||
    (checksum as Record<string, unknown>).algorithm !== "sha256" ||
    !isLowercaseSha256Checksum((checksum as Record<string, unknown>).value)
  ) {
    throw new Error(
      `Tool output exact document version "${
        String(candidate.documentVersionId)
      }" is malformed; expected a positive version and lowercase 64-hex SHA-256 checksum.`,
    );
  }
  const reference: SourceVersionReference = {
    sourceType: "document_version",
    sourceId: candidate.documentVersionId as string,
    version: candidate.version as SourceVersionReference["version"],
    checksum: (checksum as Record<string, unknown>).value as string,
  };
  assertSourceVersionReceipt(reference);
  return reference;
}
