export interface MigrationStatement {
  readonly schema: string;
  readonly sql: string;
}

export interface ContextMigration {
  readonly owner: string;
  readonly schema: string;
  readonly id: string;
  readonly version: number;
  readonly forwardNotes: string;
  readonly rollbackNotes: string;
  readonly statements: readonly MigrationStatement[];
}

/**
 * Defines one forward-only context migration with explicit ownership.
 *
 * @example defineMigration({ owner: "platform", schema: "platform", id: "platform-0001", version: 1, forwardNotes: "Create tables.", rollbackNotes: "Disable consumers.", statements: [] })
 */
export function defineMigration(
  migration: ContextMigration,
): ContextMigration {
  assertMigrationIdentity(migration);
  assertMigrationNotes(migration);
  for (const statement of migration.statements) {
    assertStatementOwnership(migration, statement);
  }
  return Object.freeze({
    ...migration,
    statements: Object.freeze([...migration.statements]),
  });
}

/**
 * Orders independent context streams deterministically by owner and version.
 *
 * @example orderMigrations([second, first])
 */
export function orderMigrations(
  migrations: readonly ContextMigration[],
): ContextMigration[] {
  return [...migrations].sort((left, right) =>
    left.owner.localeCompare(right.owner) ||
    left.version - right.version ||
    left.id.localeCompare(right.id)
  );
}

function assertMigrationIdentity(migration: ContextMigration): void {
  if (!/^[a-z][a-z0-9_]*$/.test(migration.owner)) {
    throw new Error(
      `Migration owner "${migration.owner}" is invalid; expected lowercase context identity.`,
    );
  }
  if (!/^[a-z][a-z0-9_]*$/.test(migration.schema)) {
    throw new Error(
      `Migration schema "${migration.schema}" is invalid; expected lowercase PostgreSQL identifier.`,
    );
  }
  if (!migration.id.startsWith(`${migration.owner}-`)) {
    throw new Error(
      `Migration id "${migration.id}" is invalid; expected prefix "${migration.owner}-".`,
    );
  }
  if (!Number.isSafeInteger(migration.version) || migration.version < 1) {
    throw new Error(
      `Migration "${migration.id}" version "${migration.version}" is invalid; expected a positive integer.`,
    );
  }
}

function assertMigrationNotes(migration: ContextMigration): void {
  if (!migration.forwardNotes.trim()) {
    throw new Error(
      `Migration "${migration.id}" forward notes are empty; expected explicit rollout notes.`,
    );
  }
  if (!migration.rollbackNotes.trim()) {
    throw new Error(
      `Migration "${migration.id}" rollback notes are empty; expected retention-safe rollback notes.`,
    );
  }
}

function assertStatementOwnership(
  migration: ContextMigration,
  statement: MigrationStatement,
): void {
  if (statement.schema !== migration.schema) {
    throw new Error(
      `Migration "${migration.id}" statement schema "${statement.schema}" is not owned; expected "${migration.schema}".`,
    );
  }
  if (changesResolutionContext(statement.sql)) {
    throw new Error(
      `Migration "${migration.id}" changes search_path or uses dynamic SQL; expected static SQL in owned schema "${migration.schema}".`,
    );
  }
  for (const referencedSchema of sqlSchemaReferences(statement.sql)) {
    if (referencedSchema === migration.schema) continue;
    throw new Error(
      `Migration "${migration.id}" references schema "${referencedSchema}"; expected only owned schema "${migration.schema}".`,
    );
  }
}

function sqlSchemaReferences(sql: string): string[] {
  const references = sql.matchAll(
    /(?:"([a-z][a-z0-9_]*)"|\b([a-z][a-z0-9_]*))\s*\./gi,
  );
  return [...references].map((match) => (match[1] ?? match[2]).toLowerCase());
}

function changesResolutionContext(sql: string): boolean {
  return /\bSET\s+(?:LOCAL\s+)?search_path\b/i.test(sql) ||
    /\bset_config\s*\(\s*['"]search_path['"]/i.test(sql) ||
    /\bEXECUTE\s+(?!FUNCTION\b)/i.test(sql);
}
