import { assertEquals, assertRejects } from "@std/assert";
import {
  type ActorReference,
  createAdministrationContext,
  createInstitution,
  createMembership,
  createPermissionGrant,
  createRestriction,
  createRolePolicy,
  createUserIdentity,
  createWorkspace,
  institutionId,
  revokeAggregate,
  suspendInstitution,
  tenantId,
  withWorkspaceContext,
} from "../../src/identity_access/v1.ts";

const tenant = tenantId("tenant_acme");
const admin: ActorReference = {
  id: "actor_admin" as ActorReference["id"],
  kind: "human",
  state: "active",
};
const context = createAdministrationContext({
  actor: admin,
  request: {
    actorId: admin.id,
    tenantId: tenant,
    correlationId: "cor_lifecycle" as never,
    origin: "internal",
  },
  now: "2026-08-01T12:00:00.000Z",
});

Deno.test("identity access aggregates preserve scope and optimistic versions", () => {
  const institution = createInstitution({
    id: institutionId("institution_acme"),
    tenantId: tenant,
    name: "Acme Capital",
  }, context);
  const workspace = createWorkspace({
    id: "workspace_main" as never,
    institutionId: institution.id,
    tenantId: tenant,
    name: "Main workspace",
  }, context);
  const workspaceContext = withWorkspaceContext(context, workspace.id);
  const identity = createUserIdentity({
    id: "identity_alice" as never,
    tenantId: tenant,
    providerSubject: "provider-subject-alice",
    displayName: "Alice",
  }, workspaceContext);
  const membership = createMembership({
    id: "membership_alice" as never,
    tenantId: tenant,
    workspaceId: workspace.id,
    identityId: identity.id,
    rolePolicyIds: [],
  }, workspaceContext);
  const policy = createRolePolicy({
    id: "role_reader" as never,
    tenantId: tenant,
    workspaceId: workspace.id,
    name: "Reader",
    resourceKinds: ["identity"],
    actions: ["read"],
    fields: ["display_name"],
  }, workspaceContext);
  const grant = createPermissionGrant({
    id: "grant_reader" as never,
    tenantId: tenant,
    workspaceId: workspace.id,
    identityId: identity.id,
    access: "standard",
    resourceKinds: policy.resourceKinds,
    actions: policy.actions,
    fields: policy.fields,
  }, workspaceContext);
  const restriction = createRestriction({
    id: "restriction_secret" as never,
    tenantId: tenant,
    workspaceId: workspace.id,
    resourceKinds: ["identity"],
    actions: ["read"],
    fields: ["display_name"],
  }, workspaceContext);

  assertEquals(institution.version, 1);
  assertEquals(workspace.tenantId, tenant);
  assertEquals(identity.state, "active");
  assertEquals(membership.state, "active");
  assertEquals(policy.version, 1);
  assertEquals(grant.state, "active");
  assertEquals(restriction.state, "active");
});

Deno.test("institution suspension is human-only and version fenced", async () => {
  const institution = createInstitution({
    id: institutionId("institution_versioned"),
    tenantId: tenant,
    name: "Versioned Capital",
  }, context);
  const suspended = suspendInstitution(institution, {
    expectedVersion: 1,
    reason: "security review",
    context,
  });

  assertEquals(suspended.state, "suspended");
  assertEquals(suspended.version, 2);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        suspendInstitution(suspended, {
          expectedVersion: 1,
          reason: "stale command",
          context,
        })
      ),
    Error,
    "expected version",
  );
});

Deno.test("revocation is terminal and retains the target identity", () => {
  const identity = createUserIdentity({
    id: "identity_revoked" as never,
    tenantId: tenant,
    providerSubject: "provider-subject-revoked",
    displayName: "Revoked",
  }, context);
  const revoked = revokeAggregate(identity, {
    revocationId: "revocation_identity" as never,
    reason: "offboarding",
    context,
    expectedVersion: 1,
  });

  assertEquals(revoked.aggregate.state, "revoked");
  assertEquals(revoked.aggregate.version, 2);
  assertEquals(revoked.revocation.state, "terminal");
  assertEquals(revoked.revocation.targetId, identity.id);
});
