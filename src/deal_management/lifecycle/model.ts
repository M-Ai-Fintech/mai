import type { AggregateVersion } from "../../platform/api/v1.ts";
import type { DealId } from "../ids.ts";
import {
  assertLifecycleInstant,
  type DealLifecycleAggregate,
  DealLifecycleError,
  type DealLifecycleState,
  type DealMilestone,
  type DealMilestoneState,
  type LifecycleChange,
  type LifecycleHistoryRecord,
  type LifecyclePrerequisite,
  type LifecyclePrerequisiteCheck,
  type MilestoneId,
  milestoneId,
  validLifecycleTimestamp,
} from "./contracts.ts";
import { lifecycleRule, milestoneRule } from "./transition_tables.ts";
import {
  assertPrerequisites,
  evaluateLifecyclePrerequisites,
  evaluateMilestonePrerequisites,
} from "./prerequisites.ts";

export { DealLifecycleError, milestoneId } from "./contracts.ts";

export function createInitialLifecycle(input: {
  readonly dealId: DealId;
  readonly tenantId: DealLifecycleAggregate["tenantId"];
  readonly workspaceId: DealLifecycleAggregate["workspaceId"];
  readonly version: AggregateVersion | number;
}): DealLifecycleAggregate {
  return freezeLifecycle({
    dealId: input.dealId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    version: input.version as AggregateVersion,
    state: "draft",
    milestones: [],
  });
}

export function createMilestone(
  aggregate: DealLifecycleAggregate,
  input: {
    readonly id: MilestoneId;
    readonly key: string;
    readonly title: string;
    readonly prerequisites?: readonly LifecyclePrerequisite[];
    readonly dueAt?: string;
    readonly now: string;
  },
): LifecycleChange {
  assertText(input.key, "Milestone key", 64);
  assertText(input.title, "Milestone title", 200);
  assertLifecycleInstant(input.now, "Milestone creation time");
  assertUniqueMilestone(aggregate, input.id, input.key);
  const prerequisites = input.prerequisites ?? [];
  assertPrerequisiteShape(input.key, prerequisites);
  const milestone: DealMilestone = {
    id: input.id,
    key: input.key,
    title: input.title,
    state: "planned",
    prerequisites: Object.freeze([...prerequisites]),
    ...(input.dueAt === undefined
      ? {}
      : { dueAt: validLifecycleTimestamp(input.dueAt) }),
    createdAt: input.now,
    updatedAt: input.now,
  };
  return change(aggregate, {
    subjectType: "milestone",
    subjectId: input.id,
    previousState: undefined,
    nextState: "planned",
    prerequisites: [],
    milestones: [...aggregate.milestones, milestone],
  });
}

export function transitionLifecycle(
  aggregate: DealLifecycleAggregate,
  input: { readonly toState: DealLifecycleState },
): LifecycleChange {
  const rule = lifecycleRule(aggregate.state, input.toState);
  if (rule === undefined) {
    throw invalidTransition(aggregate.state, input.toState, "lifecycle");
  }
  const prerequisites = evaluateLifecyclePrerequisites(aggregate, rule);
  assertPrerequisites(aggregate.dealId, prerequisites);
  return change(aggregate, {
    subjectType: "lifecycle",
    subjectId: aggregate.dealId,
    previousState: aggregate.state,
    nextState: input.toState,
    prerequisites,
    state: input.toState,
  });
}

