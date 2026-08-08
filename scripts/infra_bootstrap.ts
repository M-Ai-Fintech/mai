const COMPOSE_FILE = "infra/local/docker-compose.yml";
const ENV_FILE = "infra/local/.env";
const ROOT_ENV_FILE = ".env";

export const CLEAN_BOOTSTRAP_STEPS = [
  ["deno", "task", "local:prepare"],
  [
    "docker",
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "up",
    "-d",
    "--wait",
    "postgres-local",
    "storage-local",
  ],
  ["deno", "task", "infra:validate"],
  ["deno", "task", "db:migrate"],
  [
    "docker",
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "--profile",
    "worker",
    "up",
    "-d",
    "--build",
    "--wait",
    "api-local",
    "worker-local",
  ],
  ["deno", "task", "infra:smoke"],
] as const;

export interface BootstrapCommandResult {
  readonly success: boolean;
  readonly output?: string;
}

export type BootstrapCommand = (
  command: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
) => Promise<BootstrapCommandResult>;

/** Executes the documented local bootstrap with generated variables only. */
export async function runCleanLocalBootstrap(
  command: BootstrapCommand = runCommand,
): Promise<void> {
  await assertCleanLocalInputs();
  const environment = await readLocalEnvironment();
  for (const [index, step] of CLEAN_BOOTSTRAP_STEPS.entries()) {
    const result = await command(step[0], step.slice(1), environment);
    if (result.success) continue;
    throw new Error(
      `Clean local bootstrap step ${index + 1} (${
        step.join(" ")
      }) failed; inspect the bounded command diagnostics without printing credentials.`,
    );
  }
}

async function assertCleanLocalInputs(): Promise<void> {
  if (await exists(ENV_FILE)) {
    throw new Error(
      `Clean local bootstrap requires no ${ENV_FILE}; remove only the generated local file before retrying.`,
    );
  }
  if (await exists(".local")) {
    throw new Error(
      "Clean local bootstrap requires no generated .local artifacts; remove only local generated artifacts before retrying.",
    );
  }
  if (await exists(ROOT_ENV_FILE)) {
    throw new Error(
      "Clean local bootstrap requires no repository root .env; use explicit infra/local/.env configuration instead.",
    );
  }
}

async function readLocalEnvironment(): Promise<Record<string, string>> {
  const result = await runCommand("deno", ["task", "local:prepare"], {});
  if (!result.success) throw new Error("Local environment generation failed.");
  const text = await Deno.readTextFile(ENV_FILE);
  const values: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

async function runCommand(
  command: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
): Promise<BootstrapCommandResult> {
  const child = new Deno.Command(command, {
    args: [...args],
    env: { ...Deno.env.toObject(), ...environment },
    stdout: "piped",
    stderr: "piped",
  });
  const result = await child.output();
  return {
    success: result.success,
    output: `${new TextDecoder().decode(result.stdout)}${
      new TextDecoder().decode(result.stderr)
    }`,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

if (import.meta.main) await runCleanLocalBootstrap();
