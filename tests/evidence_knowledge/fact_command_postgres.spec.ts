import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import { OutboxRepository } from "../../src/platform/events/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  parseActorId,
  parseAggregateVersion,
  parseRequestContext,
} from "../../src/platform/api/v1.ts";
import type { DocumentVersion } from "../../src/documents/version.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import { EvidenceKnowledgeRepository } from "../../src/evidence_knowledge/repository.ts";
import { PostgresFactTransitionStore } from "../../src/evidence_knowledge/fact_command_repository.ts";
import { AtomicFactCommandService } from "../../src/evidence_knowledge/fact_commands.ts";
import { FakeExactDocumentVersionVerificationPort } from "../../src/evidence_knowledge/document_version_verification.ts";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import { createCitation } from "../../src/evidence_knowledge/citation.ts";
import {
  createExactDocumentVersionReference,
  createFact,
  createFactVersion,
} from "../../src/evidence_knowledge/model.ts";
import {
  parseCitationId,
  parseFactId,
  parseFactVersionId,
} from "../../src/evidence_knowledge/v1.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import type { AuthoritySnapshot } from "../../src/audit_activity/v1.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

Deno.test({
  name:
    "fact commands atomically persist idempotency, history, provenance, invalidation, audit, and outbox evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await reset(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const scope = fixtureScope();
    const citation = fixtureCitation(scope);
    await transactions.run(async (transaction) => {
      await repository.insertCitation(transaction, citation);
      await repository.insertFact(
        transaction,
        createFact({
          factId: required("fact_command", parseFactId),
          scope,
          category: "financial",
          status: "proposed",
          aggregateVersion: 1,
          createdAt: now(),
        }),
      );
      await repository.insertFactVersion(
        transaction,
        createFactVersion({
          factVersionId: required("factver_command-v1", parseFactVersionId),
          factId: required("fact_command", parseFactId),
          scope,
          statement: "Command fact",
          category: "financial",
          status: "proposed",
          versionNumber: 1,
          citationIds: [citation.citationId],
          createdAt: now(),
        }),
      );
    });
    const contextResult = parseRequestContext({
      actorId: "actor_alice",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      correlationId: "cor_fact-command",
      origin: "http",
    });
    if (!contextResult.ok) {
      throw new Error("Fact command fixture context is invalid.");
    }
    const version = parseAggregateVersion(1);
    if (!version.ok) {
      throw new Error("Fact command fixture aggregate version is invalid.");
    }
    const verifier = new FakeExactDocumentVersionVerificationPort([{
      documentVersionId: citation.source.documentVersionId,
      scope,
      checksum: citation.source.checksum,
      classification: citation.source.classification,
    } as DocumentVersion]);

    const authSnapshot: AuthoritySnapshot = {
      snapshotId: "authsnap_test",
      actorId: required("actor_alice", parseActorId),
      actorKind: "human",
      policyVersion: "v1",
      scope,
      capturedAt: now(),
    };

    const service = new AtomicFactCommandService(
      {
        authorize: () =>
          Promise.resolve({
            allowed: true as const,
            authoritySnapshot: authSnapshot,
          }),
      },
      new PostgresFactTransitionStore({
        transactions,
        evidence: repository,
        verifier,
        outbox: new OutboxRepository(),
        clock: { now: () => now() },
      }),
    );
    const command = {
      context: contextResult.value,
      scope,
      factId: required("fact_command", parseFactId),
      factVersionId: required("factver_command-v1", parseFactVersionId),
      expectedAggregateVersion: version.value,
      targetStatus: "approved" as const,
      idempotencyKey: "approve-command",
      payloadDigest: "a".repeat(64),
    };
    const first = await service.transition(command);
    const replay = await service.transition(command);
    assertEquals(first.fact.status, "approved");
    assertEquals(first.fact.currentFactVersionId, "factver_command-v1");
    assertEquals(replay.replayed, true);
    const staleCommand = {
      ...command,
      idempotencyKey: "approve-stale",
      payloadDigest: "b".repeat(64),
    };
    await assertRejects(
      () => service.transition(staleCommand),
      Error,
      "VERSION_CONFLICT",
    );
    const versionTwo = required("factver_command-v2", parseFactVersionId);
    await transactions.run((transaction) =>
      repository.insertFactVersion(
        transaction,
        createFactVersion({
          factVersionId: versionTwo,
          factId: required("fact_command", parseFactId),
          scope,
          statement: "Command fact replacement",
          category: "financial",
          status: "proposed",
          versionNumber: 2,
          citationIds: [citation.citationId],
          supersedesFactVersionId: required(
            "factver_command-v1",
            parseFactVersionId,
          ),
          createdAt: now(),
        }),
      )
    );
    const approvedReplacement = await service.transition({
      ...command,
      factVersionId: versionTwo,
      expectedAggregateVersion: aggregateVersion(2),
      idempotencyKey: "approve-command-v2",
      payloadDigest: "c".repeat(64),
    });
    const superseded = await service.transition({
      ...command,
      expectedAggregateVersion: aggregateVersion(3),
      targetStatus: "superseded",
      replacementFactVersionId: versionTwo,
      rationale: "Replacing v1 with v2 for post-merge review correction",
      idempotencyKey: "supersede-command-v1",
      payloadDigest: "d".repeat(64),
    });
    assertEquals(approvedReplacement.fact.aggregateVersion, 3);
    assertEquals(superseded.fact.status, "approved");
    assertEquals(superseded.fact.currentFactVersionId, "factver_command-v2");
    assertEquals(
      await transactions.run((transaction) =>
        repository.findFactVersion(
          transaction,
          scope,
          required("factver_command-v1", parseFactVersionId),
        )
      ).then((value) => value?.status),
      "superseded",
    );
    const counts = await pool.query<
      {
        history: string;
        provenance: string;
        invalidation: string;
        outbox: string;
        commandHistory: string;
        auditEvents: string;
      }
    >(`SELECT (SELECT count(*)::text FROM evidence_knowledge.fact_transition_history) AS history, (SELECT count(*)::text FROM evidence_knowledge.fact_transition_provenance) AS provenance, (SELECT count(*)::text FROM evidence_knowledge.invalidations) AS invalidation, (SELECT count(*)::text FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned') AS outbox, (SELECT count(*)::text FROM evidence_knowledge.command_idempotency_history) AS "commandHistory", (SELECT count(*)::text FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact') AS "auditEvents"`);
    assertEquals(counts.rows[0], {
      history: "3",
      provenance: "3",
      invalidation: "3",
      outbox: "3",
      commandHistory: "3",
      auditEvents: "3",
    });
    await reset(pool);
    await pool.end();
  },
});

async function reset(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
  await pool.query(
    "DELETE FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned'",
  ).catch(() => {});
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner IN ($1, $2)",
    ["evidence_knowledge", "audit_activity"],
  ).catch(() => {});
}
function fixtureScope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}
function fixtureCitation(scope: ReturnType<typeof fixtureScope>) {
  return createCitation({
    citationId: required("citation_command", parseCitationId),
    scope,
    source: createExactDocumentVersionReference({
      documentVersionId: required("docver_command-v1", parseDocumentVersionId),
      checksum: { algorithm: "sha256", value: "e".repeat(64) },
      location: { kind: "page", page: 1 },
      classification: "financial",
      processingVersion: "extractor-v1",
    }),
    excerpt: "Command fact",
    freshness: { state: "current", checkedAt: now() },
    createdAt: now(),
  });
}
function now(): Date {
  return new Date("2026-08-04T12:00:00.000Z");
}

function aggregateVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture aggregate version "${value}" is invalid.`);
}
function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
