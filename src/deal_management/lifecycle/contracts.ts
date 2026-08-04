import type {
  AggregateVersion,
  IdempotencyKey,
} from "../../platform/api/v1.ts";
import type { Deal, DealCommandContext, DealScope } from "../contracts.ts";
import type { DealId } from "../ids.ts";
import { DealError } from "../errors.ts";

declare const milestoneIdBrand: unique symbol;

export type DealLifecycleState =
  | "draft"
  | "sourcing"
  | "due_diligence"
  | "negotiation"
  | "closing"
  | "completed"
  | "archived";

export type DealMilestoneState =
  | "planned"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled";

export type MilestoneId = string & {
  readonly [milestoneIdBrand]: "MilestoneId";
};

export type LifecycleErrorCode =
  | "INVALID_TRANSITION"
  | "PREREQUISITE_BLOCKED"
  | "MILESTONE_NOT_FOUND"
  | "DUPLICATE_MILESTONE"
  | "INVALID_MILESTONE"
  | "IMPOSSIBLE_PREREQUISITE";

export interface LifecyclePrerequisite {
  readonly key: string;
  readonly state: "completed";
}

export interface LifecyclePrerequisiteCheck {
  readonly key: string;
  readonly requiredState: "completed";
  readonly actualState: DealMilestoneState | "missing";
  readonly satisfied: boolean;
}

export interface DealMilestone {
  readonly id: MilestoneId;
  readonly key: string;
  readonly title: string;
  readonly state: DealMilestoneState;
  readonly prerequisites: readonly LifecyclePrerequisite[];
  readonly dueAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
}

export interface DealLifecycleAggregate {
  readonly dealId: DealId;
  readonly tenantId: DealScope["tenantId"];
  readonly workspaceId: DealScope["workspaceId"];
  readonly version: AggregateVersion;
  readonly state: DealLifecycleState;
  readonly milestones: readonly DealMilestone[];
}

export type LifecycleSubjectType = "lifecycle" | "milestone";

export interface LifecycleChange {
  readonly aggregate: DealLifecycleAggregate;
  readonly subjectType: LifecycleSubjectType;
  readonly subjectId: string;
  readonly previousState: DealLifecycleState | DealMilestoneState | undefined;
  readonly nextState: DealLifecycleState | DealMilestoneState;
  readonly prerequisites: readonly LifecyclePrerequisiteCheck[];
}

export interface LifecycleHistoryRecord {
  readonly transitionId: string;
  readonly eventId: string;
  readonly tenantId: DealScope["tenantId"];
  readonly workspaceId: DealScope["workspaceId"];
  readonly dealId: DealId;
  readonly aggregateVersion: AggregateVersion;
  readonly subjectType: LifecycleSubjectType;
  readonly subjectId: string;
  readonly previousState: DealLifecycleState | DealMilestoneState | undefined;
  readonly nextState: DealLifecycleState | DealMilestoneState;
  readonly prerequisites: readonly LifecyclePrerequisiteCheck[];
  readonly actorId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

export interface LifecyclePersistenceMutation {
  readonly aggregate: DealLifecycleAggregate;
  readonly history?: LifecycleHistoryRecord;
}

export interface DealLifecycleTransaction {
  findLifecycle(
    scope: DealScope,
    dealId: DealId,
  ): Promise<DealLifecycleAggregate | undefined>;
}

export interface DealLifecycleRepository {
  findLifecycle(
    scope: DealScope,
    dealId: DealId,
  ): Promise<DealLifecycleAggregate | undefined>;
  listLifecycleHistory(
    scope: DealScope,
    dealId: DealId,
  ): Promise<readonly LifecycleHistoryRecord[]>;
}

export interface LifecycleIdFactory {
  nextMilestoneId(): MilestoneId;
  nextTransitionId(): string;
}

export interface TransitionLifecycleCommand {
  readonly type: "transition_lifecycle";
  readonly context: DealCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly toState: DealLifecycleState;
}

export interface CreateMilestoneCommand {
  readonly type: "create_milestone";
  readonly context: DealCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly milestoneId?: MilestoneId;
  readonly key: string;
  readonly title: string;
  readonly prerequisites?: readonly LifecyclePrerequisite[];
  readonly dueAt?: string;
}

export interface TransitionMilestoneCommand {
  readonly type: "transition_milestone";
  readonly context: DealCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly milestoneId: MilestoneId;
  readonly toState: DealMilestoneState;
}

export type LifecycleCommand =
  | TransitionLifecycleCommand
  | CreateMilestoneCommand
  | TransitionMilestoneCommand;

export type LifecycleOperation =
  | "lifecycle_transitioned"
  | "milestone_created"
  | "milestone_transitioned";

export interface LifecycleCommandResult {
  readonly operation: LifecycleOperation;
  readonly deal: Deal;
  readonly lifecycle: DealLifecycleAggregate;
}

export class DealLifecycleError extends DealError {
  constructor(
    readonly lifecycleCode: LifecycleErrorCode,
    message: string,
    readonly details: readonly LifecyclePrerequisiteCheck[] = [],
  ) {
    super("INVALID_INPUT", message);
    this.name = "DealLifecycleError";
  }
}

export function milestoneId(value: string): MilestoneId {
  if (/^milestone_[A-Za-z0-9_-]{1,120}$/.test(value)) {
    return value as MilestoneId;
  }
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `Milestone ID "${value}" is invalid; expected a milestone_ identifier with 1-120 suffix characters.`,
  );
}

export function assertLifecycleInstant(value: string, label: string): void {
  if (Number.isFinite(Date.parse(value))) return;
  throw new DealLifecycleError(
    "INVALID_MILESTONE",
    `${label} "${value}" is invalid; expected an ISO timestamp.`,
  );
}

export function validLifecycleTimestamp(value: string): string {
  assertLifecycleInstant(value, "Milestone timestamp");
  return value;
}
