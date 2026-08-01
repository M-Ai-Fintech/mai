import { assertEquals, assertThrows } from "@std/assert";
import {
  action,
  actorId,
  createAdministrationContext,
  createIdentityAccessAuthorization,
  createPermissionGrant,
  createRestriction,
  createRolePolicy,
  createSessionContext,
  createUserIdentity,
  evaluateIdentityAccess,
  field,
  IdentityAccessError,
  IdentityAccessJobRevalidator,
  projectAuthorizedIdentity,
  resourceKind,
  tenantId,
  withWorkspaceContext,
  workspaceId,
} from "../../src/identity_access/v1.ts";

const tenant = tenantId("tenant_policy");
const workspace = workspaceId("workspace_policy");
const actor = {
  id: actorId("actor_policy"),
  kind: "human" as const,
  state: "active" as const,
};
const adminContext = withWorkspaceContext(
  createAdministrationContext({
    actor,
    request: {
      actorId: actor.id,
      tenantId: tenant,
      workspaceId: workspace,
      correlationId: "cor_policy" as never,
      origin: "internal",
    },
    now: "2026-08-01T12:00:00.000Z",
  }),
  workspace,
);

Deno.test("authorization evaluates grant facts before loading and restrictions win", async () => {
  const identity = createUserIdentity({
    id: "identity_policy" as never,
    tenantId: tenant,
    providerSubject: "provider-policy",
    displayName: "Policy User",
  }, adminContext);
  const policy = createRolePolicy({
    id: "role_policy" as never,
    tenantId: tenant,
    workspaceId: workspace,
    name: "Identity reader",
    resourceKinds: ["identity"],
    actions: ["read"],
    fields: ["display_name", "provider_subject"],
  }, adminContext);
  const grant = createPermissionGrant({
    id: "grant_policy" as never,
    tenantId: tenant,
    workspaceId: workspace,
    identityId: identity.id,
    access: "standard",
    resourceKinds: policy.resourceKinds,
    actions: policy.actions,
    fields: policy.fields,
  }, adminContext);
  const restriction = createRestriction({
    id: "restriction_policy" as never,
    tenantId: tenant,
    workspaceId: workspace,
    resourceKinds: ["identity"],
    actions: ["read"],
    fields: ["provider_subject"],
  }, adminContext);
  const session = createSessionContext({
    sessionId: "session_policy" as never,
    principal: { actor, tenantId: tenant, workspaceId: workspace },
    correlationId: "cor_policy_session" as never,
    issuedAt: "2026-08-01T12:00:00.000Z",
    expiresAt: "2026-08-01T13:00:00.000Z",
  });
  const request = createIdentityAccessAuthorization({
    session,
    identityId: identity.id,
    resource: { kind: resourceKind("identity"), id: identity.id },
    action: action("read"),
    requestedFields: [
      { name: field("display_name"), classification: "public" },
      { name: field("provider_subject"), classification: "restricted" },
    ],
    policies: [policy],
    grants: [grant],
    restrictions: [restriction],
  });
  const decision = evaluateIdentityAccess(request);
  assertEquals(decision.outcome, "allow");
  assertEquals(decision.fieldMask.include, [field("display_name")]);

  const projected = await projectAuthorizedIdentity(
    request,
    {
      id: identity.id,
      displayName: identity.displayName,
      providerSubject: identity.providerSubject,
    },
  );
  assertEquals(projected.kind, "loaded");
  if (projected.kind === "loaded") {
    assertEquals(projected.value.displayName, "Policy User");
    assertEquals(projected.value.providerSubject, undefined);
  }
});

Deno.test("job revalidation fences an expired temporary grant before an effect", () => {
  const identity = createUserIdentity({
    id: "identity_job" as never,
    tenantId: tenant,
    providerSubject: "provider-job",
    displayName: "Job User",
  }, adminContext);
  const grant = createPermissionGrant({
    id: "grant_job" as never,
    tenantId: tenant,
    workspaceId: workspace,
    identityId: identity.id,
    access: "temporary",
    resourceIds: [identity.id],
    resourceKinds: ["identity"],
    actions: ["read"],
    fields: ["display_name"],
    purpose: "external_effect",
    sponsor: actor.id,
    expiresAt: "2026-08-01T12:30:00.000Z",
  }, adminContext);
  const session = createSessionContext({
    sessionId: "session_job" as never,
    principal: { actor, tenantId: tenant, workspaceId: workspace },
    correlationId: "cor_job" as never,
    issuedAt: "2026-08-01T12:00:00.000Z",
    expiresAt: "2026-08-01T13:00:00.000Z",
  });
  const request = (now: string) =>
    createIdentityAccessAuthorization({
      session,
      identityId: identity.id,
      resource: { kind: resourceKind("identity"), id: identity.id },
      action: action("read"),
      requestedFields: [{
        name: field("display_name"),
        classification: "public",
      }],
      policies: [],
      grants: [grant],
      restrictions: [],
      purpose: "external_effect",
      sponsor: actor.id,
      expiresAt: "2026-08-01T12:30:00.000Z",
      clock: { now: () => now },
    });
  const revalidator = new IdentityAccessJobRevalidator();
  assertEquals(
    revalidator.beforeExternalEffect(request("2026-08-01T12:10:00.000Z"))
      .outcome,
    "allow",
  );
  assertThrows(
    () => revalidator.beforeExternalEffect(request("2026-08-01T12:31:00.000Z")),
    IdentityAccessError,
    "AUTHORIZATION_DENIED",
  );
});
