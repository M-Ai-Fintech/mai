import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import type { DeletionRequest } from "./deletion.ts";
import {
  type CheckpointId,
  checkpointId,
  type ErasureManifestId,
  erasureManifestId,
  type OrchestrationId,
  orchestrationId,
} from "./ids.ts";
import type { GovernanceScope } from "./model.ts";
import { DealGovernanceError, GovernanceInvariantError } from "./errors.ts";

export type OrchestrationState =
  | "queued"
  | "running"
  | "paused"
  | "failed"
  | "completed"
  | "blocked";
export type OrchestrationStepState =
  | "pending"
  | "running"
  | "retained"
  | "erased"
  | "skipped"
  | "failed";

export interface ErasureGate {
  readonly policyApproved: boolean;
  readonly infrastructureApproved: boolean;
  readonly physicalErasureEnabled: boolean;
}

export interface OrchestrationStep {
  readonly category: string;
  readonly state: OrchestrationStepState;
  readonly attemptCount: number;
  readonly reason?: string;
  readonly lastError?: string;
  readonly proofReference?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
}

export interface OrchestrationCheckpoint {
  readonly id: CheckpointId;
  readonly sequence: number;
  readonly completedCategory?: string;
  readonly nextCategory?: string;
  readonly aggregateVersion: AggregateVersion;
  readonly recordedAt: string;
}

