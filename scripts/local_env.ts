const outputPath = new URL("../infra/local/.env", import.meta.url);

/** Creates a local-only Compose environment without committing credentials. */
export async function writeLocalEnvironment(
  force = Deno.args.includes("--force"),
): Promise<void> {
  try {
    await Deno.stat(outputPath);
    if (!force) {
      console.log("Local Compose environment already exists; preserving it.");
      return;
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  const password = `local-${crypto.randomUUID()}`;
  const contents = [
    "LOCAL_POSTGRES_USER=mai_local",
    `LOCAL_POSTGRES_PASSWORD=${password}`,
    "LOCAL_POSTGRES_DATABASE=mai_local",
    "LOCAL_POSTGRES_PORT=55438",
    "LOCAL_API_PORT=18000",
    "LOCAL_STORAGE_PORT=19000",
    "LOCAL_STORAGE_ACCESS_KEY=mai_local",
    `LOCAL_STORAGE_SECRET_KEY=${password}`,
    "LOCAL_STORAGE_BUCKET=mai-local",
    "LOCAL_WORKER_ID=worker_local",
    "LOCAL_WORKER_MODULE=./src/platform/jobs/local_worker.ts",
    "LOCAL_PREPROVISION_ROLES=true",
    "",
  ].join("\n");
  await Deno.writeTextFile(outputPath, contents, { createNew: true });
  console.log("Created ignored local Compose environment at infra/local/.env.");
}

if (import.meta.main) await writeLocalEnvironment();
