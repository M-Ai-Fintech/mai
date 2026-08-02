import { RegistryInvariantError } from "./errors.ts";
import type {
  ArchiveLegalEntityCommand,
  ArchiveOrganizationCommand,
  ArchivePersonCommand,
  CreateLegalEntityCommand,
  CreateOrganizationCommand,
  CreatePersonCommand,
  MergeLegalEntitiesCommand,
  MergeOrganizationsCommand,
  MergePeopleCommand,
  RegistryCommand,
  RegistryCommandResult,
  RestoreLegalEntityCommand,
  RestoreOrganizationCommand,
  RestorePersonCommand,
  UpdateLegalEntityCommand,
  UpdateOrganizationCommand,
  UpdatePersonCommand,
} from "./commands.ts";
import type {
  LegalEntity,
  Organization,
  Person,
  RegistryAggregate,
  RegistryEntityKind,
  RegistryMergeResult,
} from "./contracts.ts";
import type { RegistryEntityId } from "./ids.ts";
import {
  createLegalEntityAggregate,
  createMergeHistory,
  createOrganizationAggregate,
  createPersonAggregate,
  mergeSourceAggregate,
  touchMergedTarget,
  transitionAggregate,
  updateLegalEntityAggregate,
  updateOrganizationAggregate,
  updatePersonAggregate,
  validateOrganizationName,
} from "./model.ts";
import type {
  OrganizationRegistryRepository,
  RegistryMergeWrite,
} from "./repository.ts";
import {
  commandFingerprint,
  commandReceiptKey,
  type RegistryCommandReceiptStore,
  replayOrThrow,
} from "./receipts.ts";
import type {
  LegalEntityId,
  MergeRecordId,
  OrganizationId,
  PersonId,
} from "./ids.ts";
import { registryScope } from "./contracts.ts";
import {
  requireActiveOrganization,
  requireAggregate,
  requireLegalEntity,
  requireOrganization,
  requirePerson,
} from "./service_helpers.ts";

export interface RegistryClock {
  now(): string;
}

export interface RegistryIdFactory {
  nextOrganizationId(): OrganizationId;
  nextLegalEntityId(): LegalEntityId;
  nextPersonId(): PersonId;
  nextMergeRecordId(): MergeRecordId;
}

/**
 * Executes registry lifecycle commands against injected context-owned ports.
 *
 * @example const service = new OrganizationRegistryService(repository, clock, ids, receipts);
 */
export class OrganizationRegistryService {
  constructor(
    private readonly repository: OrganizationRegistryRepository,
    private readonly clock: RegistryClock,
    private readonly ids: RegistryIdFactory,
    private readonly receipts: RegistryCommandReceiptStore,
  ) {}

  createOrganization(
    command: CreateOrganizationCommand,
  ): Promise<Organization> {
    return this.run(command, "organization.create", async () => {
      validateOrganizationName(command.name);
      const aggregate = createOrganizationAggregate({
        id: this.ids.nextOrganizationId(),
        scope: registryScope(command.context),
        name: command.name,
        externalReference: command.externalReference,
        now: this.clock.now(),
      });
      await this.repository.insert(aggregate.scope, aggregate);
      return aggregate;
    });
  }

  updateOrganization(
    command: UpdateOrganizationCommand,
  ): Promise<Organization> {
    return this.run(command, "organization.update", async () => {
      const current = await requireOrganization(
        this.repository,
        command.context,
        command.organizationId,
      );
      const updated = updateOrganizationAggregate(
        current,
        command.patch,
        this.clock.now(),
      );
      return await this.repository.replace(
        current.scope,
        updated,
        command.expectedVersion,
      ) as Organization;
    });
  }

  archiveOrganization(
    command: ArchiveOrganizationCommand,
  ): Promise<Organization> {
    return this.run(
      command,
      "organization.archive",
      () => this.transitionOrganization(command, "archived"),
    );
  }

  restoreOrganization(
    command: RestoreOrganizationCommand,
  ): Promise<Organization> {
    return this.run(
      command,
      "organization.restore",
      () => this.transitionOrganization(command, "active"),
    );
  }

