import { action, resourceKind } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import {
  addDealParty,
  advanceDealVersion,
  assertDealVersion,
  assignDealRole,
  configureDeal,
  createDeal,
  setAuthorityConstraint,
  setMandate,
} from "./model.ts";
import {
  createInitialLifecycle,
  createMilestone,
  transitionLifecycle,
  transitionMilestone,
} from "./lifecycle/model.ts";
import type {
  AddDealPartyCommand,
  AssignDealRoleCommand,
  ConfigureDealCommand,
  CreateDealCommand,
  DealCommand,
  SetAuthorityConstraintCommand,
  SetMandateCommand,
} from "./commands.ts";
import type {
  CreateMilestoneCommand,
  DealLifecycleAggregate,
  LifecycleChange,
  LifecycleCommand,
  LifecycleIdFactory,
  TransitionLifecycleCommand,
  TransitionMilestoneCommand,
} from "./lifecycle/contracts.ts";
import {
  commandFingerprint,
  commandReceiptKey,
  createReceipt,
} from "./receipts.ts";
import { commandTarget } from "./commands.ts";
import type { AllowedAuthorizationDecision } from "../platform/authz/v1.ts";
import type {
  Deal,
  DealAuditEventFactory,
  DealAuthorizationInput,
  DealAuthorizationPort,
  DealClock,
  DealCommandContext,
  DealCommandResult,
  DealEvent,
  DealOperation,
} from "./contracts.ts";
import { dealScope, requestedDealFields } from "./contracts.ts";
import {
  DealAuthorizationError,
  DealInvariantError,
  DealProtectedNotFoundError,
} from "./errors.ts";
import type { DealIdFactory } from "./ids.ts";
import type {
  DealCommandClaim,
  DealCommandExecution,
  DealCommandTransaction,
  DealRepository,
} from "./repository.ts";

export const DEAL_RESOURCE = resourceKind("deal");
export const DEAL_ACTION = Object.freeze({
  create: action("create"),
  read: action("read"),
  configure: action("configure"),
  parties: action("configure_parties"),
  roles: action("configure_roles"),
  mandate: action("configure_mandate"),
  constraints: action("configure_constraints"),
  lifecycle: action("transition_lifecycle"),
  milestones: action("manage_milestones"),
});

export interface DealManagementDependencies {
  readonly repository: DealRepository;
  readonly authorization: DealAuthorizationPort;
  readonly ids: DealIdFactory;
  readonly clock: DealClock;
  readonly audit?: DealAuditEventFactory;
  readonly lifecycleIds?: LifecycleIdFactory;
}

export class DealManagementService {
  constructor(private readonly dependencies: DealManagementDependencies) {}

  async createDeal(command: CreateDealCommand): Promise<DealCommandResult> {
    const target = commandTarget(command);
    const authorization = await this.authorize(
      command.context,
      target,
      DEAL_ACTION.create,
      false,
    );
    return this.dependencies.repository.runIdempotent(
      this.claim(command, target),
      async (transaction) => {
        const id = command.dealId ?? this.dependencies.ids.nextDealId();
        const deal = createDeal({
          ...command,
          id,
          ...dealScope(command.context),
          now: this.now(),
        });
        return await this.persist(
          transaction,
          command,
          target,
          "created",
          deal,
          "DealCreated",
          { dealId: id },
          authorization,
        );
      },
    );
  }

  configureDeal(command: ConfigureDealCommand): Promise<DealCommandResult> {
    return this.update(
      command,
      DEAL_ACTION.configure,
      false,
      "configured",
      "DealConfigured",
      (deal) => configureDeal(deal, { ...command, now: this.now() }),
    );
  }

  addDealParty(command: AddDealPartyCommand): Promise<DealCommandResult> {
    return this.update(
      command,
      DEAL_ACTION.parties,
      false,
      "party_added",
      "DealPartyAdded",
      (deal) =>
        addDealParty(deal, {
          ...command,
          id: command.partyId ?? this.dependencies.ids.nextDealPartyId(),
          now: this.now(),
        }),
    );
  }

  assignDealRole(command: AssignDealRoleCommand): Promise<DealCommandResult> {
    return this.update(
      command,
      DEAL_ACTION.roles,
      false,
      "role_assigned",
      "DealRoleAssigned",
      (deal) =>
        assignDealRole(deal, {
          ...command,
          id: command.roleId ?? this.dependencies.ids.nextDealRoleId(),
          now: this.now(),
        }),
    );
  }

  setMandate(command: SetMandateCommand): Promise<DealCommandResult> {
    return this.update(
      command,
      DEAL_ACTION.mandate,
      true,
      "mandate_set",
      "MandateSet",
      (deal) =>
        setMandate(deal, {
          ...command,
          id: command.mandateId ?? this.dependencies.ids.nextMandateId(),
          now: this.now(),
        }),
    );
  }

