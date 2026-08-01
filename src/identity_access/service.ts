import { assertHumanAdministrator } from "./errors.ts";
import type {
  AdministrationContext,
  IdentityAccessAggregate,
  IdentityAccessEvent,
  Institution,
  Invitation,
  Membership,
  PermissionGrant,
  Restriction,
  RevocableAggregate,
  Revocation,
  RolePolicy,
  UserIdentity,
  Workspace,
} from "./contracts.ts";
import type { InstitutionId, InvitationId, RevocationId } from "./ids.ts";
import { createIdentityAccessEvent } from "./events.ts";
import {
  type CommandIdempotencyStore,
  InMemoryCommandIdempotencyStore,
} from "./idempotency.ts";
import {
  createInstitution as buildInstitution,
  createWorkspace as buildWorkspace,
  suspendInstitution as buildSuspendedInstitution,
} from "./tenancy.ts";
import {
  acceptInvitation as buildAcceptedInvitation,
  createInvitation as buildInvitation,
  createInvitationFromToken as buildInvitationFromToken,
  createMembership as buildMembership,
  createUserIdentity as buildUserIdentity,
  expireInvitation as buildExpiredInvitation,
} from "./identity.ts";
import {
  createPermissionGrant as buildPermissionGrant,
  createRestriction as buildRestriction,
  createRolePolicy as buildRolePolicy,
} from "./access.ts";
import { revokeAggregate } from "./revocation.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import {
  commandEventType,
  createCommandClaim,
  notFound,
  payloadVersion,
  scopeFromContext,
} from "./service_helpers.ts";
import type { IdentityAccessServiceDependencies } from "./service_contracts.ts";

export type {
  IdentityAccessServiceDependencies,
  JobInvalidationPort,
  SessionInvalidationPort,
} from "./service_contracts.ts";

export class IdentityAccessService {
  private readonly idempotency: CommandIdempotencyStore;

  constructor(
    private readonly dependencies: IdentityAccessServiceDependencies,
  ) {
    this.idempotency = dependencies.idempotency ??
      new InMemoryCommandIdempotencyStore();
  }

