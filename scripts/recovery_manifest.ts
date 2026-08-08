import pg from "pg";

export interface RecoveryManifest {
  readonly format: "mai-local-authoritative-v1";
  readonly migrationLedger: readonly Record<string, unknown>[];
  readonly jobs: readonly Record<string, unknown>[];
  readonly outbox: readonly Record<string, unknown>[];
  readonly inbox: readonly Record<string, unknown>[];
  readonly audit: readonly Record<string, unknown>[];
  readonly evidence: readonly Record<string, unknown>[];
  readonly domain: readonly Record<string, unknown>[];
  readonly objects: readonly ObjectManifestEntry[];
}

export interface ObjectManifestEntry {
  readonly key: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** Captures identifiers, states, and digests without copying confidential payloads. */
export async function captureRecoveryManifest(
  pool: pg.Pool,
  objectRoot = ".local/storage",
): Promise<RecoveryManifest> {
  return {
    format: "mai-local-authoritative-v1",
    migrationLedger: await queryRows(
      pool,
      `
      SELECT context_owner AS owner, migration_id AS id, version, checksum
      FROM platform.migration_ledger ORDER BY context_owner, version, migration_id`,
    ),
    jobs: await queryPayloadRows(
      pool,
      `
      SELECT job_id AS id, job_type AS type, state, attempt_count AS attempts,
        result_reference AS result, payload
      FROM platform.jobs ORDER BY job_id`,
    ),
    outbox: await queryPayloadRows(
      pool,
      `
      SELECT event_id AS id, dispatch_state AS state, attempt_count AS attempts,
        payload
      FROM platform.outbox ORDER BY event_id`,
    ),
    inbox: await queryRows(
      pool,
      `
      SELECT tenant_id AS tenant, source_identity AS source, message_identity AS id,
        payload_digest, processing_state AS state, delivery_count AS deliveries
      FROM platform.inbox ORDER BY tenant_id, source_identity, message_identity`,
    ),
    audit: await queryRows(
      pool,
      `
      SELECT event_id AS id, tenant_id AS tenant, content_digest, occurred_at
      FROM audit_activity.audit_events ORDER BY event_id`,
    ),
    evidence: await queryRows(
      pool,
      `
      SELECT evidence_id AS id, citation_id AS citation, tenant_id AS tenant,
        workspace_id AS workspace, deal_id AS deal
      FROM evidence_knowledge.evidence_records ORDER BY evidence_id`,
    ),
    domain: await queryRows(
      pool,
      `
      SELECT deal_id AS id, tenant_id AS tenant, workspace_id AS workspace,
        version, md5(document::text) AS document_digest, state
      FROM deal_management.deals ORDER BY deal_id`,
    ),
    objects: await captureObjectManifest(objectRoot),
  };
}

export function assertRecoveryManifestsEqual(
  expected: RecoveryManifest,
  actual: RecoveryManifest,
): void {
  const expectedComparable = comparableManifest(expected);
  const actualComparable = comparableManifest(actual);
  if (expectedComparable === actualComparable) return;
  throw new Error(
    "Authoritative recovery manifest changed; expected exact migration, job, outbox, inbox, audit, evidence, domain, and object identities/digests.",
  );
}

/** Compares recovery identity and payload evidence while allowing a queued job to run. */
export function assertRecoveryIdentitiesPreserved(
  expected: RecoveryManifest,
  actual: RecoveryManifest,
): void {
  const normalize = (manifest: RecoveryManifest): string =>
    JSON.stringify({
      ...manifest,
      jobs: manifest.jobs.map((
        { state: _state, attempts: _attempts, result: _result, ...job },
      ) => job),
    });
  if (normalize(expected) === normalize(actual)) return;
  throw new Error(
    "Restart recovery changed an authoritative identity or payload digest; only the queued job lifecycle may advance.",
  );
}

async function queryRows(
  pool: pg.Pool,
  sql: string,
): Promise<readonly Record<string, unknown>[]> {
  try {
    const result = await pool.query<Record<string, unknown>>(sql);
    return result.rows;
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}

async function queryPayloadRows(
  pool: pg.Pool,
  sql: string,
): Promise<readonly Record<string, unknown>[]> {
  try {
    const result = await pool.query<Record<string, unknown>>(sql);
    const rows: Record<string, unknown>[] = [];
    for (const row of result.rows) {
      const { payload, ...safe } = row;
      rows.push({ ...safe, payload_digest: await sha256Json(payload) });
    }
    return rows;
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}

async function captureObjectManifest(
  root: string,
): Promise<readonly ObjectManifestEntry[]> {
  const entries: ObjectManifestEntry[] = [];
  await walkObjects(root, root, entries);
  return entries.sort((left, right) => left.key.localeCompare(right.key));
}

async function walkObjects(
  root: string,
  directory: string,
  entries: ObjectManifestEntry[],
): Promise<void> {
  try {
    for await (const entry of Deno.readDir(directory)) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory) {
        await walkObjects(root, path, entries);
        continue;
      }
      if (!entry.isFile) continue;
      const bytes = await Deno.readFile(path);
      entries.push({
        key: path.slice(root.length + 1),
        bytes: bytes.byteLength,
        sha256: await sha256(bytes),
      });
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return;
    throw error;
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource,
  );
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  )
    .join("");
}

function sha256Json(value: unknown): Promise<string> {
  return sha256(new TextEncoder().encode(JSON.stringify(value)));
}

function comparableManifest(manifest: RecoveryManifest): string {
  return JSON.stringify({
    ...manifest,
    objects: [...manifest.objects].sort((left, right) =>
      left.key.localeCompare(right.key)
    ),
  });
}

function isMissingRelation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "42P01";
}