  createLegalEntity(command: CreateLegalEntityCommand): Promise<LegalEntity> {
    return this.run(command, "legal_entity.create", async () => {
      const scope = registryScope(command.context);
      await requireActiveOrganization(
        this.repository,
        command.context,
        command.organizationId,
      );
      const aggregate = createLegalEntityAggregate({
        id: this.ids.nextLegalEntityId(),
        scope,
        organizationId: command.organizationId,
        legalName: command.legalName,
        jurisdictionCode: command.jurisdictionCode,
        registrationNumber: command.registrationNumber,
        now: this.clock.now(),
      });
      await this.repository.insert(scope, aggregate);
      return aggregate;
    });
  }

  updateLegalEntity(command: UpdateLegalEntityCommand): Promise<LegalEntity> {
    return this.run(command, "legal_entity.update", async () => {
      const current = await requireLegalEntity(
        this.repository,
        command.context,
        command.legalEntityId,
      );
      const updated = updateLegalEntityAggregate(
        current,
        command.patch,
        this.clock.now(),
      );
      return await this.repository.replace(
        current.scope,
        updated,
        command.expectedVersion,
      ) as LegalEntity;
    });
  }

  archiveLegalEntity(
    command: ArchiveLegalEntityCommand,
  ): Promise<LegalEntity> {
    return this.run(
      command,
      "legal_entity.archive",
      () => this.transitionLegalEntity(command, "archived"),
    );
  }

  restoreLegalEntity(
    command: RestoreLegalEntityCommand,
  ): Promise<LegalEntity> {
    return this.run(
      command,
      "legal_entity.restore",
      () => this.transitionLegalEntity(command, "active"),
    );
  }

  createPerson(command: CreatePersonCommand): Promise<Person> {
    return this.run(command, "person.create", async () => {
      const scope = registryScope(command.context);
      if (command.organizationId !== undefined) {
        await requireActiveOrganization(
          this.repository,
          command.context,
          command.organizationId,
        );
      }
      const aggregate = createPersonAggregate({
        id: this.ids.nextPersonId(),
        scope,
        organizationId: command.organizationId,
        givenName: command.givenName,
        familyName: command.familyName,
        email: command.email,
        phone: command.phone,
        nationalId: command.nationalId,
        now: this.clock.now(),
      });
      await this.repository.insert(scope, aggregate);
      return aggregate;
    });
  }

  updatePerson(command: UpdatePersonCommand): Promise<Person> {
    return this.run(command, "person.update", async () => {
      const current = await requirePerson(
        this.repository,
        command.context,
        command.personId,
      );
      if (
        command.patch.organizationId !== undefined &&
        command.patch.organizationId !== null
      ) {
        await requireActiveOrganization(
          this.repository,
          command.context,
          command.patch.organizationId,
        );
      }
      const updated = updatePersonAggregate(
        current,
        command.patch,
        this.clock.now(),
      );
      return await this.repository.replace(
        current.scope,
        updated,
        command.expectedVersion,
      ) as Person;
    });
  }

  archivePerson(command: ArchivePersonCommand): Promise<Person> {
    return this.run(
      command,
      "person.archive",
      () => this.transitionPerson(command, "archived"),
    );
  }

  restorePerson(command: RestorePersonCommand): Promise<Person> {
    return this.run(
      command,
      "person.restore",
      () => this.transitionPerson(command, "active"),
    );
  }

  mergeOrganizations(
    command: MergeOrganizationsCommand,
  ): Promise<RegistryMergeResult> {
    return this.run(
      command,
      "organization.merge",
      () => this.merge(command, "organization"),
    );
  }

  mergeLegalEntities(
    command: MergeLegalEntitiesCommand,
  ): Promise<RegistryMergeResult> {
    return this.run(
      command,
      "legal_entity.merge",
      () => this.merge(command, "legal_entity"),
    );
  }

  mergePeople(command: MergePeopleCommand): Promise<RegistryMergeResult> {
    return this.run(
      command,
      "person.merge",
      () => this.merge(command, "person"),
    );
  }

