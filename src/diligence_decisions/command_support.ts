import type { ActorReference } from "../platform/authz/v1.ts";
import { action, resourceKind } from "../platform/authz/v1.ts";
import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import {
  IdempotencyConflictError,
  IdempotencyRepository,
  payloadDigest,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import { targetCommandType } from "../work_management/v1.ts";
import type {
  DecisionProjection,
  DecisionRecord,
  DecisionRequest,
  DiligenceScope,
  Finding,
  Impact,
} from "./model.ts";
import { assertExactBasis, type ExactEvidenceBasis } from "./basis.ts";
import { decisionTarget, resolveDecisionAuthority } from "./authority.ts";
import {
  type ChangeDecisionCommand,
  type ClaimResult,
  type CommandDependencies,
  type CommandInput,
  type DiligenceDecisionServiceConfig,
  type DiligenceIdempotencyPort,
  type RecordDecisionCommand,
} from "./contracts.ts";
import { DiligenceDecisionError } from "./errors.ts";
import type {
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";

export function createCommandDependencies(
  config: DiligenceDecisionServiceConfig,
): CommandDependencies {
  const clock = config.clock ?? { now: () => new Date() };
  return {
    config,
    clock,
    idempotency: config.idempotency ?? new IdempotencyRepository(clock),
  };
}

export async function authorize(
  dependencies: CommandDependencies,
  input: Pick<CommandInput, "context" | "scope">,
  kind: string,
  id: string,
  command: string,
): Promise<void> {
  assertContextScope(input.context, input.scope);
  const decision = await dependencies.config.authorization.authorize({
    context: input.context,
    scope: input.scope,
    resource: { kind: resourceKind(kind), id },
    action: action(command),
  });
  if (decision.outcome === "allow") return;
  throw new DiligenceDecisionError(
    "ACTOR_DENIED",
    `Actor "${input.context.actorId}" is denied command "${command}" for protected ${kind} "${id}"; expected an allowed authorization decision.`,
  );
}

export function assertActorMatchesContext(
  actor: ActorReference,
  context: RequestContext,
): void {
  if (actor.id === context.actorId) return;
  throw new DiligenceDecisionError(
    "ACTOR_DENIED",
    `Command actor "${actor.id}" differs from request actor "${context.actorId}"; expected one authenticated actor.`,
  );
}

export function assertContextScope(
  context: RequestContext,
  scope: DiligenceScope,
): void {
  if (
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw new DiligenceDecisionError(
    "SCOPE_MISMATCH",
    `Request actor "${context.actorId}" is outside tenant "${scope.tenantId}", workspace "${scope.workspaceId}", and deal "${scope.dealId}"; expected exact scope.`,
  );
}

export function verifyBasis(
  dependencies: CommandDependencies,
  input: Pick<CommandInput, "context" | "scope"> & {
    readonly basis: ExactEvidenceBasis;
  },
): Promise<void> {
  return dependencies.config.basis.verify(
    input.context,
    input.scope,
    input.basis,
  );
}

export async function claim(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  input: CommandInput,
  command: string,
  target: string,
  basis: ExactEvidenceBasis,
): Promise<ClaimResult> {
  const durableClaim = {
    tenantId: input.scope.tenantId,
    actorId: input.context.actorId,
    commandType: command,
    targetType: "diligence_decision",
    targetId: scopedTarget(input.scope, target),
    idempotencyKey: input.idempotencyKey,
    payloadDigest: await payloadDigest(commandPayload(input, basis)),
    expiresAt: new Date(dependencies.clock.now().getTime() + 86_400_000),
  };
  let result: Awaited<ReturnType<DiligenceIdempotencyPort["claim"]>>;
  try {
    result = await dependencies.idempotency.claim(transaction, durableClaim);
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      throw new DiligenceDecisionError(
        "IDEMPOTENCY_CONFLICT",
        error.message,
      );
    }
    throw error;
  }
  if (result.status === "claimed") {
    return { status: "claimed", claim: durableClaim };
  }
  if (result.status === "replay") {
    return { status: "replayed", resultReference: result.resultReference };
  }
  throw new DiligenceDecisionError(
    "IDEMPOTENCY_IN_PROGRESS",
    `Idempotency key "${input.idempotencyKey}" is already ${result.status}; expected the original command to finish before retry.`,
  );
}

export function complete(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  result: ClaimResult,
  reference: string,
): Promise<void> {
  if (result.status !== "claimed") return Promise.resolve();
  return dependencies.idempotency.complete(
    transaction,
    result.claim,
    reference,
  );
}

export function appendEffect(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  input: CommandInput,
  value:
    | Finding
    | Impact
    | DecisionRequest
    | DecisionRecord
    | DecisionProjection,
  eventType: string,
  basis: ExactEvidenceBasis,
  authority?: import("./model.ts").DecisionAuthoritySnapshot,
  actor?: ActorReference,
): Promise<void> {
  return dependencies.config.effects.append(transaction, {
    context: input.context,
    scope: input.scope,
    actor: actor ?? input.actor ?? serviceActor(input.context),
    aggregateType: valueType(value),
    aggregateId: valueId(value),
    aggregateVersion: valueVersion(value),
    eventType,
    payload: {
      state: "state" in value ? value.state : "recorded",
      basisDigest: basis.basisDigest,
    },
    basis,
    authority,
    occurredAt: dependencies.clock.now(),
  });
}

export async function resolveAuthority(
  dependencies: CommandDependencies,
  input: RecordDecisionCommand | ChangeDecisionCommand,
  command: string,
  requester: ActorReference,
) {
  const authorization = await dependencies.config.authorization.authorize({
    context: input.context,
    scope: input.scope,
    resource: { kind: resourceKind("decision_request"), id: input.requestId },
    action: action(command),
  });
  return resolveDecisionAuthority(dependencies.config.authority, {
    scope: input.scope,
    requester,
    namedApproverId: input.namedApproverId,
    target: decisionTarget(
      input.scope,
      input.requestId,
      input.expectedRequestVersion,
    ),
    requestedAction: targetCommandType(command),
    authorization,
  });
}

export function loadRequester(
  dependencies: CommandDependencies,
  scope: DiligenceScope,
  id: DecisionRequestId,
): Promise<ActorReference> {
  return dependencies.config.transactions.run(async (transaction) => {
    const request = await dependencies.config.repository.findDecisionRequest(
      transaction,
      scope,
      id,
    );
    if (request !== undefined) return request.requester;
    throw protectedNotFound(id);
  });
}

export async function loadRequest(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  id: DecisionRequestId,
  forUpdate = false,
): Promise<DecisionRequest> {
  const value = await dependencies.config.repository.findDecisionRequest(
    transaction,
    scope,
    id,
    forUpdate,
  );
  if (value !== undefined) return value;
  throw protectedNotFound(id);
}

export async function loadRecord(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  id: DecisionRecordId,
): Promise<DecisionRecord> {
  const value = await dependencies.config.repository.findDecisionRecord(
    transaction,
    scope,
    id,
  );
  if (value !== undefined) return value;
  throw protectedNotFound(id);
}

export async function loadFinding(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  id: FindingId,
): Promise<Finding> {
  const value = await dependencies.config.repository.findFinding(
    transaction,
    scope,
    id,
  );
  if (value !== undefined) return value;
  throw protectedNotFound(id);
}

export async function loadImpact(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  id: ImpactId,
): Promise<Impact> {
  const value = await dependencies.config.repository.findImpact(
    transaction,
    scope,
    id,
  );
  if (value !== undefined) return value;
  throw protectedNotFound(id);
}

export async function loadProjection(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  id: DecisionRequestId,
  forUpdate = false,
): Promise<DecisionProjection> {
  const value = await dependencies.config.repository.findProjection(
    transaction,
    scope,
    id,
    forUpdate,
  );
  if (value !== undefined) return value;
  throw protectedNotFound(id);
}

export async function loadSubject(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  subject: import("./model.ts").DecisionSubject,
): Promise<void> {
  if (subject.kind === "finding") {
    await loadFinding(dependencies, transaction, scope, subject.id);
    return;
  }
  const value = await dependencies.config.repository.findImpact(
    transaction,
    scope,
    subject.id,
  );
  if (value !== undefined) return;
  throw protectedNotFound(subject.id);
}

export function replayLoaded<T>(
  reference: string | undefined,
  loader: (id: string) => Promise<T | undefined>,
): Promise<{ readonly status: "replayed"; readonly value: T }> {
  const id = reference?.split(":")[1];
  if (id === undefined) throw protectedNotFound(reference ?? "replay");
  return loader(id).then((value) => {
    if (value === undefined) throw protectedNotFound(id);
    return { status: "replayed", value };
  });
}

export function assertExpectedVersion(
  actual: AggregateVersion,
  expected: AggregateVersion,
  id: string,
): void {
  if (actual === expected) return;
  throw new DiligenceDecisionError(
    "VERSION_CONFLICT",
    `Aggregate "${id}" is at version "${actual}"; expected exact version "${expected}".`,
  );
}

export function assertInvalidationVersion(
  actual: AggregateVersion,
  expected: AggregateVersion,
  id: string,
): void {
  if (actual === expected) return;
  throw new DiligenceDecisionError(
    "STALE_INVALIDATION",
    `Decision projection for request "${id}" is at version "${actual}"; expected exact invalidation version "${expected}".`,
  );
}

export function assertBasis(
  expected: ExactEvidenceBasis,
  actual: ExactEvidenceBasis,
  id: string,
): void {
  assertExactBasis(expected, actual, id);
}

export function protectedNotFound(id: string): DiligenceDecisionError {
  return new DiligenceDecisionError(
    "PROTECTED_NOT_FOUND",
    `Protected Diligence record "${id}" was not found; expected one authorized scoped record.`,
  );
}

export function referenceMismatch(
  actual: string,
  expected: string,
): DiligenceDecisionError {
  return new DiligenceDecisionError(
    "REFERENCE_MISMATCH",
    `Decision projection targets record "${expected}"; command supplied record "${actual}".`,
  );
}

export function historyId(
  recordId: string,
  kind = "recorded",
): import("./ids.ts").DecisionHistoryId {
  return `decision_history_${
    recordId.replace("decision_record_", "")
  }-${kind}` as import("./ids.ts").DecisionHistoryId;
}

function commandPayload(
  input: CommandInput,
  basis: ExactEvidenceBasis,
): Readonly<Record<string, unknown>> {
  const commandInput = input as CommandInput & {
    readonly basis?: ExactEvidenceBasis;
  };
  const {
    context: _context,
    idempotencyKey: _key,
    basis: _inputBasis,
    ...commandFields
  } = commandInput;
  return {
    scope: input.scope,
    actorId: input.context.actorId,
    basisDigest: basis.basisDigest,
    commandFields,
  };
}

function scopedTarget(scope: DiligenceScope, id: string): string {
  return `${scope.tenantId}/${scope.workspaceId}/${scope.dealId}/${id}`;
}

function serviceActor(context: RequestContext): ActorReference {
  return { id: context.actorId, kind: "service", state: "active" };
}

function valueType(
  value:
    | Finding
    | Impact
    | DecisionRequest
    | DecisionRecord
    | DecisionProjection,
): string {
  if ("aggregateType" in value) return value.aggregateType;
  if ("outcome" in value) return "decision_record";
  return "decision_projection";
}

function valueId(
  value:
    | Finding
    | Impact
    | DecisionRequest
    | DecisionRecord
    | DecisionProjection,
): string {
  if ("id" in value) return value.id;
  return value.requestId;
}

function valueVersion(
  value:
    | Finding
    | Impact
    | DecisionRequest
    | DecisionRecord
    | DecisionProjection,
): AggregateVersion {
  if ("version" in value) return value.version;
  if ("requestVersion" in value) return value.requestVersion;
  return 1 as AggregateVersion;
}
