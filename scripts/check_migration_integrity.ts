import type { ContextMigration } from "../src/platform/persistence/migration.ts";
import { migrationChecksum } from "../src/platform/persistence/migration_runner.ts";
import { registeredMigrations } from "../src/platform/persistence/registered_migrations.ts";

export const PUBLISHED_MIGRATION_CHECKSUMS: Readonly<Record<string, string>> = {
  "platform-0001-idempotency":
    "9120c8d6e384d41f3b7218ee39948e07e1236b9fb8fa82f318ad509c8846234e",
  "platform-0002-outbox":
    "87dcd56a69547dd50f5950791096b2a7c3c4abda978e44b4cc241bacc147ed6c",
  "platform-0003-inbox":
    "b97ea72e10ecb90f842809a3a3ee339d82927f5e1a5641757ad1d144620f1600",
  "platform-0004-jobs":
    "fee65871c72051aa5de13e78c850b2d5dcbbf6274f2a3f2b1ed703b6d8938013",
  "audit_activity-0001-events-and-redactions":
    "2be96ec72df6bafac0c940a12b12ddc908dec511feb1e676e9dcdbe4ff640340",
  "valuation-0001":
    "1370ec5638bdc0c9a3f310b356132bba10ab5043a2571de3056b5dcb9d7be8eb",
  "matching-0001":
    "e60d16c323b4fc9077774f4ee0f803c1e400b3b2426ffe6dff93edc254bc73c3",
  "deliverables-0001":
    "a4977146bd67d79e110f9d82d55931e947541fe1c928eecfb967ad1138720420",
  "closing-0001-control":
    "79187a15d485263f41a06469ae54eb90930b8a613bd0ed902caa9e6e2621c50b",
  "deal_governance-0001":
    "170b29a33650fb3cdc2b5f374535a7d6cbad118d754ee6226d1a925de55b8b3b",
  "deal_governance-0002":
    "ff47f5098a2eedc137ed42088a60351e65c5100b8ab151e09d071f3af053185e",
  "deal_management-0001-deal-core":
    "74d67de1ac10e1e1f7218916787c2b21020a513a570b3c8233a3a483a01f6b74",
  "deal_management-0002-reconciliation-routing":
    "70114e90808656b75479a2e54f11d5ab58f15c2c801d524e6001fd9464ec793e",
  "deal_management-0003-lifecycle-milestones":
    "91f268ab7ee91c8a406568bb5237801b0707180a41d9ac1752a3620ecac27bfc",
  "documents-0001":
    "00cf3c4b618ab0fd0334b87c28e106ef6c5f38e8a123aad2f1e070b77f1a9a26",
  "evidence_knowledge-0001":
    "b75bc336496e996eda1510ea007c0bd491dcdb6bc426413e6184e0c37dfdca0c",
  "evidence_knowledge-0002":
    "369d475ea37632d7a9d6bb9f5fcf23f531e878ecdb2f3a3cdbf9b7b0dfa1ab5a",
  "evidence_knowledge-0003":
    "ab437ce0efa822b79402e2015c1bcba73f364d984c5c86f75206c6ec56d64f93",
  "evidence_knowledge-0004":
    "5f728f555875ecefd40011a243c743ad55d980077066e755364174081b7fd2bd",
  "iam-0001-identity-access":
    "03060f950c3673e5f4bcb18d43328b09226ca35086798b2ccd7e531c9ac48203",
  "iam-0002-session-identity":
    "3fb76b225259fb671e5efdfbc3b2867128ba22fd9636f3477e04ece95c417870",
  "access-0001-policy-access":
    "7803f5da4730f3c4778bc630815c426c86d9c4596befe4bfadb280af632f2362",
  "notifications-0001":
    "31c217086e35535c17c146c9c3c45f2487cfe7c32091c7b06c79891431938812",
  "organization_registry-0001-identity-lifecycle":
    "c78fd0e4dd10c546f0461e5dfd96fb801a6d172bc850b664da6ff93dc378434d",
  "work_management-0001":
    "fe53b491f9c8a4242fb593358a76a399fc101a35e92ab2f8815285ef241f5026",
  "work_management-0002-corrective":
    "16ea073b5d61ccf99810b7a8f266b97c091cb98c72c490be6da454fa95fe89d7",
  "work_management-0003-membership-authority":
    "1f3ac3560b95bbb00472bff903680a46a817150ad23062b5796c211acfea3484",
  "work_management-0004-membership-authority":
    "6e81ac47cae1c9e2a002a59921565635759d40fa653772515015114390d9ca6e",
  "work_management-0005-authority-and-prepared":
    "97586fc4cf093550dea6a0294e6ff7c7db335eec826031c464a2afcf53624a5d",
  "work_management-0006-membership-operability":
    "0bd1def3d978a7a9cadd0cb574f407db8578a944d5c9c77d0be61addfd1f6c75",
  "work_management-0007-runtime-gate":
    "2b1937df56e1275f607cd69195fb7987835605aedddf6044a5630004220b0e78",
  "work_management-0008-actor-binding":
    "2b056d1b3fdf26fd239e01e4ea9ac871e0dcd93200d1250f76991f0de959e248",
  "work_management-0009-corrective-upgrade":
    "f2f7a4358a192818e0d6edc54e29f33657b8f485b05cf4d18d76293b6b8b3178",
  "work_management-0010-authority-denials":
    "70bcce621d07a304d1a5d5776a59608d106dd9b4c297cad03da1b0f5cd03f8f4",
  "negotiation-0001-control":
    "f86562c3ecab3e6b05fda6f2b8a8c410d201a06e8fc511e307ea36c5ae12632e",
  "negotiation-0002-evidence":
    "2762879186e229bd585ef968fe354ab44c2578f17086964a48d55a06eed28ec2",
  "diligence_decisions-0001":
    "28d102e63b409981012e289112eb52acdbf4b7fb9907ebc89bb68d4a87bfa3d4",
  "diligence_decisions-0002":
    "8db72c1c03642f0bf664092332f7c99fd14a51e70344049162ef8545a8daa05e",
  "agent_runtime-0001-mission-run":
    "eaf972740b8568414e4296af42cda575db7a3e48e3a038d1801a84921eef2558",
  "agent_runtime-0002-deal-scope":
    "a296dbcc681f8fbb1b9fd1421156c37b2899b6afa4f67611aeb113576e0cc69f",
  "deal_access-0001":
    "3a17b2fafd0f08c73a5ddecb57ff5e94f8131a354a6da75d3796c4e3778554f0",
  "deal_access-0002":
    "e9f362f2cb78b2a3424a52561c2c297d38f4224fb78bb5404f3f193fec237f52",
  "deal_access-0003-delivery-identity":
    "1fb2e52737bbcd9c2d6905bfb7e2eecadef10cc144a9841ad995391373ae6e3d",
};

