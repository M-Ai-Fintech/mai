export interface StandardsViolation {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export const MAX_APPLICATION_FILE_LINES = 500;

const SEMANTIC_EXCEPTION =
  /(?:^|\/)(?:migrations|fixtures|snapshots|generated)(?:\/|$)|(?:_sql|_historical|schema|protocol|declarative)[^/]*\.(?:ts|tsx|sql|json)$|\.snap$/i;
const APPLICATION_SOURCE = /^(?:src|scripts)\/.*\.(?:ts|tsx)$/;
const DUPLICATED_PROMPT_SECTIONS = [
  "## Governed multi-subagent execution",
  "## Parallel review and verification",
  "## Required delegation matrix",
  "## Required within-task delegation design",
] as const;
const LEGACY_PROMPT_ROUTING = [
  "Run `plan_",
  "Use Terra for",
  "until Luna starts",
  "Luna handoff",
] as const;

export function isSemanticIntegrityException(path: string): boolean {
  return SEMANTIC_EXCEPTION.test(path);
}

export function findStructuralViolations(
  files: ReadonlyMap<string, string>,
): StandardsViolation[] {
  const violations: StandardsViolation[] = [];
  for (const [path, content] of files) {
    if (!APPLICATION_SOURCE.test(path) || isSemanticIntegrityException(path)) {
      continue;
    }
    const lines = content.split("\n").length;
    if (lines > MAX_APPLICATION_FILE_LINES) {
      violations.push({
        code: "oversized-application-file",
        path,
        message:
          `contains ${lines} lines; expected at most ${MAX_APPLICATION_FILE_LINES} outside semantic exceptions`,
      });
    }
  }
  return violations;
}

export function findPromptPolicyViolations(
  files: ReadonlyMap<string, string>,
): StandardsViolation[] {
  const violations: StandardsViolation[] = [];
  for (const [path, content] of files) {
    if (!path.startsWith("prompts/") || !path.endsWith(".md")) continue;
    if (path === "prompts/OPERATING_RULES.md") continue;
    if (!content.includes("prompts/OPERATING_RULES.md")) {
      violations.push({
        code: "missing-central-policy-reference",
        path,
        message: "must reference prompts/OPERATING_RULES.md",
      });
    }
    for (const section of DUPLICATED_PROMPT_SECTIONS) {
      if (content.includes(section)) {
        violations.push({
          code: "duplicated-central-policy",
          path,
          message: `must not repeat '${section}'`,
        });
      }
    }
    for (const phrase of LEGACY_PROMPT_ROUTING) {
      if (!content.includes(phrase)) continue;
      violations.push({
        code: "legacy-prompt-routing",
        path,
        message:
          `must route execution through prompts/OPERATING_RULES.md instead of '${phrase}'.`,
      });
    }
  }
  return violations;
}

async function changedFiles(): Promise<string[]> {
  const ranges = [
    ["diff", "--name-only", "--diff-filter=AM"],
    ["diff", "--name-only", "--diff-filter=AM", "origin/master...HEAD"],
    ["ls-files", "--others", "--exclude-standard"],
  ] as const;
  const paths = new Set<string>();
  for (const args of ranges) {
    const output = await new Deno.Command("git", {
      args: [...args],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!output.success) continue;
    for (const path of new TextDecoder().decode(output.stdout).split("\n")) {
      if (path.trim()) paths.add(path.trim());
    }
  }
  return [...paths].sort();
}

async function readFiles(
  paths: readonly string[],
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const path of paths) {
    try {
      files.set(path, await Deno.readTextFile(path));
    } catch {
      // A deleted or generated path is not an active source-file violation.
    }
  }
  return files;
}

async function repositoryPromptFiles(): Promise<Map<string, string>> {
  const paths: string[] = [];
  await collectMarkdownFiles("prompts", paths);
  return await readFiles(paths);
}

async function collectMarkdownFiles(
  root: string,
  paths: string[],
): Promise<void> {
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) await collectMarkdownFiles(path, paths);
    else if (entry.isFile && path.endsWith(".md")) paths.push(path);
  }
}

if (import.meta.main) {
  const sourceViolations = findStructuralViolations(
    await readFiles(await changedFiles()),
  );
  const promptViolations = findPromptPolicyViolations(
    await repositoryPromptFiles(),
  );
  const violations = [...sourceViolations, ...promptViolations];
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `ERROR ${violation.code} ${violation.path}: ${violation.message}`,
      );
    }
    Deno.exit(1);
  }
  console.log(
    "Repository standards check passed: changed-file structure and central prompt policy are coherent.",
  );
}