  setAuthorityConstraint(
    command: SetAuthorityConstraintCommand,
  ): Promise<DealCommandResult> {
    return this.update(
      command,
      DEAL_ACTION.constraints,
      true,
      "authority_constraint_set",
      "AuthorityConstraintSet",
      (deal) =>
        setAuthorityConstraint(deal, {
          ...command,
          id: command.constraintId ??
            this.dependencies.ids.nextAuthorityConstraintId(),
          now: this.now(),
        }),
    );
  }

  transitionLifecycle(
    command: TransitionLifecycleCommand,
  ): Promise<DealCommandResult> {
    return this.lifecycleUpdate(
      command,
      DEAL_ACTION.lifecycle,
      "lifecycle_transitioned",
      "DealLifecycleTransitioned",
      (_, lifecycle) => transitionLifecycle(lifecycle, command),
    );
  }

  createMilestone(
    command: CreateMilestoneCommand,
  ): Promise<DealCommandResult> {
    return this.lifecycleUpdate(
      command,
      DEAL_ACTION.milestones,
      "milestone_created",
      "DealMilestoneCreated",
      (_, lifecycle) =>
        createMilestone(lifecycle, {
          id: command.milestoneId ?? this.nextMilestoneId(),
          key: command.key,
          title: command.title,
          prerequisites: command.prerequisites,
          dueAt: command.dueAt,
          now: this.now(),
        }),
    );
  }

  transitionMilestone(
    command: TransitionMilestoneCommand,
  ): Promise<DealCommandResult> {
    return this.lifecycleUpdate(
      command,
      DEAL_ACTION.milestones,
      "milestone_transitioned",
      "DealMilestoneTransitioned",
      (_, lifecycle) =>
        transitionMilestone(lifecycle, { ...command, now: this.now() }),
    );
  }

  async loadDeal(
    context: DealCommandContext,
    dealId: Deal["id"],
  ): Promise<Deal> {
    await this.authorize(context, dealId, DEAL_ACTION.read, false);
    const deal = await this.dependencies.repository.find(
      dealScope(context),
      dealId,
    );
    if (deal !== undefined) return deal;
    throw new DealProtectedNotFoundError(dealId);
  }

  private async update<
    T extends
      | ConfigureDealCommand
      | AddDealPartyCommand
      | AssignDealRoleCommand
      | SetMandateCommand
      | SetAuthorityConstraintCommand,
  >(
    command: T,
    commandAction: typeof DEAL_ACTION[keyof typeof DEAL_ACTION],
    humanOnly: boolean,
    operation: DealOperation,
    eventType: string,
    mutate: (deal: Deal) => Deal,
  ): Promise<DealCommandResult> {
    const authorization = await this.authorize(
      command.context,
      command.dealId,
      commandAction,
      humanOnly,
    );
    return this.dependencies.repository.runIdempotent(
      this.claim(command, command.dealId),
      async (transaction) => {
        const current = await transaction.find(
          dealScope(command.context),
          command.dealId,
        );
        if (current === undefined) {
          throw new DealProtectedNotFoundError(command.dealId);
        }
        const next = mutate(current);
        return await this.persist(
          transaction,
          command,
          command.dealId,
          operation,
          next,
          eventType,
          { dealId: command.dealId },
          authorization,
        );
      },
    );
  }

  private async persist(
    transaction: DealCommandTransaction,
    command: DealCommand,
    target: string,
    operation: DealOperation,
    deal: Deal,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
    authorization: AllowedAuthorizationDecision,
    lifecycleChange?: LifecycleChange,
  ): Promise<DealCommandExecution> {
    const event = this.event(command.context, deal, eventType, payload);
    const lifecycle = lifecycleChange?.aggregate;
    const result = {
      operation,
      deal,
      ...(lifecycle === undefined ? {} : { lifecycle }),
    };
    const receipt = createReceipt({
      key: commandReceiptKey(command, target),
      actorId: command.context.actor.id,
      commandType: command.type,
      targetId: target,
      fingerprint: commandFingerprint(command),
      result,
      sequence: event.eventId,
    });
    const auditEvent = this.dependencies.audit === undefined
      ? undefined
      : await this.dependencies.audit.create({
        context: command.context,
        event,
        authorization,
      });
    await transaction.save({
      scope: dealScope(command.context),
      aggregate: deal,
      expectedVersion: command.type === "create_deal"
        ? undefined
        : command.expectedVersion,
      event,
      receipt,
      auditEvent,
      ...(lifecycleChange === undefined ? {} : {
        lifecycle: {
          aggregate: lifecycleChange.aggregate,
          history: this.lifecycleHistory(command, deal, event, lifecycleChange),
        },
      }),
    });
    return { result, receipt };
  }

  private async lifecycleUpdate(
    command: LifecycleCommand,
    commandAction: typeof DEAL_ACTION[keyof typeof DEAL_ACTION],
    operation: DealCommandResult["operation"],
    eventType: string,
    mutate: (deal: Deal, lifecycle: DealLifecycleAggregate) => LifecycleChange,
  ): Promise<DealCommandResult> {
    const authorization = await this.authorize(
      command.context,
      command.dealId,
      commandAction,
      false,
    );
    return this.dependencies.repository.runIdempotent(
      this.claim(command, command.dealId),
      async (transaction) => {
        const current = await transaction.find(
          dealScope(command.context),
          command.dealId,
        );
        if (current === undefined) {
          throw new DealProtectedNotFoundError(command.dealId);
        }
        assertDealVersion(current, command.expectedVersion);
        const lifecycle = await currentLifecycle(transaction, current);
        const change = mutate(current, lifecycle);
        const next = advanceDealVersion(current, this.now());
        assertLifecycleVersion(change.aggregate, next);
        return await this.persist(
          transaction,
          command,
          command.dealId,
          operation,
          next,
          eventType,
          lifecyclePayload(change, authorization),
          authorization,
          change,
        );
      },
    );
  }

