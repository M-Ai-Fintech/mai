import {
  createIsolatedPostgresDatabase,
  dropIsolatedPostgresDatabase,
  isolatedPostgresDatabaseName,
} from "./postgres_test_state.ts";

const TEST_ROOTS = ["tests", "src", "scripts"] as const;
const POSTGRES_MARKERS = [
  "createPostgresIntegrationTestPool",
  "PostgresMigrationRunner",
  "POSTGRES_INTEGRATION_TEST_DATABASE_URL",
  "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL",
  "mai_test_postgres_integration",
  "mai_test_notifications_integration",
] as const;
const NOTIFICATIONS_MARKER = "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL";
const NOTIFICATIONS_DATABASE_NAME = "mai_test_notifications_integration";
const POSTGRES_DATABASE_NAME = "mai_test_postgres_integration";

export const CANONICAL_TEST_TIMEOUT_MS = 300_000;

export interface TestPartition {
  readonly parallel: readonly string[];
  readonly postgres: readonly string[];
}

export interface CanonicalTestResult {
  readonly category: "parallel" | "postgresql";
  readonly command: string;
  readonly success: boolean;
  readonly timedOut: boolean;
  readonly ignoredTests: number;
  readonly durationMs: number;
  readonly output: string;
}

interface DatabaseTarget {
  readonly environmentKey: string;
  readonly baseDatabaseName: string;
}

export function isPostgresIntegrationTest(content: string): boolean {
  return POSTGRES_MARKERS.some((marker) => content.includes(marker));
}

export function partitionTestFiles(
  files: readonly string[],
  contents: ReadonlyMap<string, string>,
): TestPartition {
  const parallel: string[] = [];
  const postgres: string[] = [];
  for (const file of files) {
    const content = contents.get(file) ?? "";
    const isPostgresFile =
      /(?:^|_)postgres(?:_integration)?\.(?:spec|test)\.ts$/.test(file) ||
      isPostgresIntegrationTest(content);
    (isPostgresFile ? postgres : parallel).push(file);
  }
  return { parallel, postgres };
}

export function countIgnoredTests(output: string): number {
  const summaryCounts = [...output.matchAll(/\|\s*(\d+)\s+ignored\b/gi)]
    .map((match) => Number(match[1]));
  const labelledCounts = [...output.matchAll(/\bignored\s*[:=]\s*(\d+)/gi)]
    .map((match) => Number(match[1]));
  return Math.max(
    summaryCounts.reduce((total, count) => total + count, 0),
    labelledCounts.reduce((total, count) => total + count, 0),
  );
}

export function requiredDatabaseTestsPassed(
  result: Pick<CanonicalTestResult, "success" | "ignoredTests" | "timedOut">,
): boolean {
  return result.success && result.ignoredTests === 0 && !result.timedOut;
}

export function databaseTargetForTest(content: string): DatabaseTarget {
  if (content.includes(NOTIFICATIONS_MARKER)) {
    return {
      environmentKey: NOTIFICATIONS_MARKER,
      baseDatabaseName: NOTIFICATIONS_DATABASE_NAME,
    };
  }
  return {
    environmentKey: "POSTGRES_INTEGRATION_TEST_DATABASE_URL",
    baseDatabaseName: POSTGRES_DATABASE_NAME,
  };
}

async function collectTestFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) files.push(...await collectTestFiles(path));
    if (entry.isFile && /(?:\.(?:spec|test)|_test)\.ts$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files.sort();
}

async function runTests(
  files: readonly string[],
  serial: boolean,
  contents: ReadonlyMap<string, string>,
): Promise<CanonicalTestResult[]> {
  if (files.length === 0) return [];
  const flags = [
    "test",
    "--env",
    "--allow-read",
    "--allow-write",
    "--allow-env",
    "--allow-ffi",
    "--allow-run",
    "--allow-net",
  ];
  if (!serial) {
    return [await runCommand([...flags, ...files], "parallel")];
  }
  const results: CanonicalTestResult[] = [];
  for (const file of files) {
    const target = databaseTargetForTest(contents.get(file) ?? "");
    const baseUrl = Deno.env.get(target.environmentKey);
    if (baseUrl === undefined) {
      results.push(await runCommand([...flags, file], "postgresql"));
      continue;
    }
    const databaseName = isolatedPostgresDatabaseName(
      file,
      target.baseDatabaseName,
    );
    try {
      const suiteUrl = await createIsolatedPostgresDatabase(baseUrl, file);
      results.push(
        await runCommand(
          [...flags, file],
          "postgresql",
          { [target.environmentKey]: suiteUrl },
        ),
      );
    } catch (error) {
      results.push(failedSetupResult(file, error));
    } finally {
      await dropIsolatedPostgresDatabase(baseUrl, databaseName).catch(() => {});
    }
  }
  return results;
}