export interface ErasureOrchestration {
  readonly aggregateType: "erasure_orchestration";
  readonly id: OrchestrationId;
  readonly scope: GovernanceScope;
  readonly requestId: string;
  readonly state: OrchestrationState;
  readonly gate: ErasureGate;
  readonly steps: readonly OrchestrationStep[];
  readonly nextStepIndex: number;
  readonly checkpoint: OrchestrationCheckpoint;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ManifestDisposition = "erased" | "retained" | "skipped";

export interface ErasureManifestEntry {
  readonly category: string;
  readonly disposition: ManifestDisposition;
  readonly reason: string;
  readonly proofReference?: string;
}

export interface ErasureManifest {
  readonly aggregateType: "erasure_manifest";
  readonly id: ErasureManifestId;
  readonly scope: GovernanceScope;
  readonly requestId: string;
  readonly orchestrationId: OrchestrationId;
  readonly entries: readonly ErasureManifestEntry[];
  readonly status: "draft" | "verified" | "blocked";
  readonly generatedAt: string;
  readonly verifiedAt?: string;
  readonly verifiedBy?: ActorId;
  readonly limitations: readonly string[];
}

export interface OrchestrationStepOutcome {
  readonly disposition: ManifestDisposition;
  readonly reason: string;
  readonly proofReference?: string;
}

export function createErasureOrchestration(input: {
  readonly request: DeletionRequest;
  readonly categories: readonly string[];
  readonly gate: ErasureGate;
  readonly now: string;
  readonly id?: OrchestrationId;
}): ErasureOrchestration {
  if (
    input.request.state !== "scheduled" && input.request.state !== "executing"
  ) {
    throw new DealGovernanceError(
      "ORCHESTRATION_BLOCKED",
      `Deletion request "${input.request.id}" is in state "${input.request.state}"; expected scheduled or executing before orchestration.`,
    );
  }
  assertCategories(input.categories);
  assertInstant(input.now, "orchestration creation time");
  const steps = input.categories.map((category) => ({
    category,
    state: "pending" as const,
    attemptCount: 0,
  }));
  return Object.freeze({
    aggregateType: "erasure_orchestration",
    id: input.id ??
      orchestrationId(`orchestration_${input.request.id.slice(9)}`),
    scope: Object.freeze({ ...input.request.scope }),
    requestId: input.request.id,
    state: input.gate.policyApproved && input.gate.infrastructureApproved
      ? "queued"
      : "blocked",
    gate: Object.freeze({ ...input.gate }),
    steps: Object.freeze(steps),
    nextStepIndex: 0,
    checkpoint: Object.freeze({
      id: checkpointId(`checkpoint_${input.request.id.slice(9)}-0`),
      sequence: 0,
      aggregateVersion: 1 as AggregateVersion,
      recordedAt: input.now,
    }),
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function startOrchestration(
  orchestration: ErasureOrchestration,
  expectedVersion: number,
  now: string,
): ErasureOrchestration {
  assertVersion(orchestration, expectedVersion);
  if (orchestration.state === "blocked") {
    throw new DealGovernanceError(
      "ORCHESTRATION_BLOCKED",
      `Orchestration "${orchestration.id}" is blocked by policy or infrastructure gates; expected explicit approvals before starting.`,
    );
  }
  if (
    orchestration.state !== "queued" && orchestration.state !== "failed" &&
    orchestration.state !== "paused"
  ) {
    throw new DealGovernanceError(
      "ORCHESTRATION_BLOCKED",
      `Orchestration "${orchestration.id}" state "${orchestration.state}" cannot start or resume; expected queued, failed, or paused.`,
    );
  }
  return updateOrchestration(orchestration, {
    state: "running",
    now,
    steps: orchestration.steps.map((step) =>
      step.state === "failed"
        ? { ...step, state: "pending", lastError: undefined }
        : step
    ),
  });
}

export function recordOrchestrationStep(
  orchestration: ErasureOrchestration,
  input: {
    readonly expectedVersion: number;
    readonly now: string;
    readonly outcome?: OrchestrationStepOutcome;
    readonly failure?: string;
  },
): ErasureOrchestration {
  assertVersion(orchestration, input.expectedVersion);
  if (orchestration.state !== "running") {
    throw new DealGovernanceError(
      "CHECKPOINT_CONFLICT",
      `Orchestration "${orchestration.id}" state "${orchestration.state}" cannot record a step; expected running state.`,
    );
  }
  const step = orchestration.steps[orchestration.nextStepIndex];
  if (step === undefined) {
    return updateOrchestration(orchestration, {
      state: "completed",
      now: input.now,
    });
  }
  const steps = [...orchestration.steps];
  if (input.failure !== undefined) {
    steps[orchestration.nextStepIndex] = {
      ...step,
      state: "failed",
      attemptCount: step.attemptCount + 1,
      lastError: input.failure.slice(0, 1000),
      startedAt: step.startedAt ?? input.now,
    };
    return updateOrchestration(orchestration, {
      state: "failed",
      now: input.now,
      steps,
    });
  }
  if (input.outcome === undefined) {
    throw new GovernanceInvariantError(
      `Orchestration "${orchestration.id}" step "${step.category}" has no outcome; expected a retained, skipped, or erased result.`,
    );
  }
  if (
    input.outcome.disposition === "erased" &&
    input.outcome.proofReference === undefined
  ) {
    throw new DealGovernanceError(
      "ERASURE_PROOF_REQUIRED",
      `Orchestration "${orchestration.id}" category "${step.category}" reported erased without a proof reference; expected exact downstream erasure proof.`,
    );
  }
  steps[orchestration.nextStepIndex] = {
    ...step,
    state: input.outcome.disposition,
    attemptCount: step.attemptCount + 1,
    reason: input.outcome.reason,
    proofReference: input.outcome.proofReference,
    startedAt: step.startedAt ?? input.now,
    completedAt: input.now,
  };
  const nextStepIndex = orchestration.nextStepIndex + 1;
  const state = nextStepIndex >= steps.length ? "completed" : "running";
  return updateOrchestration(orchestration, {
    state,
    now: input.now,
    steps,
    nextStepIndex,
    checkpoint: {
      id: checkpointId(
        `checkpoint_${orchestration.requestId.slice(9)}-${nextStepIndex}`,
      ),
      sequence: nextStepIndex,
      completedCategory: step.category,
      nextCategory: steps[nextStepIndex]?.category,
      aggregateVersion: (orchestration.version + 1) as AggregateVersion,
      recordedAt: input.now,
    },
  });
}

export function pauseOrchestration(
  orchestration: ErasureOrchestration,
  expectedVersion: number,
  now: string,
): ErasureOrchestration {
  assertVersion(orchestration, expectedVersion);
  if (orchestration.state !== "running") {
    throw new DealGovernanceError(
      "CHECKPOINT_CONFLICT",
      `Orchestration "${orchestration.id}" state "${orchestration.state}" cannot pause; expected running state.`,
    );
  }
  return updateOrchestration(orchestration, { state: "paused", now });
}

export function createErasureManifest(input: {
  readonly orchestration: ErasureOrchestration;
  readonly actorId?: ActorId;
  readonly now: string;
  readonly id?: ErasureManifestId;
}): ErasureManifest {
  assertInstant(input.now, "erasure manifest time");
  const entries = input.orchestration.steps.map((step) => ({
    category: step.category,
    disposition: step.state === "erased"
      ? "erased" as const
      : step.state === "skipped"
      ? "skipped" as const
      : "retained" as const,
    reason: step.lastError ?? step.reason ??
      (step.state === "erased"
        ? "Downstream erasure proof recorded."
        : input.orchestration.gate.physicalErasureEnabled
        ? "Retained by downstream disposition."
        : "Physical erasure is disabled by policy or infrastructure gate."),
    ...(step.proofReference === undefined
      ? {}
      : { proofReference: step.proofReference }),
  }));
  const status = input.orchestration.state === "completed"
    ? "verified" as const
    : input.orchestration.state === "blocked"
    ? "blocked" as const
    : "draft" as const;
  return Object.freeze({
    aggregateType: "erasure_manifest",
    id: input.id ?? erasureManifestId(
      `manifest_${
        input.orchestration.requestId.slice(9)
      }-${input.orchestration.version}`,
    ),
    scope: Object.freeze({ ...input.orchestration.scope }),
    requestId: input.orchestration.requestId,
    orchestrationId: input.orchestration.id,
    entries: Object.freeze(entries),
    status,
    generatedAt: input.now,
    ...(status === "verified" && input.actorId !== undefined
      ? { verifiedAt: input.now, verifiedBy: input.actorId }
      : {}),
    limitations: Object.freeze([
      ...(input.orchestration.gate.physicalErasureEnabled ? [] : [
        "Physical erasure was disabled; retained entries require downstream policy execution.",
      ]),
      "Manifest proof does not claim deletion of external files or records outside the governed scope.",
    ]),
  });
}

function updateOrchestration(
  orchestration: ErasureOrchestration,
  input: {
    readonly state: OrchestrationState;
    readonly now: string;
    readonly steps?: readonly OrchestrationStep[];
    readonly nextStepIndex?: number;
    readonly checkpoint?: OrchestrationCheckpoint;
  },
): ErasureOrchestration {
  assertInstant(input.now, "orchestration update time");
  return Object.freeze({
    ...orchestration,
    state: input.state,
    steps: Object.freeze([...(input.steps ?? orchestration.steps)]),
    nextStepIndex: input.nextStepIndex ?? orchestration.nextStepIndex,
    checkpoint: input.checkpoint ?? orchestration.checkpoint,
    version: (orchestration.version + 1) as AggregateVersion,
    updatedAt: input.now,
  });
}

function assertVersion(
  orchestration: ErasureOrchestration,
  expected: number,
): void {
  if (orchestration.version === expected) return;
  throw new DealGovernanceError(
    "CHECKPOINT_CONFLICT",
    `Orchestration "${orchestration.id}" version "${orchestration.version}" conflicts with expected version "${expected}".`,
  );
}

function assertCategories(categories: readonly string[]): void {
  if (categories.length === 0) {
    throw new GovernanceInvariantError(
      "Orchestration categories are empty; expected an explicit disposition scope.",
    );
  }
  for (const category of categories) {
    if (category.trim().length > 0 && category.length <= 128) continue;
    throw new GovernanceInvariantError(
      `Orchestration category "${category}" is invalid; expected 1-128 characters.`,
    );
  }
}

function assertInstant(value: string, label: string): void {
  if (Number.isFinite(Date.parse(value))) return;
  throw new GovernanceInvariantError(
    `${label} "${value}" is invalid; expected an ISO timestamp.`,
  );
}
