import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion, IdempotencyKey } from "../platform/api/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import type { ClosingEffects } from "./effects.ts";
import type { ConditionId } from "./ids.ts";
import {
  type ClosingBlocker,
  ClosingError,
  type ClosingScope,
  type ClosingWorkspace,
  evaluateReadiness,
  freezeWorkspace,
} from "./model.ts";
import type {
  ClosingCommandIdentity,
  ClosingTransaction,
} from "./repository.ts";
import { isIrreversibleStatus } from "./transitions.ts";

export type WorkspaceChanges = Partial<
  Pick<
    ClosingWorkspace,
    | "status"
    | "requirements"
    | "conditions"
    | "waivers"
    | "readiness"
    | "signatures"
    | "signaturePackages"
    | "blockers"
    | "completion"
  >
>;

export function recordCreation(
  workspace: ClosingWorkspace,
  actor: ActorReference,
  now: string,
): ClosingWorkspace {
  return freezeWorkspace({
    ...workspace,
    history: [{
      eventId: "closing_event_1-created",
      version: workspace.version,
      type: "closing_created",
      actor: Object.freeze({ ...actor }),
      occurredAt: now,
      payload: {},
    }],
  });
}

export function recordMutation(
  workspace: ClosingWorkspace,
  changes: WorkspaceChanges,
  actor: ActorReference,
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
  now: string,
  authorityProofId?: string,
): ClosingWorkspace {
  const version = nextVersion(workspace.version);
  const eventId = `closing_event_${version}-${eventSlug(eventType)}`;
  return freezeWorkspace({
    ...workspace,
    ...changes,
    version,
    updatedAt: now,
    history: [...workspace.history, {
      eventId,
      version,
      type: eventType,
      actor: Object.freeze({ ...actor }),
      ...(authorityProofId === undefined ? {} : { authorityProofId }),
      occurredAt: now,
      payload: Object.freeze({ ...payload }),
    }],
  });
}

export async function appendEffects(
  effects: ClosingEffects,
  transaction: ClosingTransaction,
  workspace: ClosingWorkspace,
  actor: ActorReference,
  eventType: string,
  authorityProofId?: string,
  withJob = false,
): Promise<void> {
  const event = workspace.history.at(-1);
  if (event === undefined) return;
  const kinds = withJob
    ? ["audit", "outbox", "job"] as const
    : ["audit", "outbox"] as const;
  for (const kind of kinds) {
    await effects.append(transaction, {
      effectId: `${event.eventId}:${kind}`,
      kind,
      tenantId: workspace.scope.tenantId,
      workspaceId: workspace.scope.workspaceId,
      dealId: workspace.scope.dealId,
      aggregateId: workspace.closingWorkspaceId,
      aggregateVersion: workspace.version,
      eventType,
      actor,
      ...(authorityProofId === undefined ? {} : { authorityProofId }),
      payload: event.payload,
      occurredAt: event.occurredAt,
    });
  }
}

export async function commandIdentity(
  scope: ClosingScope,
  actor: ActorReference,
  commandType: string,
  targetId: string,
  idempotencyKey: IdempotencyKey,
  payload: unknown,
  recordedAt: string,
): Promise<ClosingCommandIdentity> {
  return {
    ...scope,
    actorId: actor.id,
    commandType,
    targetId,
    idempotencyKey,
    payloadDigest: await payloadDigest({
      commandType,
      scope,
      targetId,
      payload,
    }),
    recordedAt,
  };
}

export function replaceCondition(
  workspace: ClosingWorkspace,
  conditionId: ConditionId,
  update: (
    condition: ClosingWorkspace["conditions"][number],
  ) => ClosingWorkspace["conditions"][number],
): ClosingWorkspace["conditions"] {
  let found = false;
  const conditions = workspace.conditions.map((condition) => {
    if (condition.conditionId !== conditionId) return condition;
    found = true;
    return update(condition);
  });
  if (!found) {
    throw new ClosingError(
      "PROTECTED_NOT_FOUND",
      `Closing condition "${conditionId}" was not found; expected a condition in the requested workspace.`,
    );
  }
  return conditions;
}

export function replaceConditionByWaiver(
  workspace: ClosingWorkspace,
  waiverId: string,
  state: "waived",
): ClosingWorkspace["conditions"] {
  const waiver = workspace.waivers.find((item) => item.waiverId === waiverId);
  if (waiver === undefined) {
    throw new ClosingError(
      "PROTECTED_NOT_FOUND",
      `Closing waiver "${waiverId}" was not found; expected a waiver in the requested workspace.`,
    );
  }
  return replaceCondition(
    workspace,
    waiver.conditionId,
    (condition) => ({ ...condition, state }),
  );
}

