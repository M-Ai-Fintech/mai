import { assertEquals, assertRejects } from "@std/assert";
import {
  createDealManagementComposition,
  DeterministicLegacyDealMapper,
  LegacyScopeMappingError,
  PostgresLegacyDealSource,
  PostgresLegacyReferenceResolver,
} from "../../src/deal_management/v1.ts";
import { FakeAuthenticationPort } from "../../src/identity_access/v1.ts";
import { dealManagementMigrations } from "../../src/deal_management/v1.ts";
import {
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  contextFor,
  RecordingDealAuthorization,
  requiredTenantId,
  requiredWorkspaceId,
} from "./support.ts";

const databaseUrl = mai106DatabaseUrl();
const dealId = "10000000-0000-4000-8000-000000000001";
const unmappedDealId = "10000000-0000-4000-8000-000000000002";
const partyId = "20000000-0000-4000-8000-000000000001";
const advisorId = "30000000-0000-4000-8000-000000000001";
const noMandateDealId = "10000000-0000-4000-8000-000000000003";
const partialMandateDealId = "10000000-0000-4000-8000-000000000004";
const scope = {
  tenantId: requiredTenantId("tenant_postgres-legacy"),
  workspaceId: requiredWorkspaceId("workspace_postgres-legacy"),
};
const legacySchemaSql = `CREATE TABLE IF NOT EXISTS transaction_type (
    id UUID PRIMARY KEY, name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transaction (
    id UUID PRIMARY KEY, title TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
    transaction_type_id UUID REFERENCES transaction_type(id), currency TEXT,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS business (id UUID PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS transaction_business_role (
    id UUID PRIMARY KEY, transaction_id UUID NOT NULL REFERENCES transaction(id),
    business_id UUID NOT NULL REFERENCES business(id), role_name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS advisor_type (id UUID PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS advisor_side (id UUID PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS advisor (
    id UUID PRIMARY KEY, name TEXT NOT NULL,
    advisor_type_id UUID REFERENCES advisor_type(id)
  );
  CREATE TABLE IF NOT EXISTS transaction_advisor (
    id UUID PRIMARY KEY, transaction_id UUID NOT NULL REFERENCES transaction(id),
    advisor_id UUID NOT NULL REFERENCES advisor(id),
    advisor_side_id UUID NOT NULL REFERENCES advisor_side(id)
  );`;

Deno.test({
  name: "PostgreSQL legacy source uses reviewed scope and canonical mappings",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      await prepareDatabase(pool);
      await seedLegacyEvidence(pool);
      const transactions = new PostgresTransactionRunner(pool);
      const source = new PostgresLegacyDealSource(transactions);
      await assertProductionMapping(transactions, source);
      await assertProductionDryRunMatchesApply(pool);
      await assertOptionalMandateMapping(pool, source);
      await assertScopeRejections(source);
    } finally {
      await cleanDatabase(pool).catch(() => {});
      await pool.end();
    }
  },
});

async function assertProductionMapping(
  transactions: PostgresTransactionRunner,
  source: PostgresLegacyDealSource,
): Promise<void> {
  const mapper = new DeterministicLegacyDealMapper(
    new PostgresLegacyReferenceResolver(transactions),
  );
  const record = await source.load({ scope, legacyDealId: dealId });
  assertEquals(record?.confidentiality, "sensitive");
  assertEquals(record?.mandate?.authorityCeiling, 3);
  assertEquals(record?.team[0]?.authorityLevel, 2);
  const mapped = await mapper.map({
    record: record!,
    scope,
    now: "2026-08-03T12:00:00.000Z",
  });
  assertEquals(mapped.kind, "mapped");
  if (mapped.kind !== "mapped") return;
  assertMappedDeal(mapped.deal);
}

