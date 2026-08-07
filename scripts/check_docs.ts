export interface DocumentationDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

interface MigrationMap {
  readonly activeSystemOfRecord?: unknown;
  readonly linearTeam?: unknown;
  readonly counts?: unknown;
  readonly tasks?: unknown;
  readonly documents?: unknown;
}

const DEFAULT_MAP_PATH = "docs/migrations/backlog-to-linear-map.json";

function diagnostic(
  code: string,
  path: string,
  message: string,
): DocumentationDiagnostic {
  return { code, path, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readArray(
  map: MigrationMap,
  key: "tasks" | "documents",
): readonly Record<string, unknown>[] {
  const value = map[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => item);
}

function validateTaskRecords(
  records: readonly Record<string, unknown>[],
  path: string,
): DocumentationDiagnostic[] {
  const diagnostics: DocumentationDiagnostic[] = [];
  const legacyIds = new Set<string>();
  let previousOrdinal = -1;
  for (const record of records) {
    const legacyId = String(record.legacyId ?? "");
    const linearId = String(record.linearIssueId ?? "");
    const ordinal = record.ordinal;
    if (
      !legacyId || !linearId || !String(record.originalRepositoryPath ?? "")
    ) {
      diagnostics.push(diagnostic(
        "incomplete-task-map",
        path,
        `Task mapping is missing legacyId, linearIssueId, or originalRepositoryPath: ${
          JSON.stringify(record)
        }.`,
      ));
    }
    if (legacyIds.has(legacyId)) {
      diagnostics.push(diagnostic("duplicate-task-id", path, legacyId));
    }
    legacyIds.add(legacyId);
    if (typeof ordinal !== "number" || ordinal < previousOrdinal) {
      diagnostics.push(diagnostic(
        "invalid-task-order",
        path,
        `Task ordinal '${
          String(ordinal)
        }' is lower than the previous ordinal '${previousOrdinal}'.`,
      ));
    }
    previousOrdinal = typeof ordinal === "number" ? ordinal : previousOrdinal;
  }
  for (
    const [index, expected] of ["MAI-1", "MAI-2", "MAI-3", "MAI-4"].entries()
  ) {
    if (records[index]?.linearIssueId !== expected) {
      diagnostics.push(diagnostic(
        "starter-issue-not-reused",
        path,
        `Ordinal position ${index + 1} maps to '${
          String(records[index]?.linearIssueId)
        }'; expected '${expected}'.`,
      ));
    }
  }
  return diagnostics;
}

function validateDocumentRecords(
  records: readonly Record<string, unknown>[],
  path: string,
): DocumentationDiagnostic[] {
  const diagnostics: DocumentationDiagnostic[] = [];
  const legacyKeys = new Set<string>();
  for (const record of records) {
    const key = String(record.legacyDocumentKey ?? "");
    if (
      !key || !String(record.linearDocumentId ?? "") ||
      !String(record.originalRepositoryPath ?? "")
    ) {
      diagnostics.push(diagnostic(
        "incomplete-document-map",
        path,
        `Document mapping is missing legacyDocumentKey, linearDocumentId, or originalRepositoryPath: ${
          JSON.stringify(record)
        }.`,
      ));
    }
    if (legacyKeys.has(key)) {
      diagnostics.push(diagnostic("duplicate-document-id", path, key));
    }
    legacyKeys.add(key);
  }
  return diagnostics;
}

export function validateMigrationMap(
  value: unknown,
  path = DEFAULT_MAP_PATH,
): DocumentationDiagnostic[] {
  if (!isRecord(value)) {
    return [
      diagnostic("invalid-migration-map", path, "Expected a JSON object."),
    ];
  }
  const map = value as MigrationMap;
  const diagnostics: DocumentationDiagnostic[] = [];
  if (map.activeSystemOfRecord !== "Linear") {
    diagnostics.push(
      diagnostic(
        "wrong-system-of-record",
        path,
        "activeSystemOfRecord must be Linear.",
      ),
    );
  }
  const team = isRecord(map.linearTeam) ? map.linearTeam : {};
  if (team.key !== "MAI") {
    diagnostics.push(
      diagnostic("wrong-linear-team", path, "linearTeam.key must be MAI."),
    );
  }
  const tasks = readArray(map, "tasks");
  const documents = readArray(map, "documents");
  const counts = isRecord(map.counts) ? map.counts : {};
  if (counts.tasks !== tasks.length || counts.documents !== documents.length) {
    diagnostics.push(diagnostic(
      "migration-count-mismatch",
      path,
      `Map counts report ${String(counts.tasks)} tasks/${
        String(counts.documents)
      } documents but contain ${tasks.length}/${documents.length}.`,
    ));
  }
  diagnostics.push(...validateTaskRecords(tasks, path));
  diagnostics.push(...validateDocumentRecords(documents, path));
  return diagnostics;
}

export async function runDocumentationCheck(
  mapPath = DEFAULT_MAP_PATH,
): Promise<DocumentationDiagnostic[]> {
  try {
    const source = await Deno.readTextFile(mapPath);
    return validateMigrationMap(JSON.parse(source), mapPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [
      diagnostic(
        "invalid-migration-map",
        mapPath,
        `Cannot read or parse migration map: ${reason}.`,
      ),
    ];
  }
}

function reportDiagnostics(
  diagnostics: readonly DocumentationDiagnostic[],
): void {
  for (const item of diagnostics) {
    console.error(`ERROR ${item.code} ${item.path}: ${item.message}`);
  }
}

if (import.meta.main) {
  const diagnostics = await runDocumentationCheck(Deno.args[0]);
  if (diagnostics.length) {
    reportDiagnostics(diagnostics);
    Deno.exit(1);
  }
  console.log("Linear migration documentation check passed.");
}
