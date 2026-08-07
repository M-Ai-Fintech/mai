export interface LinearPolicyDiagnostic {
  readonly path: string;
  readonly message: string;
}

const ACTIVE_ROOTS = [
  "AGENTS.md",
  "README.md",
  "prompts",
  ".agents/skills",
  "scripts",
  "gui/AGENTS.md",
  "gui/README.md",
  "deno.json",
] as const;
const EXCLUDED_PATHS = new Set([
  "scripts/check_linear_policy.ts",
  "scripts/check_linear_policy_test.ts",
  "docs/migrations/backlog-to-linear-map.json",
]);
const FORBIDDEN_ACTIVE_REFERENCES = [
  /\bBacklog(?:\.md)?\s+is\s+the\s+system\s+of\s+record\b/iu,
  /\bBacklog\s+(?:CLI|MCP|task|document|instructions|finalization|overview|planSet|state)\b/iu,
  /\bbacklog\/(?:docs|tasks|completed|archive|milestones)\b/iu,
  /\$backlog-mcp\b/iu,
] as const;

export function findActiveBacklogReferences(
  source: string,
  path: string,
): LinearPolicyDiagnostic[] {
  return FORBIDDEN_ACTIVE_REFERENCES.filter((pattern) => pattern.test(source))
    .map((pattern) => ({
      path,
      message:
        `Active workflow contains removed Backlog dependency: ${pattern.source}.`,
    }));
}

async function collectFiles(path: string): Promise<string[]> {
  const stat = await Deno.stat(path);
  if (stat.isFile) return [path];
  const files: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    files.push(...await collectFiles(`${path}/${entry.name}`));
  }
  return files;
}

async function activeFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const root of ACTIVE_ROOTS) {
    try {
      files.push(...await collectFiles(root));
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  return files.filter((path) =>
    !EXCLUDED_PATHS.has(path) &&
    !path.endsWith("_test.ts") &&
    !path.endsWith(".test.ts")
  );
}

export async function runLinearPolicyCheck(): Promise<
  LinearPolicyDiagnostic[]
> {
  const diagnostics: LinearPolicyDiagnostic[] = [];
  for (const path of await activeFiles()) {
    const source = await Deno.readTextFile(path);
    diagnostics.push(...findActiveBacklogReferences(source, path));
  }
  return diagnostics;
}

if (import.meta.main) {
  const diagnostics = await runLinearPolicyCheck();
  if (diagnostics.length) {
    for (const item of diagnostics) {
      console.error(`ERROR ${item.path}: ${item.message}`);
    }
    Deno.exit(1);
  }
  console.log("Linear system-of-record policy check passed.");
}
