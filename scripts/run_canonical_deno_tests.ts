const TEST_ROOTS = ["tests", "src"] as const;
const POSTGRES_MARKERS = [
  "createPostgresIntegrationTestPool",
  "PostgresMigrationRunner",
  "POSTGRES_INTEGRATION_TEST_DATABASE_URL",
  "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL",
  "mai_test_postgres_integration",
  "mai_test_notifications_integration",
] as const;

export interface TestPartition {
  readonly parallel: readonly string[];
  readonly postgres: readonly string[];
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

async function collectTestFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) files.push(...await collectTestFiles(path));
    if (entry.isFile && /\.(spec|test)\.ts$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files.sort();
}

async function runTests(
  files: readonly string[],
  serial: boolean,
): Promise<boolean> {
  if (files.length === 0) return true;
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
  if (!serial) return await runCommand([...flags, ...files]);
  let success = true;
  for (const file of files) {
    success = await runCommand([...flags, file]) && success;
  }
  return success;
}

async function runCommand(args: readonly string[]): Promise<boolean> {
  const command = new Deno.Command("deno", {
    args: [...args],
    env: { ...Deno.env.toObject(), DENO_ENV: "test" },
    stdout: "inherit",
    stderr: "inherit",
  });
  return (await command.output()).success;
}

if (import.meta.main) {
  const files = (await Promise.all(TEST_ROOTS.map(collectTestFiles))).flat();
  const contents = new Map<string, string>();
  for (const file of files) contents.set(file, await Deno.readTextFile(file));
  const partition = partitionTestFiles(files, contents);
  console.log(
    `Canonical Deno partition: ${partition.parallel.length} parallel, ` +
      `${partition.postgres.length} PostgreSQL serial files.`,
  );
  const parallelSuccess = await runTests(partition.parallel, false);
  const postgresSuccess = await runTests(partition.postgres, true);
  if (!parallelSuccess || !postgresSuccess) Deno.exit(1);
}