  private async transitionOrganization(
    command: ArchiveOrganizationCommand | RestoreOrganizationCommand,
    state: "active" | "archived",
  ): Promise<Organization> {
    const current = await requireOrganization(
      this.repository,
      command.context,
      command.organizationId,
    );
    const updated = transitionAggregate(current, state, this.clock.now());
    return await this.repository.replace(
      current.scope,
      updated,
      command.expectedVersion,
    ) as Organization;
  }

  private async transitionLegalEntity(
    command: ArchiveLegalEntityCommand | RestoreLegalEntityCommand,
    state: "active" | "archived",
  ): Promise<LegalEntity> {
    const current = await requireLegalEntity(
      this.repository,
      command.context,
      command.legalEntityId,
    );
    const updated = transitionAggregate(current, state, this.clock.now());
    return await this.repository.replace(
      current.scope,
      updated,
      command.expectedVersion,
    ) as LegalEntity;
  }

  private async transitionPerson(
    command: ArchivePersonCommand | RestorePersonCommand,
    state: "active" | "archived",
  ): Promise<Person> {
    const current = await requirePerson(
      this.repository,
      command.context,
      command.personId,
    );
    const updated = transitionAggregate(current, state, this.clock.now());
    return await this.repository.replace(
      current.scope,
      updated,
      command.expectedVersion,
    ) as Person;
  }

  private async merge(
    command:
      | MergeOrganizationsCommand
      | MergeLegalEntitiesCommand
      | MergePeopleCommand,
    kind: RegistryEntityKind,
  ): Promise<RegistryMergeResult> {
    const scope = registryScope(command.context);
    assertDistinctIds(kind, command.sourceId, command.targetId);
    const source = await requireAggregate(
      this.repository,
      command.context,
      kind,
      command.sourceId,
    );
    const target = await requireAggregate(
      this.repository,
      command.context,
      kind,
      command.targetId,
    );
    assertMergeable(source, target);
    const now = this.clock.now();
    const mergedSource = mergeSourceAggregate(
      source,
      target.id as typeof source.id,
      now,
    );
    const mergedTarget = touchMergedTarget(target, now);
    const history = createMergeHistory({
      recordId: this.ids.nextMergeRecordId(),
      kind,
      scope,
      sourceId: source.id,
      targetId: target.id,
      sourceVersion: mergedSource.version,
      targetVersion: mergedTarget.version,
      actorId: command.context.actorId,
      reason: command.reason,
      recordedAt: now,
    });
    const write: RegistryMergeWrite = {
      scope,
      source: mergedSource,
      target: mergedTarget,
      history,
      sourceExpectedVersion: command.sourceExpectedVersion,
      targetExpectedVersion: command.targetExpectedVersion,
    };
    return this.repository.merge(write);
  }

  private async run<Result extends RegistryCommandResult>(
    command: RegistryCommand,
    operation: string,
    execute: () => Promise<Result>,
  ): Promise<Result> {
    const key = commandReceiptKey(command);
    const fingerprint = commandFingerprint(command, operation);
    const replay = replayOrThrow<Result>(
      this.receipts.get(key),
      fingerprint,
      command.idempotencyKey,
    );
    if (replay !== undefined) return replay;
    const result = await execute();
    this.receipts.put({ key, fingerprint, result });
    return result;
  }
}

function assertDistinctIds(
  kind: RegistryEntityKind,
  sourceId: RegistryEntityId,
  targetId: RegistryEntityId,
): void {
  if (sourceId !== targetId) return;
  throw new RegistryInvariantError(
    `Registry ${kind} merge source and target "${sourceId}" are identical; expected two distinct aggregates.`,
  );
}

function assertMergeable(
  source: RegistryAggregate,
  target: RegistryAggregate,
): void {
  if (source.state === "active" && target.state === "active") return;
  throw new RegistryInvariantError(
    `Registry merge requires active source and target; received "${source.state}" and "${target.state}".`,
  );
}
