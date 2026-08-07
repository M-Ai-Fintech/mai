import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  createExternalGrant,
  createParticipation,
  type DealAccessIdFactory,
  DealAccessService,
  externalGrantId,
  invitationId,
  participationId,
  portalObjectId,
  type PortalObjectLoader,
  portalReceiptId,
  PostgresDealAccessRepository,
  submissionId,
} from "../../src/deal_access/v1.ts";
import type { PortalObjectSnapshot } from "../../src/deal_access/model.ts";
import {
  dealAccessMigrations,
} from "../../src/deal_access/migrations/index.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  AllowingDealAccessAuthorization,
  INVITATION_TOKEN,
} from "./support.ts";
import { cleanRows, count, invalidationState } from "./postgres_support.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
const now = "2026-08-07T12:00:00.000Z";
const runTag = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
function tenantFor(label: string): TenantId {
  return `tenant_dealaccess_${label}_${runTag}` as TenantId;
}

const scope = {
  tenantId: tenantFor("records"),
  workspaceId: "workspace_dealaccess_pg" as WorkspaceId,
  dealId: "deal_dealaccess_pg" as DealId,
};
const concurrentScope = {
  tenantId: tenantFor("concurrent"),
  workspaceId: "workspace_dealaccess_pg" as WorkspaceId,
  dealId: "deal_dealaccess_pg" as DealId,
};
const human: ActorReference = {
  id: "actor_dealaccess_pg" as ActorId,
  kind: "human",
  state: "active",
};

class IntegrationIds implements DealAccessIdFactory {
  private sequence = 0;

  constructor(private readonly prefix: string) {}

  nextParticipationId() {
    return participationId(`participation_${this.prefix}-${++this.sequence}`);
  }

  nextInvitationId() {
    return invitationId(`invitation_${this.prefix}-${++this.sequence}`);
  }

  nextExternalGrantId() {
    return externalGrantId(`grant_${this.prefix}-${++this.sequence}`);
  }

  nextSubmissionId() {
    return submissionId(`submission_${this.prefix}-${++this.sequence}`);
  }

  nextPortalReceiptId() {
    return portalReceiptId(`receipt_${this.prefix}-${++this.sequence}`);
  }

  nextEventId(sequence: string) {
    return `event_${this.prefix}-${sequence}-${++this.sequence}`;
  }
}

class IntegrationLoader implements PortalObjectLoader {
  load(): Promise<PortalObjectSnapshot> {
    return Promise.resolve({
      internalId: portalObjectId("object_dealaccess-pg"),
      publicReference: "portal-dealaccess-pg",
      kind: "document",
      title: "Portal document",
      status: "available",
    });
  }
}

function requestContext(
  actorId: ActorId,
  origin: RequestContext["origin"],
  currentScope = scope,
): RequestContext {
  return {
    actorId,
    ...currentScope,
    correlationId: `cor_dealaccess-${origin}` as CorrelationId,
    origin,
  };
}

function inviteCommand(key: string, currentScope = scope) {
  return {
    type: "invite_participant" as const,
    context: requestContext(human.id, "internal", currentScope),
    actor: human,
    idempotencyKey: `idem_dealaccess-${key}` as IdempotencyKey,
    participantId: "participant_dealaccess_pg",
    invitationToken: INVITATION_TOKEN,
    purpose: "document_review",
    sponsor: { actorId: human.id, kind: "human" as const },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_dealaccess-pg"),
      kind: "document" as const,
      actions: ["submit" as const],
    }],
    actions: ["submit"],
    fields: ["public_reference", "title"],
  };
}

async function applyMigrations(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...dealAccessMigrations,
  ]);
}

