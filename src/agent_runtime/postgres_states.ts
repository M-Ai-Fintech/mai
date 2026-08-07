import type {
  ArtifactRecord,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RunRecord,
  RuntimeActor,
  RuntimeAttemptRecord,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";

export function actorKind(value: string): RuntimeActor["kind"] {
  if (value === "human" || value === "ai" || value === "service") return value;
  throw new Error(
    `Runtime actor kind "${value}" is invalid; expected human, ai, or service.`,
  );
}

export function actorState(value: string): RuntimeActor["state"] {
  if (value === "active" || value === "inactive" || value === "revoked") {
    return value;
  }
  throw new Error(
    `Runtime actor state "${value}" is invalid; expected active, inactive, or revoked.`,
  );
}

export function missionState(value: string): MissionRecord["state"] {
  if (["draft", "active", "cancelled", "completed", "failed"].includes(value)) {
    return value as MissionRecord["state"];
  }
  throw new Error(
    `Mission state "${value}" is invalid; expected a durable mission state.`,
  );
}

export function planState(value: string): PlanRecord["state"] {
  if (["proposed", "active", "superseded", "cancelled"].includes(value)) {
    return value as PlanRecord["state"];
  }
  throw new Error(
    `Plan state "${value}" is invalid; expected a durable plan state.`,
  );
}

export function runState(value: string): RunRecord["state"] {
  if (
    [
      "queued",
      "running",
      "retry_scheduled",
      "succeeded",
      "failed",
      "cancelled",
      "invalidated",
      "dead_lettered",
    ].includes(value)
  ) {
    return value as RunRecord["state"];
  }
  throw new Error(
    `Run state "${value}" is invalid; expected a durable run state.`,
  );
}

export function stepKind(value: string): StepRecord["kind"] {
  if (value === "tool" || value === "model" || value === "compute") {
    return value;
  }
  throw new Error(
    `Step kind "${value}" is invalid; expected tool, model, or compute.`,
  );
}

export function stepState(value: string): StepRecord["state"] {
  if (
    [
      "queued",
      "running",
      "retry_scheduled",
      "succeeded",
      "failed",
      "cancelled",
      "invalidated",
    ].includes(value)
  ) {
    return value as StepRecord["state"];
  }
  throw new Error(
    `Step state "${value}" is invalid; expected a durable step state.`,
  );
}

export function activityState(value: string): ToolActivityRecord["state"] {
  if (
    ["requested", "authorized", "denied", "started", "succeeded", "failed"]
      .includes(value)
  ) {
    return value as ToolActivityRecord["state"];
  }
  throw new Error(
    `Tool activity state "${value}" is invalid; expected a durable tool activity state.`,
  );
}

export function resultKind(value: string): ResultRecord["kind"] {
  if (["read", "proposal", "reversible_draft", "calculation"].includes(value)) {
    return value as ResultRecord["kind"];
  }
  throw new Error(
    `Result kind "${value}" is invalid; expected a safe runtime result kind.`,
  );
}

export function artifactState(value: string): ArtifactRecord["state"] {
  if (value === "draft" || value === "proposed" || value === "stale") {
    return value;
  }
  throw new Error(
    `Artifact state "${value}" is invalid; expected draft, proposed, or stale.`,
  );
}

export function attemptScope(value: string): RuntimeAttemptRecord["scope"] {
  if (value === "run" || value === "step") return value;
  throw new Error(`Attempt scope "${value}" is invalid; expected run or step.`);
}

export function attemptRecordKind(
  value: string,
): RuntimeAttemptRecord["recordKind"] {
  if (value === "started" || value === "completed") return value;
  throw new Error(
    `Attempt record kind "${value}" is invalid; expected started or completed.`,
  );
}