async function assertProductionDryRunMatchesApply(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  const context = contextFor(
    "tenant_postgres-legacy",
    "workspace_postgres-legacy",
  );
  const result = createDealManagementComposition({
    pool,
    authentication: new FakeAuthenticationPort({
      actor: context.actor,
      sessionId: "session_postgres-legacy" as never,
      identityId: "identity_postgres-legacy" as never,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    }),
    authorization: new RecordingDealAuthorization(),
  });
  if (result.kind !== "configured") throw new Error(result.message);
  const operator = {
    scope,
    actorId: context.actor.id,
    correlationId: context.request.correlationId,
    now: context.now,
    commandContext: context,
  };
  try {
    const dryRun = await result.composition.reconciliation.run({
      mode: "dry-run",
      legacySource: "core.legacy_transaction",
      legacyDealId: dealId,
      operator,
    });
    const dryRecord = dryRun.outcomes[0]?.record;
    if (dryRecord === undefined) throw new Error("dry-run record is missing");
    const counts = await evidenceCounts(pool);
    assertEquals(counts, { deals: 0, history: 0, receipts: 0, claims: 0 });
    const applied = await result.composition.reconciliation.run({
      mode: "apply",
      legacySource: "core.legacy_transaction",
      legacyDealId: dealId,
      operator,
    });
    const appliedRecord = applied.outcomes[0]?.record;
    assertEquals(
      appliedRecord?.authoritativeDealId,
      dryRecord.authoritativeDealId,
    );
    assertEquals(appliedRecord?.sourceFingerprint, dryRecord.sourceFingerprint);
    assertEquals(appliedRecord?.intendedDeal, dryRecord.intendedDeal);
  } finally {
    await result.composition.close();
  }
}

async function evidenceCounts(pool: ReturnType<typeof createMai106Pool>) {
  const [deals, history, receipts, claims] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM deal_management.deals"),
    pool.query(
      "SELECT COUNT(*)::int AS count FROM deal_management.aggregate_history",
    ),
    pool.query(
      "SELECT COUNT(*)::int AS count FROM deal_management.command_receipts",
    ),
    pool.query(
      "SELECT COUNT(*)::int AS count FROM deal_management.command_claims",
    ),
  ]);
  return {
    deals: deals.rows[0].count,
    history: history.rows[0].count,
    receipts: receipts.rows[0].count,
    claims: claims.rows[0].count,
  };
}

async function assertOptionalMandateMapping(
  pool: ReturnType<typeof createMai106Pool>,
  source: PostgresLegacyDealSource,
): Promise<void> {
  await pool.query(
    `INSERT INTO transaction (id, title, code, currency, created_at, updated_at)
     VALUES ($1, 'No mandate Deal', 'LEGACY-3', 'USD', now(), now()),
            ($2, 'Partial mandate Deal', 'LEGACY-4', 'USD', now(), now())`,
    [noMandateDealId, partialMandateDealId],
  );
  await pool.query(
    `INSERT INTO deal_management.legacy_deal_mappings
      (legacy_source, legacy_record_id, tenant_id, workspace_id,
       confidentiality, mandate_transaction_value_ceiling, mandate_currency,
       mandate_authority_ceiling, reviewed_by, reviewed_at)
     VALUES ('core.legacy_transaction', $1, $2, $3, 'standard', NULL, NULL,
             NULL, 'operator_reviewed', now())`,
    [noMandateDealId, scope.tenantId, scope.workspaceId],
  );
  const noMandate = await source.load({
    scope,
    legacyDealId: noMandateDealId,
  });
  assertEquals(noMandate?.mandate, undefined);
  await assertRejects(
    () =>
      pool.query(
        `INSERT INTO deal_management.legacy_deal_mappings
        (legacy_source, legacy_record_id, tenant_id, workspace_id,
         confidentiality, mandate_transaction_value_ceiling, mandate_currency,
         mandate_authority_ceiling, reviewed_by, reviewed_at)
       VALUES ('core.legacy_transaction', $1, $2, $3, 'standard', 100, 'USD',
               NULL, 'operator_reviewed', now())`,
        [partialMandateDealId, scope.tenantId, scope.workspaceId],
      ),
    Error,
  );
}

function assertMappedDeal(
  deal: Extract<Awaited<ReturnType<DeterministicLegacyDealMapper["map"]>>, {
    readonly kind: "mapped";
  }>["deal"],
): void {
  assertEquals(deal.parties[0]?.reference, {
    kind: "organization",
    id: "org_registry-target-1",
  });
  assertEquals(deal.roles[0]?.authorityLevel, 2);
}

