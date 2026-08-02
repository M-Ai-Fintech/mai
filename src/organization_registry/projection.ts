import {
  type Action,
  field,
  type FieldMask,
  projectAuthorizedDto,
  type ProjectionSchema,
} from "../platform/authz/v1.ts";
import type {
  LegalEntity,
  Organization,
  Person,
  RegistryAggregate,
} from "./contracts.ts";

export type RegistryProjection = Readonly<Record<string, unknown>>;

export const defaultRegistryFieldMask: FieldMask = Object.freeze({
  include: Object.freeze([
    field("id"),
    field("version"),
    field("state"),
    field("name"),
    field("organization_id"),
    field("legal_name"),
    field("jurisdiction_code"),
    field("given_name"),
    field("family_name"),
    field("created_at"),
    field("updated_at"),
  ]),
  omit: Object.freeze([
    field("external_reference"),
    field("registration_number"),
    field("email"),
    field("phone"),
    field("national_id"),
  ]),
  redact: Object.freeze([]),
  approvedClassifications: Object.freeze(
    [
      { name: field("id"), classification: "public" },
      { name: field("version"), classification: "public" },
      { name: field("state"), classification: "public" },
      { name: field("name"), classification: "public" },
      { name: field("organization_id"), classification: "external_shareable" },
      { name: field("legal_name"), classification: "public" },
      { name: field("jurisdiction_code"), classification: "public" },
      { name: field("given_name"), classification: "external_shareable" },
      { name: field("family_name"), classification: "external_shareable" },
      { name: field("created_at"), classification: "public" },
      { name: field("updated_at"), classification: "public" },
    ] as const,
  ),
});

const organizationProjection: ProjectionSchema<Organization> = {
  id: { field: field("id"), sourceKey: "id", classification: "public" },
  version: {
    field: field("version"),
    sourceKey: "version",
    classification: "public",
  },
  state: {
    field: field("state"),
    sourceKey: "state",
    classification: "public",
  },
  name: { field: field("name"), sourceKey: "name", classification: "public" },
  externalReference: {
    field: field("external_reference"),
    sourceKey: "externalReference",
    classification: "restricted",
  },
  createdAt: {
    field: field("created_at"),
    sourceKey: "createdAt",
    classification: "public",
  },
  updatedAt: {
    field: field("updated_at"),
    sourceKey: "updatedAt",
    classification: "public",
  },
};

const legalEntityProjection: ProjectionSchema<LegalEntity> = {
  id: { field: field("id"), sourceKey: "id", classification: "public" },
  version: {
    field: field("version"),
    sourceKey: "version",
    classification: "public",
  },
  state: {
    field: field("state"),
    sourceKey: "state",
    classification: "public",
  },
  organizationId: {
    field: field("organization_id"),
    sourceKey: "organizationId",
    classification: "external_shareable",
  },
  legalName: {
    field: field("legal_name"),
    sourceKey: "legalName",
    classification: "public",
  },
  jurisdictionCode: {
    field: field("jurisdiction_code"),
    sourceKey: "jurisdictionCode",
    classification: "public",
  },
  registrationNumber: {
    field: field("registration_number"),
    sourceKey: "registrationNumber",
    classification: "restricted",
  },
  createdAt: {
    field: field("created_at"),
    sourceKey: "createdAt",
    classification: "public",
  },
  updatedAt: {
    field: field("updated_at"),
    sourceKey: "updatedAt",
    classification: "public",
  },
};

const personProjection: ProjectionSchema<Person> = {
  id: { field: field("id"), sourceKey: "id", classification: "public" },
  version: {
    field: field("version"),
    sourceKey: "version",
    classification: "public",
  },
  state: {
    field: field("state"),
    sourceKey: "state",
    classification: "public",
  },
  organizationId: {
    field: field("organization_id"),
    sourceKey: "organizationId",
    classification: "external_shareable",
  },
  givenName: {
    field: field("given_name"),
    sourceKey: "givenName",
    classification: "external_shareable",
  },
  familyName: {
    field: field("family_name"),
    sourceKey: "familyName",
    classification: "external_shareable",
  },
  email: {
    field: field("email"),
    sourceKey: "email",
    classification: "restricted",
  },
  phone: {
    field: field("phone"),
    sourceKey: "phone",
    classification: "restricted",
  },
  nationalId: {
    field: field("national_id"),
    sourceKey: "nationalId",
    classification: "restricted",
  },
  createdAt: {
    field: field("created_at"),
    sourceKey: "createdAt",
    classification: "public",
  },
  updatedAt: {
    field: field("updated_at"),
    sourceKey: "updatedAt",
    classification: "public",
  },
};

export function projectRegistryAggregate(
  aggregate: RegistryAggregate,
  fieldMask: FieldMask,
  allowedActions: readonly Action[] = [],
): RegistryProjection {
  const safeFieldMask = omitDeniedFields(fieldMask);
  if (aggregate.kind === "organization") {
    return omitUndefined(projectAuthorizedDto(
      aggregate,
      organizationProjection,
      safeFieldMask,
      allowedActions,
    ));
  }
  if (aggregate.kind === "legal_entity") {
    return omitUndefined(projectAuthorizedDto(
      aggregate,
      legalEntityProjection,
      safeFieldMask,
      allowedActions,
    ));
  }
  return omitUndefined(projectAuthorizedDto(
    aggregate,
    personProjection,
    safeFieldMask,
    allowedActions,
  ));
}

function omitDeniedFields(fieldMask: FieldMask): FieldMask {
  const omitted = new Set(fieldMask.omit);
  return {
    ...fieldMask,
    include: fieldMask.include.filter((name) => !omitted.has(name)),
    approvedClassifications: fieldMask.approvedClassifications.filter(
      ({ name }) => !omitted.has(name),
    ),
  };
}

function omitUndefined(
  projection: Readonly<Record<string, unknown>>,
): RegistryProjection {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(projection).filter(([, value]) => value !== undefined),
    ),
  );
}
