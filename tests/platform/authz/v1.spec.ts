import {
  action,
  authoritySnapshotReference,
  type AuthorizationRequest,
  type AuthorizationScope,
  evaluateAuthorization,
  type ExternalGrant,
  field,
  type PolicyClock,
  purpose,
  resourceKind,
  sponsor,
  type StandardGrant,
  type TemporaryGrant,
} from "../../../src/platform/authz/v1.ts";
import { parseRequestContext } from "../../../src/platform/api/v1.ts";
import { assertEquals } from "@std/assert";
import "./grant_union.types.ts";

const clock: PolicyClock = { now: () => "2026-07-30T12:00:00.000Z" };
const readerRole = {
  id: "deal-reader",
  scope: scope(),
  resourceKinds: [resourceKind("deal")],
  actions: [action("read")],
  fields: [field("name"), field("batna")],
};

Deno.test("v1 denies by default and allows explicit role scope", () => {
  const denied = evaluateAuthorization(request());
  const allowed = evaluateAuthorization(request({ roleFacts: [readerRole] }));

  assertEquals(denied.outcome, "deny");
  assertEquals(denied.reasonCode, "NO_MATCHING_GRANT");
  assertEquals(allowed.outcome, "allow");
  assertEquals(allowed.fieldMask.include, [field("name"), field("batna")]);
});

Deno.test("v1 deny precedence narrows grants without leaking protected fields", () => {
  const decision = evaluateAuthorization(request({
    roleFacts: [readerRole],
    restrictionFacts: [{
      id: "batna-restriction",
      scope: scope(),
      resourceKinds: [resourceKind("deal")],
      actions: [action("read")],
      fields: [field("batna")],
    }],
  }));

  assertEquals(decision.outcome, "allow");
  assertEquals(decision.fieldMask.include, [field("name")]);
  assertEquals(decision.fieldMask.omit, [field("batna")]);
});

Deno.test("v1 whole restrictions dominate matching grants", () => {
  const decision = evaluateAuthorization(request({
    roleFacts: [readerRole],
    restrictionFacts: [{
      id: "deal-hold",
      scope: scope(),
      resourceKinds: [resourceKind("deal")],
      actions: [action("read")],
    }],
  }));

  assertEquals(decision.outcome, "deny");
  assertEquals(decision.reasonCode, "EXPLICIT_RESTRICTION");
});

Deno.test("v1 rejects cross-tenant, workspace, and deal selector mismatches", () => {
  for (
    const mismatch of [
      { tenantId: "tenant_other" },
      { workspaceId: "workspace_other" },
      { dealId: "deal_other" },
    ]
  ) {
    const decision = evaluateAuthorization(request({
      roleFacts: [readerRole],
      scope: scope(mismatch),
    }));
    assertEquals(decision.outcome, "deny");
    assertEquals(decision.reasonCode, "SCOPE_MISMATCH");
  }
});

Deno.test("v1 rejects inactive, revoked, expired, and incomplete temporary access", () => {
  const temporary = temporaryGrant();
  const cases: ReadonlyArray<Partial<AuthorizationRequest>> = [
    { actor: { ...actor(), state: "inactive" }, grantFacts: [temporary] },
    { actor: { ...actor(), state: "revoked" }, grantFacts: [temporary] },
    { grantFacts: [temporaryGrant({ expiresAt: "2026-07-30T11:59:59.000Z" })] },
    { grantFacts: [standardGrant({ state: "revoked" })] },
    { grantFacts: [temporary] },
    { grantFacts: [temporary], purpose: purpose("due-diligence") },
    { grantFacts: [temporary], sponsor: sponsor("sponsor-7") },
  ];

  for (const overrides of cases) {
    assertEquals(evaluateAuthorization(request(overrides)).outcome, "deny");
  }
  assertEquals(
    evaluateAuthorization(request({
      grantFacts: [temporary],
      purpose: purpose("due-diligence"),
      sponsor: sponsor("sponsor-7"),
      expiresAt: "2026-07-30T13:00:00.000Z",
    })).outcome,
    "allow",
  );
});