Deno.test({
  name:
    "Deal Access PostgreSQL migrations, records, idempotency, and rollback are durable",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    try {
      await applyMigrations(pool);
      await applyMigrations(pool);
      await cleanRows(pool, scope.tenantId);
      const transactions = new PostgresTransactionRunner(pool);
      const repository = new PostgresDealAccessRepository(transactions);
      const service = new DealAccessService({
        repository,
        authorization: new AllowingDealAccessAuthorization(),
        ids: new IntegrationIds(`primary-${runTag}`),
        clock: { now: () => now },
        sessions: {
          invalidateGrant: () => Promise.resolve(),
          invalidateParticipation: () => Promise.resolve(),
        },
      });
      const invitation = await service.inviteParticipant(
        inviteCommand("records"),
      );
      assertEquals(
        await repository.transaction((store) =>
          store.findGrants(scope, invitation.participation.id)
        ).then((grants) => grants.map((grant) => grant.id)),
        [invitation.grant.id],
      );
      const external: ActorReference = {
        id: invitation.participation.participantId as ActorId,
        kind: "external",
        state: "active",
      };
      await service.acceptInvitation({
        type: "accept_invitation",
        context: requestContext(external.id, "http"),
        actor: external,
        idempotencyKey: "idem_dealaccess-accept" as IdempotencyKey,
        participationId: invitation.participation.id,
        invitationToken: INVITATION_TOKEN,
        expectedVersion: 1,
      });
      const result = await service.submitPortalData({
        type: "submit_portal_data",
        context: requestContext(external.id, "http"),
        actor: external,
        idempotencyKey: "idem_dealaccess-submit" as IdempotencyKey,
        grantId: invitation.grant.id,
        object: { objectId: "object_dealaccess-pg", kind: "document" },
        purpose: "document_review",
        sponsor: human.id,
        requestedExpiry: "2026-08-08T12:00:00.000Z",
        requestedFields: ["title"],
        payload: { title: "External response" },
      }, new IntegrationLoader());
      const receipt = await repository.transaction((store) =>
        store.findReceipt(scope, result.receipt.id)
      );
      assertEquals(receipt, result.receipt);
      assertEquals(Object.keys(result.receipt).sort(), [
        "aggregateType",
        "id",
        "receivedAt",
        "state",
        "submissionReference",
      ]);
      assertEquals(
        await count(pool, "deal_access.audit_events", scope.tenantId),
        "3",
      );
      assertEquals(await count(pool, "platform.outbox", scope.tenantId), "3");
      assertEquals(
        await count(pool, "deal_access.command_claims", scope.tenantId),
        "3",
      );
      await service.revokeGrant({
        type: "revoke_grant",
        context: requestContext(human.id, "internal"),
        actor: human,
        idempotencyKey: "idem_dealaccess-revoke" as IdempotencyKey,
        grantId: invitation.grant.id,
        expectedVersion: 1,
      });
      assertEquals(
        await count(pool, "deal_access.session_invalidations", scope.tenantId),
        "1",
      );
      assertEquals(
        await invalidationState(pool, scope.tenantId, {
          grantId: invitation.grant.id,
        }),
        { state: "completed", attemptCount: 1, completed: true },
      );
      assertEquals(
        await count(pool, "deal_access.audit_events", scope.tenantId),
        "4",
      );
      const offboarded = await service.offboardParticipant({
        type: "offboard_participant",
        context: requestContext(human.id, "internal"),
        actor: human,
        idempotencyKey: "idem_dealaccess-offboard" as IdempotencyKey,
        participationId: invitation.participation.id,
        expectedParticipationVersion: 2,
      });
      assertEquals(offboarded.state, "offboarded");
      assertEquals(
        await count(pool, "deal_access.session_invalidations", scope.tenantId),
        "2",
      );
      assertEquals(
        await invalidationState(pool, scope.tenantId, {
          participationId: invitation.participation.id,
        }),
        { state: "completed", attemptCount: 1, completed: true },
      );

      const rollbackId = "participation_dealaccess-rollback";
      await assertRejects(
        () =>
          transactions.run(async (transaction) => {
            await transaction.query(
              `INSERT INTO deal_access.participations (
               participation_id, tenant_id, workspace_id, deal_id, invitation_id,
               participant_id, participant_kind, state, version, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, 'external', 'invited', 1, $7, $7)`,
              [
                rollbackId,
                scope.tenantId,
                scope.workspaceId,
                scope.dealId,
                "invitation_dealaccess-rollback",
                "participant_dealaccess-rollback",
                now,
              ],
            );
            throw new Error("deal access rollback probe");
          }),
        "deal access rollback probe",
      );
      assertEquals(
        await pool.query<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM deal_access.participations WHERE participation_id = $1",
          [rollbackId],
        ).then((result) => result.rows[0].count),
        "0",
      );
    } finally {
      await cleanRows(pool, scope.tenantId).catch(() => {});
      await pool.end();
    }
  },
});