export function transitionMilestone(
  aggregate: DealLifecycleAggregate,
  input: {
    readonly milestoneId: MilestoneId;
    readonly toState: DealMilestoneState;
    readonly now: string;
  },
): LifecycleChange {
  assertLifecycleInstant(input.now, "Milestone transition time");
  const index = aggregate.milestones.findIndex((milestone) =>
    milestone.id === input.milestoneId
  );
  if (index < 0) {
    throw new DealLifecycleError(
      "MILESTONE_NOT_FOUND",
      `Milestone "${input.milestoneId}" is not owned by Deal "${aggregate.dealId}"; expected an owned milestone identifier.`,
    );
  }
  const current = aggregate.milestones[index];
  const rule = milestoneRule(current.state, input.toState);
  if (rule === undefined) {
    throw invalidTransition(current.state, input.toState, "milestone");
  }
  const prerequisites = evaluateMilestonePrerequisites(aggregate, current);
  if (rule.requiresPrerequisites) {
    assertPrerequisites(current.key, prerequisites);
  }
  const next = {
    ...current,
    state: input.toState,
    updatedAt: input.now,
    ...(input.toState === "completed" ? { completedAt: input.now } : {}),
  } satisfies DealMilestone;
  const milestones = [...aggregate.milestones];
  milestones[index] = next;
  return change(aggregate, {
    subjectType: "milestone",
    subjectId: current.id,
    previousState: current.state,
    nextState: input.toState,
    prerequisites,
    milestones,
  });
}

export function cloneLifecycle(
  aggregate: DealLifecycleAggregate,
): DealLifecycleAggregate {
  return freezeLifecycle({
    ...aggregate,
    milestones: aggregate.milestones.map((milestone) => ({
      ...milestone,
      prerequisites: [...milestone.prerequisites],
    })),
  });
}

export function parseStoredLifecycle(value: unknown): DealLifecycleAggregate {
  const document = objectValue(value, "Deal lifecycle document");
  const state = lifecycleState(document.state);
  const milestones = arrayValue(
    document.milestones,
    "Deal lifecycle milestones",
  )
    .map(parseMilestone);
  return cloneLifecycle({
    dealId: text(document.dealId, "Deal lifecycle Deal ID") as DealId,
    tenantId: text(
      document.tenantId,
      "Deal lifecycle tenant ID",
    ) as DealLifecycleAggregate["tenantId"],
    workspaceId: text(
      document.workspaceId,
      "Deal lifecycle workspace ID",
    ) as DealLifecycleAggregate["workspaceId"],
    version: version(document.version),
    state,
    milestones,
  });
}

export function parseStoredLifecycleHistory(
  value: unknown,
): LifecycleHistoryRecord {
  const document = objectValue(value, "Deal lifecycle history");
  const subjectType = document.subjectType;
  if (subjectType !== "lifecycle" && subjectType !== "milestone") {
    throw new DealLifecycleError(
      "INVALID_MILESTONE",
      `Deal lifecycle history subject type "${
        String(subjectType)
      }" is invalid; expected lifecycle or milestone.`,
    );
  }
  const prerequisites = arrayValue(
    document.prerequisites,
    "Deal lifecycle history prerequisites",
  ).map(parsePrerequisiteCheck);
  return {
    transitionId: text(document.transitionId, "Deal transition ID"),
    eventId: text(document.eventId, "Deal lifecycle event ID"),
    tenantId: text(
      document.tenantId,
      "Deal lifecycle history tenant ID",
    ) as DealLifecycleAggregate["tenantId"],
    workspaceId: text(
      document.workspaceId,
      "Deal lifecycle history workspace ID",
    ) as DealLifecycleAggregate["workspaceId"],
    dealId: text(document.dealId, "Deal lifecycle history Deal ID") as DealId,
    aggregateVersion: version(document.aggregateVersion),
    subjectType,
    subjectId: text(document.subjectId, "Deal lifecycle history subject ID"),
    previousState: document.previousState === undefined
      ? undefined
      : subjectState(document.previousState, subjectType),
    nextState: subjectState(document.nextState, subjectType),
    prerequisites,
    actorId: text(document.actorId, "Deal lifecycle history actor ID"),
    correlationId: text(
      document.correlationId,
      "Deal lifecycle history correlation ID",
    ),
    occurredAt: validLifecycleTimestamp(
      text(document.occurredAt, "Deal lifecycle history occurred time"),
    ),
  };
}
function parseMilestone(value: unknown): DealMilestone {
  const document = objectValue(value, "Deal milestone");
  const prerequisites = arrayValue(
    document.prerequisites,
    "Deal milestone prerequisites",
  ).map(parsePrerequisite);
  return {
    id: milestoneId(text(document.id, "Deal milestone ID")),
    key: boundedText(document.key, "Deal milestone key", 64),
    title: boundedText(document.title, "Deal milestone title", 200),
    state: milestoneState(document.state),
    prerequisites,
    ...(document.dueAt === undefined ? {} : {
      dueAt: validLifecycleTimestamp(text(
        document.dueAt,
        "Deal milestone due time",
      )),
    }),
    createdAt: validLifecycleTimestamp(
      text(document.createdAt, "Deal milestone creation time"),
    ),
    updatedAt: validLifecycleTimestamp(
      text(document.updatedAt, "Deal milestone update time"),
    ),
    ...(document.completedAt === undefined ? {} : {
      completedAt: validLifecycleTimestamp(
        text(document.completedAt, "Deal milestone completion time"),
      ),
    }),
  };
}