export function currentMigrationCatalog(): readonly ContextMigration[] {
  return registeredMigrations();
}

export async function migrationIntegrityDiagnostics(
  migrations: readonly ContextMigration[],
  publishedChecksums: Readonly<Record<string, string>>,
): Promise<string[]> {
  const diagnostics: string[] = [];
  const identities = new Set<string>();
  const versions = new Map<string, Set<number>>();
  for (const migration of migrations) {
    if (identities.has(migration.id)) {
      diagnostics.push(`Duplicate migration id '${migration.id}'.`);
    }
    identities.add(migration.id);
    const ownerVersions = versions.get(migration.owner) ?? new Set<number>();
    if (ownerVersions.has(migration.version)) {
      diagnostics.push(
        `Duplicate migration version '${migration.owner}:${migration.version}'.`,
      );
    }
    ownerVersions.add(migration.version);
    versions.set(migration.owner, ownerVersions);
    const expected = publishedChecksums[migration.id];
    if (expected === undefined) {
      diagnostics.push(
        `Migration '${migration.id}' has no pinned historical checksum.`,
      );
      continue;
    }
    const actual = await migrationChecksum(migration);
    if (actual !== expected) {
      diagnostics.push(
        `Migration '${migration.id}' checksum changed; expected '${expected}', received '${actual}'.`,
      );
    }
  }
  for (const id of Object.keys(publishedChecksums)) {
    if (!identities.has(id)) {
      diagnostics.push(
        `Pinned migration '${id}' is missing from the current catalog.`,
      );
    }
  }
  return diagnostics;
}

if (import.meta.main) {
  const diagnostics = await migrationIntegrityDiagnostics(
    currentMigrationCatalog(),
    PUBLISHED_MIGRATION_CHECKSUMS,
  );
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(`ERROR ${diagnostic}`);
    Deno.exit(1);
  }
  console.log(
    "Migration integrity check passed: clean catalog and pinned historical checksums.",
  );
}