  async createInstitution(
    input: Parameters<typeof buildInstitution>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Institution> {
    return await this.create(
      "institution.create",
      "institution",
      input.id,
      input,
      context,
      commandKey,
      () => buildInstitution(input, context),
    ) as Institution;
  }

  async suspendInstitution(
    institutionId: InstitutionId,
    input: { readonly expectedVersion: number; readonly reason: string },
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Institution> {
    const existing = await this.load(context, "institution", institutionId);
    if (existing === undefined || existing.aggregateType !== "institution") {
      throw new Error(
        `Institution "${institutionId}" was not found in tenant scope.`,
      );
    }
    return await this.update(
      "institution.suspend",
      "institution",
      institutionId,
      input,
      context,
      commandKey,
      () => buildSuspendedInstitution(existing, { ...input, context }),
    ) as Institution;
  }

  async createWorkspace(
    input: Parameters<typeof buildWorkspace>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Workspace> {
    return await this.create(
      "workspace.create",
      "workspace",
      input.id,
      input,
      context,
      commandKey,
      () => buildWorkspace(input, context),
    ) as Workspace;
  }

  async createUserIdentity(
    input: Parameters<typeof buildUserIdentity>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<UserIdentity> {
    return await this.create(
      "user_identity.create",
      "user_identity",
      input.id,
      input,
      context,
      commandKey,
      () => buildUserIdentity(input, context),
    ) as UserIdentity;
  }

  async createMembership(
    input: Parameters<typeof buildMembership>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Membership> {
    return await this.create(
      "membership.create",
      "membership",
      input.id,
      input,
      context,
      commandKey,
      () => buildMembership(input, context),
    ) as Membership;
  }

  async createInvitation(
    input: Parameters<typeof buildInvitation>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Invitation> {
    return await this.create(
      "invitation.create",
      "invitation",
      input.id,
      input,
      context,
      commandKey,
      () => buildInvitation(input, context),
    ) as Invitation;
  }

  async createInvitationFromToken(
    input: Parameters<typeof buildInvitationFromToken>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Invitation> {
    return await this.createAsync(
      "invitation.create",
      "invitation",
      input.id,
      input,
      context,
      commandKey,
      () => buildInvitationFromToken(input, context),
    ) as Invitation;
  }

  async createRolePolicy(
    input: Parameters<typeof buildRolePolicy>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<RolePolicy> {
    return await this.create(
      "role_policy.create",
      "role_policy",
      input.id,
      input,
      context,
      commandKey,
      () => buildRolePolicy(input, context),
    ) as RolePolicy;
  }

  async createPermissionGrant(
    input: Parameters<typeof buildPermissionGrant>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<PermissionGrant> {
    return await this.create(
      "permission_grant.create",
      "permission_grant",
      input.id,
      input,
      context,
      commandKey,
      () => buildPermissionGrant(input, context),
    ) as PermissionGrant;
  }

  async createRestriction(
    input: Parameters<typeof buildRestriction>[0],
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Restriction> {
    return await this.create(
      "restriction.create",
      "restriction",
      input.id,
      input,
      context,
      commandKey,
      () => buildRestriction(input, context),
    ) as Restriction;
  }

  async acceptInvitation(
    invitationId: InvitationId,
    input: { readonly expectedVersion: number },
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Invitation> {
    return await this.updateExisting(
      "invitation.accept",
      "invitation",
      invitationId,
      input,
      context,
      commandKey,
      (aggregate) => {
        if (aggregate.aggregateType !== "invitation") {
          throw notFound("invitation", invitationId);
        }
        return buildAcceptedInvitation(aggregate, { ...input, context });
      },
    ) as Invitation;
  }

  async expireInvitation(
    invitationId: InvitationId,
    input: { readonly expectedVersion: number },
    context: AdministrationContext,
    commandKey: string,
  ): Promise<Invitation> {
    return await this.updateExisting(
      "invitation.expire",
      "invitation",
      invitationId,
      input,
      context,
      commandKey,
      (aggregate) => {
        if (aggregate.aggregateType !== "invitation") {
          throw notFound("invitation", invitationId);
        }
        return buildExpiredInvitation(aggregate, { ...input, context });
      },
    ) as Invitation;
  }

  async revoke<TAggregate extends RevocableAggregate>(
    targetType: TAggregate["aggregateType"],
    targetId: string,
    input: {
      readonly revocationId: RevocationId;
      readonly expectedVersion: number;
      readonly reason: string;
      readonly invalidatedActorId?: ActorId;
    },
    context: AdministrationContext,
    commandKey: string,
  ): Promise<
    { readonly aggregate: TAggregate; readonly revocation: Revocation }
  > {
    const existing = await this.load(context, targetType, targetId);
    if (existing === undefined || existing.aggregateType !== targetType) {
      throw notFound(targetType, targetId);
    }
    const claim = createCommandClaim(
      `revoke.${targetType}`,
      targetType,
      targetId,
      input,
      context,
      commandKey,
    );
    const claimed = await this.idempotency.claim(claim);
    if (claimed.status === "replay") {
      return claimed.result as {
        readonly aggregate: TAggregate;
        readonly revocation: Revocation;
      };
    }
    const result = revokeAggregate(existing as TAggregate, {
      ...input,
      context,
    });
    await this.dependencies.repository.saveBatch([
      {
        aggregate: result.aggregate,
        expectedVersion: input.expectedVersion,
        event: this.event(result.aggregate, `${targetType}.revoked`, context),
      },
      {
        aggregate: result.revocation,
        expectedVersion: undefined,
        event: this.event(result.revocation, "revocation.created", context),
      },
    ]);
    await this.idempotency.complete(claim, result);
    if (input.invalidatedActorId !== undefined) {
      this.dependencies.sessionRegistry?.invalidateActor(
        input.invalidatedActorId,
        context.tenantId,
        context.now,
      );
      await this.dependencies.sessionInvalidation?.invalidateActor({
        tenantId: context.tenantId,
        actorId: input.invalidatedActorId,
        revokedAt: context.now,
      });
    }
    await this.dependencies.jobInvalidation?.invalidate({
      tenantId: context.tenantId,
      targetType,
      targetId,
    });
    return result;
  }

  async load(
    context: AdministrationContext,
    aggregateType: IdentityAccessAggregate["aggregateType"],
    aggregateId: string,
  ): Promise<IdentityAccessAggregate | undefined> {
    return await this.dependencies.repository.find(
      scopeFromContext(context),
      aggregateType,
      aggregateId,
    );
  }

  events(): readonly IdentityAccessEvent[] {
    const repository = this.dependencies.repository;
    return "events" in repository && typeof repository.events === "function"
      ? repository.events()
      : [];
  }

  private async create<TAggregate extends IdentityAccessAggregate>(
    commandType: string,
    targetType: TAggregate["aggregateType"],
    targetId: string,
    payload: unknown,
    context: AdministrationContext,
    commandKey: string,
    factory: () => TAggregate,
  ): Promise<TAggregate> {
    assertHumanAdministrator(context);
    const claim = createCommandClaim(
      commandType,
      targetType,
      targetId,
      payload,
      context,
      commandKey,
    );
    const claimed = await this.idempotency.claim(claim);
    if (claimed.status === "replay") return claimed.result as TAggregate;
    const aggregate = factory();
    const event = this.event(aggregate, `${targetType}.created`, context);
    await this.dependencies.repository.save(aggregate, undefined, event);
    await this.idempotency.complete(claim, aggregate);
    return aggregate;
  }

  private async createAsync<TAggregate extends IdentityAccessAggregate>(
    commandType: string,
    targetType: TAggregate["aggregateType"],
    targetId: string,
    payload: unknown,
    context: AdministrationContext,
    commandKey: string,
    factory: () => Promise<TAggregate>,
  ): Promise<TAggregate> {
    assertHumanAdministrator(context);
    const claim = createCommandClaim(
      commandType,
      targetType,
      targetId,
      payload,
      context,
      commandKey,
    );
    const claimed = await this.idempotency.claim(claim);
    if (claimed.status === "replay") return claimed.result as TAggregate;
    const aggregate = await factory();
    await this.dependencies.repository.save(
      aggregate,
      undefined,
      this.event(aggregate, `${targetType}.created`, context),
    );
    await this.idempotency.complete(claim, aggregate);
    return aggregate;
  }

  private async updateExisting<TAggregate extends IdentityAccessAggregate>(
    commandType: string,
    targetType: TAggregate["aggregateType"],
    targetId: string,
    payload: unknown,
    context: AdministrationContext,
    commandKey: string,
    factory: (aggregate: IdentityAccessAggregate) => TAggregate,
  ): Promise<TAggregate> {
    const existing = await this.load(context, targetType, targetId);
    if (existing === undefined) throw notFound(targetType, targetId);
    return await this.update(
      commandType,
      targetType,
      targetId,
      payload,
      context,
      commandKey,
      () => factory(existing),
    );
  }

  private async update<TAggregate extends IdentityAccessAggregate>(
    commandType: string,
    targetType: TAggregate["aggregateType"],
    targetId: string,
    payload: unknown,
    context: AdministrationContext,
    commandKey: string,
    factory: () => TAggregate,
  ): Promise<TAggregate> {
    const claim = createCommandClaim(
      commandType,
      targetType,
      targetId,
      payload,
      context,
      commandKey,
    );
    const claimed = await this.idempotency.claim(claim);
    if (claimed.status === "replay") return claimed.result as TAggregate;
    const aggregate = factory();
    const event = this.event(aggregate, commandEventType(commandType), context);
    await this.dependencies.repository.save(
      aggregate,
      payloadVersion(payload),
      event,
    );
    await this.idempotency.complete(claim, aggregate);
    return aggregate;
  }

  private event(
    aggregate: IdentityAccessAggregate,
    eventType: string,
    context: AdministrationContext,
  ): IdentityAccessEvent {
    return createIdentityAccessEvent({
      aggregate,
      eventId: this.dependencies.eventIdGenerator(),
      eventType,
      context,
    });
  }
}