function parsePrerequisite(value: unknown): LifecyclePrerequisite {
  const document = objectValue(value, "Deal milestone prerequisite");
  const key = boundedText(document.key, "Deal prerequisite key", 64);
  if (document.state !== "completed") {
    throw new DealLifecycleError(
      "INVALID_MILESTONE",
      `Deal prerequisite state "${
        String(document.state)
      }" is invalid; expected "completed".`,
    );
  }
  return { key, state: "completed" };
}

function parsePrerequisiteCheck(value: unknown): LifecyclePrerequisiteCheck {
  const document = objectValue(value, "Deal lifecycle prerequisite check");
  const actualState = document.actualState;
  if (
    actualState !== "missing" && actualState !== "planned" &&
    actualState !== "active" && actualState !== "blocked" &&
    actualState !== "completed" && actualState !== "cancelled"
  ) {
    throw new DealLifecycleError(
      "INVALID_MILESTONE",
      `Deal lifecycle prerequisite actual state "${
        String(actualState)
      }" is invalid; expected a milestone state or missing.`,
    );
  }
  if (document.requiredState !== "completed") {
    throw new DealLifecycleError(
      "INVALID_MILESTONE",
      `Deal lifecycle prerequisite required state "${
        String(document.requiredState)
      }" is invalid; expected completed.`,
    );
  }
  if (typeof document.satisfied !== "boolean") {
    throw new DealLifecycleError(
      "INVALID_MILESTONE",
      `Deal lifecycle prerequisite satisfied value "${
        String(document.satisfied)
      }" is invalid; expected a boolean.`,
    );
  }
  return {
    key: boundedText(document.key, "Deal lifecycle prerequisite key", 64),
    requiredState: "completed",
    actualState,
    satisfied: document.satisfied,
  };
}

function subjectState(
  value: unknown,
  subjectType: "lifecycle" | "milestone",
): DealLifecycleState | DealMilestoneState {
  return subjectType === "lifecycle"
    ? lifecycleState(value)
    : milestoneState(value);
}

function change(
  aggregate: DealLifecycleAggregate,
  input: {
    readonly state?: DealLifecycleState;
    readonly milestones?: readonly DealMilestone[];
    readonly subjectType: LifecycleChange["subjectType"];
    readonly subjectId: string;
    readonly previousState: LifecycleChange["previousState"];
    readonly nextState: LifecycleChange["nextState"];
    readonly prerequisites: LifecycleChange["prerequisites"];
  },
): LifecycleChange {
  return {
    aggregate: freezeLifecycle({
      ...aggregate,
      version: (aggregate.version + 1) as AggregateVersion,
      state: input.state ?? aggregate.state,
      milestones: input.milestones ?? aggregate.milestones,
    }),
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    previousState: input.previousState,
    nextState: input.nextState,
    prerequisites: input.prerequisites,
  };
}