async function prepareDatabase(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await new PostgresMigrationRunner(pool).apply(dealManagementMigrations);
  await pool.query(legacySchemaSql);
  await cleanDatabase(pool);
}

async function seedLegacyEvidence(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await seedLegacyRows(pool);
  await seedDealMapping(pool);
  await seedReferenceMappings(pool);
}

async function seedLegacyRows(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  const statements: readonly [string, unknown[]][] = [
    [
      "INSERT INTO transaction_type (id, name) VALUES ('40000000-0000-4000-8000-000000000001', 'Acquisition')",
      [],
    ],
    [
      `INSERT INTO transaction (id, title, code, transaction_type_id, currency, created_at, updated_at) VALUES ($1, 'Scoped legacy Deal', 'LEGACY-1', '40000000-0000-4000-8000-000000000001', 'USD', now(), now()), ($2, 'Unmapped legacy Deal', 'LEGACY-2', '40000000-0000-4000-8000-000000000001', 'USD', now(), now())`,
      [dealId, unmappedDealId],
    ],
    ["INSERT INTO business (id, name) VALUES ($1, 'Legacy Target')", [partyId]],
    [
      `INSERT INTO transaction_business_role (id, transaction_id, business_id, role_name) VALUES ('50000000-0000-4000-8000-000000000001', $1, $2, 'TARGET')`,
      [dealId, partyId],
    ],
    [
      "INSERT INTO advisor_type (id, name) VALUES ('60000000-0000-4000-8000-000000000001', 'Advisor')",
      [],
    ],
    [
      "INSERT INTO advisor_side (id, name) VALUES ('70000000-0000-4000-8000-000000000001', 'Advisor')",
      [],
    ],
    [
      `INSERT INTO advisor (id, name, advisor_type_id) VALUES ($1, 'Legacy Advisor', '60000000-0000-4000-8000-000000000001')`,
      [advisorId],
    ],
    [
      `INSERT INTO transaction_advisor (id, transaction_id, advisor_id, advisor_side_id) VALUES ('80000000-0000-4000-8000-000000000001', $1, $2, '70000000-0000-4000-8000-000000000001')`,
      [dealId, advisorId],
    ],
  ];
  for (const [sql, parameters] of statements) await pool.query(sql, parameters);
}

async function seedDealMapping(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    `INSERT INTO deal_management.legacy_deal_mappings VALUES
      ('core.legacy_transaction', $1, $2, $3, 'sensitive', 900, 'USD', 3,
       'operator_reviewed', '2026-08-03T11:00:00.000Z')`,
    [dealId, scope.tenantId, scope.workspaceId],
  );
}

async function seedReferenceMappings(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    `INSERT INTO deal_management.legacy_reference_mappings VALUES
      ('core.legacy_transaction', $1, $2, $3, 'party', $4, 'organization',
       'org_registry-target-1', NULL, 'operator_reviewed', '2026-08-03T11:00:00.000Z'),
      ('core.legacy_transaction', $1, $2, $3, 'team', $5, 'user_identity',
       'identity_access-advisor-1', 2, 'operator_reviewed', '2026-08-03T11:00:00.000Z')`,
    [dealId, scope.tenantId, scope.workspaceId, partyId, advisorId],
  );
}

async function assertScopeRejections(
  source: PostgresLegacyDealSource,
): Promise<void> {
  await assertRejects(
    () =>
      source.load({
        scope: {
          tenantId: requiredTenantId("tenant_other"),
          workspaceId: scope.workspaceId,
        },
        legacyDealId: dealId,
      }),
    LegacyScopeMappingError,
    `${scope.tenantId}/${scope.workspaceId}`,
  );
  await assertRejects(
    () => source.load({ scope, legacyDealId: unmappedDealId }),
    LegacyScopeMappingError,
    "persisted reviewed tenant/workspace mapping",
  );
}

async function cleanDatabase(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    `TRUNCATE deal_management.legacy_reference_mappings,
      deal_management.legacy_deal_mappings, transaction_advisor,
      advisor, advisor_side, advisor_type, transaction_business_role,
      business, transaction, transaction_type CASCADE`,
  );
}
