import {
  action,
  type AuthorizationScope,
  type ExternalGrant,
  field,
  purpose,
  resourceKind,
  sponsor,
  type StandardGrant,
  type TemporaryGrant,
} from "../../../src/platform/authz/v1.ts";

const scope = {
  tenantId: "tenant-north",
  workspaceId: "workspace-deals",
  dealId: "deal_solar-2026",
} as AuthorizationScope;

const temporary: TemporaryGrant = boundGrant("temporary");
const external: ExternalGrant = boundGrant("external");
const standard: StandardGrant = {
  id: "deal-reader",
  scope,
  resourceKinds: [resourceKind("deal")],
  actions: [action("read")],
  fields: [field("name")],
  access: "standard",
};

// @ts-expect-error Temporary grants require a purpose.
const missingPurpose: TemporaryGrant = { ...temporary, purpose: undefined };
// @ts-expect-error Temporary grants require a sponsor.
const missingSponsor: TemporaryGrant = { ...temporary, sponsor: undefined };
const invalidStandard: StandardGrant = {
  ...standard,
  // @ts-expect-error Standard grants cannot carry temporary-access purpose fields.
  purpose: purpose("due-diligence"),
};

void external;
void missingPurpose;
void missingSponsor;
void invalidStandard;

function boundGrant<Access extends "temporary" | "external">(
  access: Access,
): Access extends "temporary" ? TemporaryGrant : ExternalGrant {
  return {
    id: "bounded-reader",
    scope,
    resourceKinds: [resourceKind("deal")],
    resourceIds: ["deal_solar-2026"],
    actions: [action("read")],
    fields: [field("name")],
    purpose: purpose("due-diligence"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T13:00:00.000Z",
    access,
  } as unknown as Access extends "temporary" ? TemporaryGrant : ExternalGrant;
}
