const TASK_DERIVED_TOKEN = /(?:MAI|mai|Mai)\d+[A-Za-z0-9_-]*/g;
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "backlog",
  "data",
  "graphify-out",
  "node_modules",
  ".next",
]);
const BINARY_EXTENSIONS = new Set([".onnx", ".pack", ".png", ".jpg", ".jpeg"]);

function isHistoricalMigrationDefinition(path: string): boolean {
  return path.startsWith("src/work_management/migrations/") &&
    path.includes("_historical_");
}

export interface ResourceNamingViolation {
  readonly path: string;
  readonly token: string;
}

export function findForbiddenResourceNames(
  content: string,
  path: string,
): ResourceNamingViolation[] {
  return [...content.matchAll(TASK_DERIVED_TOKEN)].map(([token]) => ({
    path,
    token,
  }));
}

export function findForbiddenResourcePathNames(
  path: string,
): ResourceNamingViolation[] {
  return [...path.matchAll(TASK_DERIVED_TOKEN)].map(([token]) => ({
    path,
    token,
  }));
}

async function collectFiles(path: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory) files.push(...await collectFiles(child));
    else if (entry.isFile) files.push(child);
  }
  return files;
}

if (import.meta.main) {
  const violations: ResourceNamingViolation[] = [];
  for (const path of await collectFiles(".")) {
    const relative = path.slice(2);
    if (relative === "scripts/check_resource_naming_test.ts") continue;
    const extension = relative.slice(relative.lastIndexOf("."));
    if (BINARY_EXTENSIONS.has(extension)) continue;
    const content = await Deno.readTextFile(path);
    violations.push(...findForbiddenResourcePathNames(relative));
    if (!isHistoricalMigrationDefinition(relative)) {
      violations.push(...findForbiddenResourceNames(content, relative));
    }
  }
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `${violation.path}: forbidden task-derived resource token "${violation.token}"`,
      );
    }
    Deno.exit(1);
  }
  console.log(
    "Resource naming check passed: no task-derived active identifiers.",
  );
}