Deno.test({
  name: "Deal Access PostgreSQL command claims have one concurrent winner",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    try {
      await applyMigrations(pool);
      await cleanRows(pool, concurrentScope.tenantId);
      const repository = new PostgresDealAccessRepository(
        new PostgresTransactionRunner(pool),
      );
      const createService = (prefix: string) =>
        new DealAccessService({
          repository,
          authorization: new AllowingDealAccessAuthorization(),
          ids: new IntegrationIds(prefix),
          clock: { now: () => now },
          sessions: {
            invalidateGrant: () => Promise.resolve(),
            invalidateParticipation: () => Promise.resolve(),
          },
        });
      const command = inviteCommand("concurrent", concurrentScope);
      const [first, second] = await Promise.all([
        createService(`first-${runTag}`).inviteParticipant(command),
        createService(`second-${runTag}`).inviteParticipant(command),
      ]);
      assertEquals(second, first);
      assertEquals(
        await count(
          pool,
          "deal_access.participations",
          concurrentScope.tenantId,
        ),
        "1",
      );
      assertEquals(
        await count(
          pool,
          "deal_access.external_grants",
          concurrentScope.tenantId,
        ),
        "1",
      );
      assertEquals(
        await count(
          pool,
          "deal_access.command_claims",
          concurrentScope.tenantId,
        ),
        "1",
      );
      assertEquals(
        await count(pool, "deal_access.audit_events", concurrentScope.tenantId),
        "1",
      );
      assertEquals(
        await count(pool, "platform.outbox", concurrentScope.tenantId),
        "1",
      );
      const expirationService = new DealAccessService({
        repository,
        authorization: new AllowingDealAccessAuthorization(),
        ids: new IntegrationIds(`expiration-${runTag}`),
        clock: { now: () => "2026-08-09T12:00:00.000Z" },
        sessions: {
          invalidateGrant: () => Promise.resolve(),
          invalidateParticipation: () => Promise.resolve(),
        },
      });
      assertEquals(
        await expirationService.expireGrants({
          context: requestContext(human.id, "job", concurrentScope),
        }),
        1,
      );
      assertEquals(
        await count(
          pool,
          "deal_access.session_invalidations",
          concurrentScope.tenantId,
        ),
        "1",
      );
    } finally {
      await cleanRows(pool, concurrentScope.tenantId).catch(() => {});
      await pool.end();
    }
  },
});

Deno.test({
  name:
    "Deal Access PostgreSQL lookups cannot cross tenant, workspace, or deal scope",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    try {
      await applyMigrations(pool);
      const isolationTenant = tenantFor("isolation");
      await cleanRows(pool, isolationTenant);
      const transactions = new PostgresTransactionRunner(pool);
      const repository = new PostgresDealAccessRepository(transactions);
      const scopes = [
        {
          tenantId: isolationTenant,
          workspaceId: "workspace_a" as WorkspaceId,
          dealId: "deal_a" as DealId,
        },
        {
          tenantId: isolationTenant,
          workspaceId: "workspace_b" as WorkspaceId,
          dealId: "deal_a" as DealId,
        },
        {
          tenantId: isolationTenant,
          workspaceId: "workspace_a" as WorkspaceId,
          dealId: "deal_b" as DealId,
        },
      ];
      await repository.transaction(async (store) => {
        for (const currentScope of scopes) {
          const participation = createParticipation({
            id: participationId("participation_dealaccess-isolation"),
            invitationId: invitationId("invitation_dealaccess-isolation"),
            scope: currentScope,
            participantId: "participant_dealaccess-isolation",
            invitationTokenDigest: "0".repeat(64),
            now,
          });
          await store.saveParticipation(participation);
          await store.saveGrant(createExternalGrant({
            id: externalGrantId("grant_dealaccess-isolation"),
            participation,
            purpose: "document_review",
            sponsor: { actorId: human.id, kind: "human" },
            expiresAt: "2026-08-08T12:00:00.000Z",
            objectScopes: [{
              objectId: portalObjectId("object_dealaccess-pg"),
              kind: "document",
              actions: ["read"],
            }],
            actions: ["read"],
            fields: ["title"],
            now,
          }));
        }
      });
      for (const currentScope of scopes) {
        const grant = await repository.transaction((store) =>
          store.findGrant(currentScope, "grant_dealaccess-isolation")
        );
        assert(grant !== undefined);
        assertEquals(grant.scope, currentScope);
      }
      const wrongScope = await repository.transaction((store) =>
        store.findGrant(
          { ...scopes[0], dealId: "deal_missing" as DealId },
          "grant_dealaccess-isolation",
        )
      );
      assertEquals(wrongScope, undefined);
    } finally {
      await cleanRows(pool, tenantFor("isolation")).catch(() => {});
      await pool.end();
    }
  },
});