export function replaceWaiver(
  workspace: ClosingWorkspace,
  waiverId: string,
  update: (
    waiver: ClosingWorkspace["waivers"][number],
  ) => ClosingWorkspace["waivers"][number],
): ClosingWorkspace["waivers"] {
  let found = false;
  const waivers = workspace.waivers.map((waiver) => {
    if (waiver.waiverId !== waiverId) return waiver;
    found = true;
    return update(waiver);
  });
  if (!found) {
    throw new ClosingError(
      "PROTECTED_NOT_FOUND",
      `Closing waiver "${waiverId}" was not found; expected a waiver in the requested workspace.`,
    );
  }
  return waivers;
}

export function replaceBlocker(
  workspace: ClosingWorkspace,
  blockerId: string,
  update: (blocker: ClosingBlocker) => ClosingBlocker,
): ClosingWorkspace["blockers"] {
  let found = false;
  const blockers = workspace.blockers.map((blocker) => {
    if (blocker.blockerId !== blockerId) return blocker;
    found = true;
    return update(blocker);
  });
  if (!found) {
    throw new ClosingError(
      "PROTECTED_NOT_FOUND",
      `Closing blocker "${blockerId}" was not found; expected a blocker in the requested workspace.`,
    );
  }
  return blockers;
}

export function replaceSignatureEvidence(
  workspace: ClosingWorkspace,
  evidenceId: string,
  update: (
    evidence: ClosingWorkspace["signatures"][number],
  ) => ClosingWorkspace["signatures"][number],
): ClosingWorkspace["signatures"] {
  let found = false;
  const signatures = workspace.signatures.map((evidence) => {
    if (evidence.signatureEvidenceId !== evidenceId) return evidence;
    found = true;
    return update(evidence);
  });
  if (!found) {
    throw new ClosingError(
      "PROTECTED_NOT_FOUND",
      `Signature evidence "${evidenceId}" was not found; expected evidence belonging to the requested workspace.`,
    );
  }
  return signatures;
}

export function replaceSignaturePackage(
  workspace: ClosingWorkspace,
  packageId: string,
  update: (
    signaturePackage: ClosingWorkspace["signaturePackages"][number],
  ) => ClosingWorkspace["signaturePackages"][number],
): ClosingWorkspace["signaturePackages"] {
  let found = false;
  const signaturePackages = workspace.signaturePackages.map(
    (signaturePackage) => {
      if (signaturePackage.signaturePackageId !== packageId) {
        return signaturePackage;
      }
      found = true;
      return update(signaturePackage);
    },
  );
  if (!found) {
    throw new ClosingError(
      "PROTECTED_NOT_FOUND",
      `Signature package "${packageId}" was not found; expected a package belonging to the requested workspace.`,
    );
  }
  return signaturePackages;
}

export function assertCompletionPreconditions(
  workspace: ClosingWorkspace,
  input: {
    readonly paymentsEvidence: readonly string[];
    readonly transferEvidence: readonly string[];
  },
): void {
  if (!workspace.confirmationEnabled) {
    throw new ClosingError(
      "IRREVERSIBLE_CONFIRMATION",
      "Closing confirmation is disabled; expected an explicit feature gate before irreversible completion.",
    );
  }
  if (workspace.readiness?.status !== "approved") {
    throw new ClosingError(
      "PREREQUISITE_BLOCKED",
      "Closing completion is blocked; expected an approved closing-readiness decision.",
    );
  }
  if (!evaluateReadiness(workspace).ready) {
    throw new ClosingError(
      "PREREQUISITE_BLOCKED",
      "Closing completion is blocked; expected every condition, blocker, and signature package prerequisite to be resolved.",
    );
  }
  if (
    input.paymentsEvidence.length === 0 || input.transferEvidence.length === 0
  ) {
    throw new ClosingError(
      "PREREQUISITE_BLOCKED",
      "Closing completion is blocked; expected payment and ownership-transfer evidence.",
    );
  }
}

export function assertHumanActor(actor: ActorReference, action: string): void {
  if (actor.kind === "human" && actor.state === "active") return;
  throw new ClosingError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Actor "${actor.id}" cannot ${action}; expected an active human actor for Closing commands.`,
  );
}

export function assertMutableWorkspace(
  workspace: ClosingWorkspace,
  commandType: string,
): void {
  if (
    workspace.completion !== undefined || isIrreversibleStatus(workspace.status)
  ) {
    throw new ClosingError(
      "IRREVERSIBLE_CONFIRMATION",
      `Closing workspace "${workspace.closingWorkspaceId}" cannot accept "${commandType}" after irreversible confirmation; expected compensation before completion.`,
    );
  }
}

export function protectedNotFound(workspaceId: string): ClosingError {
  return new ClosingError(
    "PROTECTED_NOT_FOUND",
    `Closing workspace "${workspaceId}" was not found; expected an authorized workspace in the requested scope.`,
  );
}

function nextVersion(version: AggregateVersion): AggregateVersion {
  const next = Number(version) + 1;
  if (Number.isSafeInteger(next)) return next as AggregateVersion;
  throw new ClosingError(
    "STALE_VERSION",
    `Closing aggregate version "${version}" cannot advance; expected a safe positive version.`,
  );
}

function eventSlug(eventType: string): string {
  return eventType.replace(/^closing_/, "").replaceAll("_", "-");
}