Deno.test("v1 binds temporary purpose, sponsor, and expiry to its grant", () => {
  const temporary = temporaryGrant();
  const matching = evaluateAuthorization(request({
    grantFacts: [temporary],
    purpose: purpose("due-diligence"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T12:30:00.000Z",
  }));
  const mismatchedPurpose = evaluateAuthorization(request({
    grantFacts: [temporary],
    purpose: purpose("document-review"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T12:30:00.000Z",
  }));
  const mismatchedSponsor = evaluateAuthorization(request({
    grantFacts: [temporary],
    purpose: purpose("due-diligence"),
    sponsor: sponsor("sponsor-8"),
    expiresAt: "2026-07-30T12:30:00.000Z",
  }));
  const excessiveExpiry = evaluateAuthorization(request({
    grantFacts: [temporary],
    purpose: purpose("due-diligence"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T13:30:00.000Z",
  }));

  assertEquals(matching.outcome, "allow");
  assertEquals(matching.expiresAt, "2026-07-30T12:30:00.000Z");
  if (matching.outcome !== "allow") throw new Error("Expected temporary allow");
  assertEquals(matching.approvedScope.expiresAt, "2026-07-30T12:30:00.000Z");
  assertEquals(mismatchedPurpose.outcome, "deny");
  assertEquals(mismatchedSponsor.outcome, "deny");
  assertEquals(excessiveExpiry.outcome, "deny");
});

Deno.test("v1 standard grants remain independent of temporary constraints", () => {
  const decision = evaluateAuthorization(request({
    grantFacts: [standardGrant()],
    purpose: purpose("due-diligence"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T12:30:00.000Z",
  }));

  assertEquals(decision.outcome, "allow");
  assertEquals(decision.expiresAt, undefined);
});

Deno.test("v1 binds external grants with the same purpose and sponsor rules", () => {
  const external = externalGrant();
  const allowed = evaluateAuthorization(request({
    actor: { ...actor(), kind: "external" },
    grantFacts: [external],
    purpose: purpose("document-review"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T12:30:00.000Z",
  }));
  const denied = evaluateAuthorization(request({
    actor: { ...actor(), kind: "external" },
    grantFacts: [external],
    purpose: purpose("document-review"),
    sponsor: sponsor("sponsor-8"),
    expiresAt: "2026-07-30T12:30:00.000Z",
  }));

  assertEquals(allowed.outcome, "allow");
  assertEquals(denied.outcome, "deny");
});

Deno.test("v1 treats membership and assignments as insufficient authority", () => {
  const membershipOnly = evaluateAuthorization(request({
    relationshipFacts: [{
      type: "workspace_membership",
      scope: scope({ dealId: undefined }),
    }],
  }));
  const assignedWithoutAuthority = evaluateAuthorization(request({
    relationshipFacts: [{
      type: "deal_assignment",
      scope: scope(),
      resource: resource(),
    }],
    authorityRequirement: { humanOnly: true, action: action("approve") },
  }));

  assertEquals(membershipOnly.reasonCode, "NO_MATCHING_GRANT");
  assertEquals(assignedWithoutAuthority.reasonCode, "NO_MATCHING_GRANT");
});

Deno.test("v1 relationship requirements require exact active scoped facts", () => {
  const relatedRole = {
    ...readerRole,
    relationshipRequirements: ["deal_access"],
  };
  const absent = evaluateAuthorization(request({ roleFacts: [relatedRole] }));
  const organizationOnly = evaluateAuthorization(request({
    roleFacts: [relatedRole],
    relationshipFacts: [{
      type: "organization_relationship",
      scope: scope(),
      resource: resource(),
    }],
  }));
  const granted = evaluateAuthorization(request({
    roleFacts: [relatedRole],
    relationshipFacts: [{
      type: "deal_access",
      scope: scope(),
      resource: resource(),
    }],
  }));

  assertEquals(absent.outcome, "deny");
  assertEquals(organizationOnly.outcome, "deny");
  assertEquals(granted.outcome, "allow");
});

Deno.test("v1 human-only authority rejects AI, service, and external actors", () => {
  for (const kind of ["ai", "service", "external"] as const) {
    const decision = evaluateAuthorization(request({
      actor: { ...actor(), kind },
      roleFacts: [readerRole],
      authorityRequirement: { humanOnly: true, action: action("read") },
    }));
    assertEquals(decision.outcome, "deny");
    assertEquals(decision.reasonCode, "HUMAN_AUTHORITY_REQUIRED");
  }
});

Deno.test("v1 approval authority requires a matching snapshot, not assignment", () => {
  const snapshot = authoritySnapshotReference("authority-7");
  const approveRole = {
    ...readerRole,
    actions: [action("approve")],
    authoritySnapshotReferences: [snapshot],
  };
  const requestWithAuthority = request({
    action: action("approve"),
    authorityRequirement: {
      humanOnly: true,
      action: action("approve"),
      snapshotReference: snapshot,
    },
  });

  assertEquals(
    evaluateAuthorization({
      ...requestWithAuthority,
      roleFacts: [{ ...approveRole, authoritySnapshotReferences: [] }],
    }).outcome,
    "deny",
  );
  assertEquals(
    evaluateAuthorization({ ...requestWithAuthority, roleFacts: [approveRole] })
      .outcome,
    "allow",
  );
});

Deno.test("v1 external access requires explicit scope and omits internal classifications", () => {
  const external = externalGrant();
  const allowed = evaluateAuthorization(request({
    actor: { ...actor(), kind: "external" },
    grantFacts: [external],
    purpose: purpose("document-review"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T13:00:00.000Z",
    requestedFields: [
      { name: field("name"), classification: "public" },
      { name: field("batna"), classification: "batna" },
    ],
  }));
  const internalOnly = evaluateAuthorization(request({
    actor: { ...actor(), kind: "external" },
    grantFacts: [external],
    purpose: purpose("document-review"),
    sponsor: sponsor("sponsor-7"),
    expiresAt: "2026-07-30T13:00:00.000Z",
    requestedFields: [{ name: field("batna"), classification: "batna" }],
  }));

  assertEquals(allowed.outcome, "allow");
  assertEquals(allowed.fieldMask.include, [field("name")]);
  assertEquals(allowed.fieldMask.omit, [field("batna")]);
  assertEquals(internalOnly.reasonCode, "FIELD_SCOPE_DENIED");
});

Deno.test("v1 external actors never receive internal classifications", () => {
  for (
    const classification of [
      "batna",
      "mandate_ceiling",
      "valuation_threshold",
      "negotiation_strategy",
      "unrestricted_evidence",
      "conflict_rationale",
      "relationship_ownership",
      "internal_audit",
      "agent_control",
      "copilot_capability",
    ] as const
  ) {
    const decision = evaluateAuthorization(request({
      actor: { ...actor(), kind: "external" },
      grantFacts: [externalGrant({ fields: [field("internal")] })],
      purpose: purpose("document-review"),
      sponsor: sponsor("sponsor-7"),
      expiresAt: "2026-07-30T13:00:00.000Z",
      requestedFields: [{ name: field("internal"), classification }],
    }));
    assertEquals(decision.outcome, "deny");
    assertEquals(decision.reasonCode, "FIELD_SCOPE_DENIED");
  }
});

Deno.test("v1 denial reason codes are selector-safe", () => {
  const decision = evaluateAuthorization(
    request({ scope: scope({ dealId: "deal_other" }) }),
  );

  assertEquals(decision.reasonCode, "SCOPE_MISMATCH");
  assertEquals(JSON.stringify(decision).includes("deal_other"), false);
  assertEquals(JSON.stringify(decision).includes("deal_solar-2026"), false);
});

Deno.test("v1 evaluates a supplied clock exactly once and fails closed for invalid time", () => {
  let calls = 0;
  const countedClock: PolicyClock = {
    now: () => {
      calls += 1;
      return "2026-07-30T12:00:00.000Z";
    },
  };

  assertEquals(
    evaluateAuthorization(
      request({ roleFacts: [readerRole], clock: countedClock }),
    ).outcome,
    "allow",
  );
  assertEquals(calls, 1);
  assertEquals(
    evaluateAuthorization(request({ clock: { now: () => "invalid-time" } }))
      .reasonCode,
    "INVALID_POLICY_TIME",
  );
});

function request(
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest {
  const context = contextFor(scope());
  return {
    context,
    actor: actor(),
    scope: scope(),
    resource: resource(),
    action: action("read"),
    requestedFields: [
      { name: field("name"), classification: "public" },
      { name: field("batna"), classification: "batna" },
    ],
    roleFacts: [],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
    clock,
    ...overrides,
  };
}

function contextFor(
  value: { tenantId: string; workspaceId: string; dealId?: string },
) {
  const parsed = parseRequestContext({
    actorId: "actor_reader-7",
    tenantId: value.tenantId,
    workspaceId: value.workspaceId,
    ...(value.dealId === undefined ? {} : { dealId: value.dealId }),
    correlationId: "cor_authz-7",
    origin: "internal",
  });
  if (parsed.ok) return parsed.value;
  throw new Error(`Expected context, got ${parsed.issue.code}`);
}

function scope(
  overrides: { tenantId?: string; workspaceId?: string; dealId?: string } = {},
): AuthorizationScope {
  const context = contextFor({
    tenantId: overrides.tenantId ?? "tenant_northstar",
    workspaceId: overrides.workspaceId ?? "workspace_primary",
    ...(overrides.dealId === undefined && "dealId" in overrides ? {} : {
      dealId: overrides.dealId ?? "deal_solar-2026",
    }),
  });
  if (context.workspaceId === undefined) {
    throw new Error("Expected workspace scope");
  }
  return context.dealId === undefined
    ? { tenantId: context.tenantId, workspaceId: context.workspaceId }
    : {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      dealId: context.dealId,
    };
}

function actor() {
  return {
    id: contextFor(scope()).actorId,
    kind: "human" as const,
    state: "active" as const,
  };
}

function resource() {
  return { kind: resourceKind("deal"), id: "deal_solar-2026" };
}

function standardGrant(overrides: Partial<StandardGrant> = {}): StandardGrant {
  return {
    id: "deal-reader",
    scope: scope(),
    resourceKinds: [resourceKind("deal")],
    actions: [action("read")],
    fields: [field("name")],
    access: "standard",
    ...overrides,
  };
}

function temporaryGrant(
  overrides: Partial<TemporaryGrant> = {},
): TemporaryGrant {
  return {
    ...boundGrant("temporary"),
    purpose: purpose("due-diligence"),
    sponsor: sponsor("sponsor-7"),
    ...overrides,
  };
}

function externalGrant(overrides: Partial<ExternalGrant> = {}): ExternalGrant {
  return {
    ...boundGrant("external"),
    purpose: purpose("document-review"),
    sponsor: sponsor("sponsor-7"),
    ...overrides,
  };
}

function boundGrant<Access extends "temporary" | "external">(
  access: Access,
): {
  readonly id: string;
  readonly scope: AuthorizationScope;
  readonly resourceKinds: readonly ReturnType<typeof resourceKind>[];
  readonly resourceIds: readonly string[];
  readonly actions: readonly ReturnType<typeof action>[];
  readonly fields: readonly ReturnType<typeof field>[];
  readonly expiresAt: string;
  readonly access: Access;
} {
  return {
    id: "external-review",
    scope: scope(),
    resourceKinds: [resourceKind("deal")],
    resourceIds: ["deal_solar-2026"],
    actions: [action("read")],
    fields: [field("name")],
    expiresAt: "2026-07-30T13:00:00.000Z",
    access,
  };
}
