const LOCAL_ENV_FILE = "infra/local/.env";

/** Parses the ignored local environment without evaluating shell syntax. */
export function parseLocalGuiEnvironment(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

/** Completes older generated environments with the local browser contract. */
export function resolveLocalGuiEnvironment(
  environment: Readonly<Record<string, string>>,
): Record<string, string> {
  return {
    ...environment,
    MAI_API_BASE_URL: environment.MAI_API_BASE_URL ??
      environment.LOCAL_API_URL ?? "http://127.0.0.1:18000",
    MAI_FRONTEND_DATA_SOURCE: environment.MAI_FRONTEND_DATA_SOURCE ?? "v1",
    MAI_LOCAL_MVP_ENABLED: environment.MAI_LOCAL_MVP_ENABLED ?? "true",
    MAI_LOCAL_SESSION_ID: environment.MAI_LOCAL_SESSION_ID ??
      "session_local-banker",
    MAI_LOCAL_DEAL_ID: environment.MAI_LOCAL_DEAL_ID ?? "deal_serra-azul",
  };
}

/** Starts Next.js with the generated local runtime contract. */
export async function startLocalGui(): Promise<void> {
  const local = resolveLocalGuiEnvironment(
    parseLocalGuiEnvironment(await Deno.readTextFile(LOCAL_ENV_FILE)),
  );
  assertLocalGuiEnvironment(local);
  const child = new Deno.Command("npm", {
    args: ["--prefix", "gui", "run", "dev", ...Deno.args],
    env: { ...Deno.env.toObject(), ...local },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  if (!status.success) Deno.exit(status.code);
}

function assertLocalGuiEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): void {
  const required = [
    "MAI_API_BASE_URL",
    "MAI_FRONTEND_DATA_SOURCE",
    "MAI_LOCAL_MVP_ENABLED",
    "MAI_LOCAL_SESSION_ID",
    "MAI_LOCAL_DEAL_ID",
  ] as const;
  for (const key of required) {
    if (environment[key]) continue;
    throw new Error(
      `Local GUI environment is missing "${key}"; expected deno task local:prepare output.`,
    );
  }
}

if (import.meta.main) await startLocalGui();
