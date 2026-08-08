export interface LocalStorageProbeEnvironment {
  readonly composeEnv: Readonly<Record<string, string>>;
}

const COMPOSE_FILE = "infra/local/docker-compose.yml";
const ENV_FILE = "infra/local/.env";

/** Proves authenticated local object storage and optionally preserves a sentinel. */
export async function runLocalStorageProbe(
  environment: LocalStorageProbeEnvironment,
  write = true,
): Promise<void> {
  const directory = environment.composeEnv.LOCAL_STORAGE_CHECK_PATH ??
    ".local/storage-check";
  await Deno.mkdir(directory, { recursive: true });
  const payload = new TextEncoder().encode("mai-local-storage-check-v1\n");
  if (write) await Deno.writeFile(`${directory}/payload`, payload);
  const expected = await Deno.readFile(`${directory}/payload`);
  const composeUser = `${Deno.uid()}:${Deno.gid()}`;
  const result = await new Deno.Command("docker", {
    args: [
      "compose",
      "--env-file",
      ENV_FILE,
      "-f",
      COMPOSE_FILE,
      "--profile",
      "check",
      "run",
      "--rm",
      "--user",
      composeUser,
      "storage-check-local",
    ],
    stdout: "piped",
    stderr: "piped",
    env: {
      ...environment.composeEnv,
      LOCAL_STORAGE_CHECK_READ_ONLY: write ? "false" : "true",
    },
  }).output();
  if (!result.success) {
    throw new Error(
      "Authenticated local object-storage write/read failed; configured storage did not pass its boundary probe.",
    );
  }
  const readback = await Deno.readFile(`${directory}/readback`);
  if (await digest(expected) !== await digest(readback)) {
    throw new Error(
      "Local object-storage readback digest did not match the write.",
    );
  }
}

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource,
  );
  return Array.from(
    new Uint8Array(hash),
    (value) => value.toString(16).padStart(2, "0"),
  )
    .join("");
}
