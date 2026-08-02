import {
  type AggregateVersion,
  parseAggregateVersion,
} from "../../src/shared/contracts/aggregate_version.ts";
import {
  type ActorId,
  type IdempotencyKey,
  parseActorId,
  parseIdempotencyKey,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import { parseRequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  type LegalEntityId,
  type MergeRecordId,
  type OrganizationId,
  parseLegalEntityId,
  parseMergeRecordId,
  parseOrganizationId,
  parsePersonId,
  type PersonId,
  type RegistryClock,
  type RegistryIdFactory,
} from "../../src/organization_registry/v1.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

export class FixedRegistryClock implements RegistryClock {
  constructor(private current: string = "2026-08-01T12:00:00.000Z") {}

  now(): string {
    return this.current;
  }

  set(value: string): void {
    this.current = value;
  }
}

export class SequentialRegistryIdFactory implements RegistryIdFactory {
  private organizationSequence = 0;
  private legalEntitySequence = 0;
  private personSequence = 0;
  private mergeSequence = 0;

  nextOrganizationId(): OrganizationId {
    this.organizationSequence += 1;
    return requiredOrganizationId(`org_fixture-${this.organizationSequence}`);
  }

  nextLegalEntityId(): LegalEntityId {
    this.legalEntitySequence += 1;
    return requiredLegalEntityId(`legal_fixture-${this.legalEntitySequence}`);
  }

  nextPersonId(): PersonId {
    this.personSequence += 1;
    return requiredPersonId(`person_fixture-${this.personSequence}`);
  }

  nextMergeRecordId(): MergeRecordId {
    this.mergeSequence += 1;
    return requiredMergeRecordId(`merge_fixture-${this.mergeSequence}`);
  }
}

export function contextFor(
  tenantId = "tenant_northstar",
  workspaceId = "workspace_alpha",
): RequestContext {
  return requiredContext({
    actorId: "actor_banker",
    tenantId,
    workspaceId,
    correlationId: "cor_registry",
    origin: "http",
  });
}

export function keyFor(value: string): IdempotencyKey {
  return requiredIdempotencyKey(`idem_${value}`);
}

export function requiredActorId(value: string): ActorId {
  return requiredValue(parseActorId(value), `actor id "${value}"`);
}

export function requiredAggregateVersion(value: number): AggregateVersion {
  return requiredValue(
    parseAggregateVersion(value),
    `aggregate version "${value}"`,
  );
}

function requiredContext(value: unknown): RequestContext {
  return requiredValue(parseRequestContext(value), "request context");
}

function requiredIdempotencyKey(value: string): IdempotencyKey {
  return requiredValue(
    parseIdempotencyKey(value),
    `idempotency key "${value}"`,
  );
}

function requiredTenantId(value: string): TenantId {
  return requiredValue(parseTenantId(value), `tenant id "${value}"`);
}

function requiredWorkspaceId(value: string): WorkspaceId {
  return requiredValue(parseWorkspaceId(value), `workspace id "${value}"`);
}

function requiredOrganizationId(value: string): OrganizationId {
  return requiredValue(
    parseOrganizationId(value),
    `organization id "${value}"`,
  );
}

function requiredLegalEntityId(value: string): LegalEntityId {
  return requiredValue(parseLegalEntityId(value), `legal entity id "${value}"`);
}

function requiredPersonId(value: string): PersonId {
  return requiredValue(parsePersonId(value), `person id "${value}"`);
}

function requiredMergeRecordId(value: string): MergeRecordId {
  return requiredValue(parseMergeRecordId(value), `merge record id "${value}"`);
}

function requiredValue<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
  label: string,
): T {
  if (result.ok) return result.value;
  throw new Error(`Fixture ${label} is invalid; expected a valid value.`);
}

export function scopeFor(context: RequestContext) {
  return {
    tenantId: requiredTenantId(context.tenantId),
    workspaceId: context.workspaceId === undefined
      ? undefined
      : requiredWorkspaceId(context.workspaceId),
  };
}
