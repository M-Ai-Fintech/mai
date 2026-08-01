import type { UserIdentity } from "./contracts.ts";

export interface ExternalIdentityRecord {
  readonly source: string;
  readonly externalId: string;
  readonly providerSubject: string;
  readonly displayName: string;
}

export interface IdentityReconciliationMapping {
  readonly source: string;
  readonly externalId: string;
  readonly localIdentityId?: string;
  readonly outcome: "matched" | "created" | "conflict";
  readonly reason?: string;
}

export interface IdentityReconciliationResult {
  readonly mappings: readonly IdentityReconciliationMapping[];
  readonly matched: number;
  readonly created: number;
  readonly conflicts: number;
  readonly rollback: {
    readonly strategy: "disable-consumer-and-retain-history";
    readonly historyRetained: true;
  };
}

export async function reconcileExternalIdentities(input: {
  readonly records: readonly ExternalIdentityRecord[];
  readonly existing: readonly UserIdentity[];
  readonly create: (record: ExternalIdentityRecord) => Promise<UserIdentity>;
}): Promise<IdentityReconciliationResult> {
  const mappings: IdentityReconciliationMapping[] = [];
  const existingByProvider = indexExisting(input.existing);
  const grouped = groupRecords(input.records);
  let matched = 0;
  let created = 0;
  let conflicts = 0;
  for (const { record, conflict } of grouped) {
    if (conflict) {
      mappings.push(
        conflictMapping(
          record,
          "external identity maps to conflicting provider subjects",
        ),
      );
      conflicts++;
      continue;
    }
    const candidates = existingByProvider.get(record.providerSubject) ?? [];
    if (candidates.length > 1) {
      mappings.push(
        conflictMapping(record, "provider subject maps to multiple identities"),
      );
      conflicts++;
      continue;
    }
    if (candidates.length === 1) {
      mappings.push({
        ...keyFields(record),
        localIdentityId: candidates[0].id,
        outcome: "matched",
      });
      matched++;
      continue;
    }
    const createdIdentity = await input.create(record);
    mappings.push({
      ...keyFields(record),
      localIdentityId: createdIdentity.id,
      outcome: "created",
    });
    created++;
  }
  return {
    mappings: Object.freeze(mappings),
    matched,
    created,
    conflicts,
    rollback: {
      strategy: "disable-consumer-and-retain-history",
      historyRetained: true,
    },
  };
}

function indexExisting(
  identities: readonly UserIdentity[],
): Map<string, UserIdentity[]> {
  const indexed = new Map<string, UserIdentity[]>();
  for (const identity of identities) {
    const values = indexed.get(identity.providerSubject) ?? [];
    values.push(identity);
    indexed.set(identity.providerSubject, values);
  }
  return indexed;
}

function groupRecords(records: readonly ExternalIdentityRecord[]): readonly {
  readonly record: ExternalIdentityRecord;
  readonly conflict: boolean;
}[] {
  const grouped = new Map<string, {
    readonly record: ExternalIdentityRecord;
    readonly conflict: boolean;
  }>();
  for (const record of records) {
    const key = externalKey(record);
    const prior = grouped.get(key);
    if (prior === undefined) {
      grouped.set(key, { record, conflict: false });
      continue;
    }
    grouped.set(key, {
      record: prior.record,
      conflict: prior.conflict ||
        prior.record.providerSubject !== record.providerSubject,
    });
  }
  return [...grouped.values()];
}

function externalKey(record: ExternalIdentityRecord): string {
  return `${record.source}:${record.externalId}`;
}

function keyFields(record: ExternalIdentityRecord): {
  readonly source: string;
  readonly externalId: string;
} {
  return { source: record.source, externalId: record.externalId };
}

function conflictMapping(
  record: ExternalIdentityRecord,
  reason: string,
): IdentityReconciliationMapping {
  return { ...keyFields(record), outcome: "conflict", reason };
}