async function runCommand(
  args: readonly string[],
  category: CanonicalTestResult["category"],
  envOverrides: Record<string, string> = {},
): Promise<CanonicalTestResult> {
  const command = `deno ${args.join(" ")}`;
  const startedAt = performance.now();
  try {
    const child = new Deno.Command("deno", {
      args: [...args],
      env: { ...Deno.env.toObject(), ...envOverrides, DENO_ENV: "test" },
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const output = await outputWithTimeout(child, CANONICAL_TEST_TIMEOUT_MS);
    const ignoredTests = countIgnoredTests(output.text);
    const requiredIgnored = category === "postgresql" && ignoredTests > 0;
    const success = output.success && !requiredIgnored && !output.timedOut;
    const detail = requiredIgnored
      ? `${output.text}\nRequired PostgreSQL tests were ignored: ${ignoredTests}.`
      : output.text;
    console.log(detail);
    return {
      category,
      command,
      success,
      timedOut: output.timedOut,
      ignoredTests,
      durationMs: roundedMilliseconds(performance.now() - startedAt),
      output: detail,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      category,
      command,
      success: false,
      timedOut: false,
      ignoredTests: 0,
      durationMs: roundedMilliseconds(performance.now() - startedAt),
      output: `Failed to run '${command}': ${detail}`,
    };
  }
}

function failedSetupResult(
  file: string,
  error: unknown,
): CanonicalTestResult {
  const detail = error instanceof Error ? error.message : String(error);
  return {
    category: "postgresql",
    command: `prepare isolated database for ${file}`,
    success: false,
    timedOut: false,
    ignoredTests: 0,
    durationMs: 0,
    output: `Unable to prepare isolated PostgreSQL state: ${detail}`,
  };
}

interface ChildOutput {
  readonly success: boolean;
  readonly timedOut: boolean;
  readonly text: string;
}

async function outputWithTimeout(
  child: Deno.ChildProcess,
  timeoutMs: number,
): Promise<ChildOutput> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ChildOutput>((resolve) => {
    timeoutId = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // The process can exit between the timeout and the signal.
      }
      resolve({
        success: false,
        timedOut: true,
        text: `Timed out after ${timeoutMs} ms.`,
      });
    }, timeoutMs);
  });
  const output = child.output().then((result) => ({
    success: result.success,
    timedOut: false,
    text: decodeOutput(result.stdout, result.stderr),
  }));
  try {
    return await Promise.race([output, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function decodeOutput(stdout: Uint8Array, stderr: Uint8Array): string {
  const decoder = new TextDecoder();
  return `${decoder.decode(stdout)}${decoder.decode(stderr)}`.trim();
}

function roundedMilliseconds(durationMs: number): number {
  return Math.round(durationMs);
}

async function main(): Promise<void> {
  const files = (await Promise.all(TEST_ROOTS.map(collectTestFiles))).flat();
  const contents = new Map<string, string>();
  for (const file of files) contents.set(file, await Deno.readTextFile(file));
  const partition = partitionTestFiles(files, contents);
  console.log(
    `Canonical Deno partition: ${partition.parallel.length} parallel, ` +
      `${partition.postgres.length} PostgreSQL serial files.`,
  );
  const results = [
    ...await runTests(partition.parallel, false, contents),
    ...await runTests(partition.postgres, true, contents),
  ];
  const failed = results.filter((result) => !result.success);
  const summary = results.map((result) => ({
    category: result.category,
    command: result.command,
    success: result.success,
    timedOut: result.timedOut,
    ignoredTests: result.ignoredTests,
    durationMs: result.durationMs,
  }));
  console.log(
    `CANONICAL_DENO_RESULT_JSON=${JSON.stringify({ results: summary })}`,
  );
  if (failed.length > 0) Deno.exit(1);
}

if (import.meta.main) await main();