  private claim(
    command: DealCommand,
    target: string,
  ): DealCommandClaim {
    return {
      scope: dealScope(command.context),
      actorId: command.context.actor.id,
      commandType: command.type,
      targetId: target,
      idempotencyKey: command.idempotencyKey,
      key: commandReceiptKey(command, target),
      fingerprint: commandFingerprint(command),
    };
  }

  private async authorize(
    context: DealCommandContext,
    target: string,
    commandAction: typeof DEAL_ACTION[keyof typeof DEAL_ACTION],
    humanOnly: boolean,
  ): Promise<AllowedAuthorizationDecision> {
    const input: DealAuthorizationInput = {
      context,
      scope: dealScope(context),
      resource: { kind: DEAL_RESOURCE, id: target },
      action: commandAction,
      requestedFields: requestedDealFields(),
      ...(humanOnly ? { humanOnly: true } : {}),
    };
    const decision = await this.dependencies.authorization.authorize(input);
    if (decision.outcome === "allow") return decision;
    const code = decision.reasonCode === "HUMAN_AUTHORITY_REQUIRED"
      ? "HUMAN_AUTHORITY_REQUIRED"
      : "AUTHORIZATION_DENIED";
    throw new DealAuthorizationError(code, context.actor.id);
  }

  private event(
    context: DealCommandContext,
    deal: Deal,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ): DealEvent {
    const occurredAt = new Date(this.now());
    return {
      eventId: this.dependencies.ids.nextEventId(),
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
      dealId: deal.id,
      actorId: context.actor.id,
      actorKind: context.actor.kind,
      correlationId: context.request.correlationId,
      aggregateVersion: deal.version,
      eventType,
      schemaVersion: 1,
      payload,
      occurredAt,
      availableAt: occurredAt,
    };
  }

  private now(): string {
    return this.dependencies.clock.now();
  }

  private nextMilestoneId() {
    return this.dependencies.lifecycleIds?.nextMilestoneId() ??
      (`milestone_${crypto.randomUUID().replaceAll("-", "")}` as never);
  }

  private lifecycleHistory(
    command: { readonly context: DealCommandContext },
    deal: Deal,
    event: DealEvent,
    change: LifecycleChange,
  ) {
    return {
      transitionId: this.dependencies.lifecycleIds?.nextTransitionId() ??
        `transition_${crypto.randomUUID().replaceAll("-", "")}`,
      eventId: event.eventId,
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
      dealId: deal.id,
      aggregateVersion: deal.version,
      subjectType: change.subjectType,
      subjectId: change.subjectId,
      previousState: change.previousState,
      nextState: change.nextState,
      prerequisites: change.prerequisites,
      actorId: command.context.actor.id,
      correlationId: command.context.request.correlationId,
      occurredAt: event.occurredAt.toISOString(),
    };
  }
}

async function currentLifecycle(
  transaction: DealCommandTransaction,
  deal: Deal,
): Promise<DealLifecycleAggregate> {
  const lifecycle = await transaction.findLifecycle({
    tenantId: deal.tenantId,
    workspaceId: deal.workspaceId,
  }, deal.id);
  if (lifecycle === undefined) {
    return createInitialLifecycle({
      dealId: deal.id,
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
      version: deal.version,
    });
  }
  if (lifecycle.version === deal.version) return lifecycle;
  throw new DealInvariantError(
    `Deal lifecycle version "${lifecycle.version}" does not match Deal "${deal.id}" version "${deal.version}"; expected synchronized aggregate versions.`,
  );
}

function assertLifecycleVersion(
  lifecycle: DealLifecycleAggregate,
  deal: Deal,
): void {
  if (lifecycle.version === deal.version) return;
  throw new DealInvariantError(
    `Deal lifecycle version "${lifecycle.version}" does not match Deal "${deal.id}" version "${deal.version}"; expected one atomic aggregate version.`,
  );
}

function lifecyclePayload(
  change: LifecycleChange,
  authorization: AllowedAuthorizationDecision,
): Readonly<Record<string, unknown>> {
  return {
    subjectType: change.subjectType,
    subjectId: change.subjectId,
    ...(change.previousState === undefined
      ? {}
      : { previousState: change.previousState }),
    nextState: change.nextState,
    prerequisites: change.prerequisites,
    authorization: {
      reasonCode: authorization.reasonCode,
      allowedActions: authorization.allowedActions,
      approvedClassifications: authorization.fieldMask.approvedClassifications,
    },
  };
}

export type { AggregateVersion };