function assertUniqueMilestone(
  aggregate: DealLifecycleAggregate,
  id: MilestoneId,
  key: string,
): void {
  if (aggregate.milestones.some((milestone) => milestone.id === id)) {
    throw new DealLifecycleError(
      "DUPLICATE_MILESTONE",
      `Milestone ID "${id}" already exists in Deal "${aggregate.dealId}"; expected a unique owned milestone identifier.`,
    );
  }
  if (aggregate.milestones.some((milestone) => milestone.key === key)) {
    throw new DealLifecycleError(
      "DUPLICATE_MILESTONE",
      `Milestone key "${key}" already exists in Deal "${aggregate.dealId}"; expected one milestone per semantic key.`,
    );
  }
}

function assertPrerequisiteShape(
  key: string,
  prerequisites: readonly LifecyclePrerequisite[],
): void {
  const keys = new Set<string>();
  for (const prerequisite of prerequisites) {
    if (prerequisite.state !== "completed" || keys.has(prerequisite.key)) {
      throw new DealLifecycleError(
        "INVALID_MILESTONE",
        `Milestone "${key}" has prerequisite "${prerequisite.key}" more than once or with an invalid state; expected unique completed prerequisites.`,
      );
    }
    if (prerequisite.key === key) {
      throw new DealLifecycleError(
        "IMPOSSIBLE_PREREQUISITE",
        `Milestone "${key}" requires itself; expected a prerequisite owned by another milestone.`,
      );
    }
    keys.add(prerequisite.key);
  }
}

function invalidTransition(
  from: string,
  to: string,
  subject: string,
): DealLifecycleError {
  return new DealLifecycleError(
    "INVALID_TRANSITION",
    `${subject} transition from "${from}" to "${to}" is invalid; expected an edge in the approved transition table.`,
  );
}

function freezeLifecycle(
  aggregate: DealLifecycleAggregate,
): DealLifecycleAggregate {
  return Object.freeze({
    ...aggregate,
    milestones: Object.freeze(
      aggregate.milestones.map((milestone) =>
        Object.freeze({
          ...milestone,
          prerequisites: Object.freeze([...milestone.prerequisites]),
        })
      ),
    ),
  });
}

function lifecycleState(value: unknown): DealLifecycleState {
  if (
    value === "draft" || value === "sourcing" || value === "due_diligence" ||
    value === "negotiation" || value === "closing" || value === "completed" ||
    value === "archived"
  ) return value;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `Deal lifecycle state "${
      String(value)
    }" is invalid; expected an approved lifecycle state.`,
  );
}

function milestoneState(value: unknown): DealMilestoneState {
  if (
    value === "planned" || value === "active" || value === "blocked" ||
    value === "completed" || value === "cancelled"
  ) return value;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `Deal milestone state "${
      String(value)
    }" is invalid; expected an approved milestone state.`,
  );
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `${label} received ${String(value)}; expected a JSON object.`,
  );
}

function arrayValue(value: unknown, label: string): readonly unknown[] {
  if (Array.isArray(value)) return value;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `${label} received ${String(value)}; expected a JSON array.`,
  );
}

function text(value: unknown, label: string): string {
  if (typeof value === "string") return value;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `${label} received ${String(value)}; expected a string.`,
  );
}

function boundedText(value: unknown, label: string, maximum: number): string {
  const parsed = text(value, label);
  if (parsed.trim().length > 0 && parsed.length <= maximum) return parsed;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `${label} "${parsed}" is invalid; expected 1-${maximum} characters.`,
  );
}

function version(value: unknown): AggregateVersion {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value as AggregateVersion;
  }
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `Deal lifecycle version "${
      String(value)
    }" is invalid; expected a positive integer.`,
  );
}

function assertText(value: string, label: string, maximum: number): void {
  if (value.trim().length > 0 && value.length <= maximum) return;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}
