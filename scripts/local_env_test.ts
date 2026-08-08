import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { buildLocalEnvironment, writeLocalEnvironment } from "./local_env.ts";

Deno.test("local environment uses independent credentials and explicit local profile", async () => {
  const root = await Deno.makeTempDir({ prefix: "mai-local-env-" });
  const output = new URL(`file://${root}/infra/local/.env`);
  await writeLocalEnvironment({
    output,
    secretFactory: () => ({
      postgres: "postgres-secret",
      storage: "storage-secret",
    }),
  });
  const contents = await Deno.readTextFile(output);
  assertStringIncludes(
    contents,
    "DATABASE_URL=postgresql://mai_local:postgres-secret@",
  );
  assertStringIncludes(contents, "LOCAL_RUNTIME_PROFILE=local");
  assertStringIncludes(contents, "MAI_AI_PROVIDER=disabled");
  assertNotEquals(
    value(contents, "LOCAL_POSTGRES_PASSWORD"),
    value(contents, "LOCAL_STORAGE_SECRET_KEY"),
  );
  const info = await Deno.stat(output);
  if (info.mode !== null) assertEquals(info.mode & 0o777, 0o600);
  await Deno.remove(root, { recursive: true });
});

Deno.test("local environment rejects a shared generated secret", () => {
  let error: unknown;
  try {
    buildLocalEnvironment({ postgres: "same", storage: "same" });
  } catch (candidate) {
    error = candidate;
  }
  assertStringIncludes(String(error), "independently generated");
});

Deno.test("local environment preserves existing values until forced rotation", async () => {
  const root = await Deno.makeTempDir({ prefix: "mai-local-env-rotation-" });
  const output = new URL(`file://${root}/infra/local/.env`);
  await writeLocalEnvironment({
    output,
    secretFactory: () => ({
      postgres: "first-postgres",
      storage: "first-storage",
    }),
  });
  await writeLocalEnvironment({
    output,
    secretFactory: () => ({
      postgres: "second-postgres",
      storage: "second-storage",
    }),
  });
  assertEquals(
    value(await Deno.readTextFile(output), "LOCAL_POSTGRES_PASSWORD"),
    "first-postgres",
  );
  await writeLocalEnvironment({
    output,
    force: true,
    secretFactory: () => ({
      postgres: "second-postgres",
      storage: "second-storage",
    }),
  });
  const rotated = await Deno.readTextFile(output);
  assertEquals(value(rotated, "LOCAL_POSTGRES_PASSWORD"), "second-postgres");
  assertEquals(value(rotated, "LOCAL_STORAGE_SECRET_KEY"), "second-storage");
  await Deno.remove(root, { recursive: true });
});

function value(contents: string, name: string): string {
  return contents.split("\n").find((line) => line.startsWith(`${name}=`))
    ?.slice(
      name.length + 1,
    ) ?? "";
}
