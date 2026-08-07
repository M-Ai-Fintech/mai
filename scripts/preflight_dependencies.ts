import type {
  FilePresenceProbe,
  PreflightCommandRunner,
  PreflightResult,
} from "./preflight.ts";

const WARM_DENO_ENTRIES = [
  "scripts/preflight.ts",
  "scripts/verify.ts",
  "scripts/run_canonical_deno_tests.ts",
] as const;
const TEST_ROOTS = ["tests", "src", "scripts"] as const;

export async function prepareNodeDependencies(
  commandRunner: PreflightCommandRunner,
  filePresenceProbe: FilePresenceProbe,
): Promise<PreflightResult> {
  const missing = await missingNodeDependencies(filePresenceProbe);
  if (missing.length === 0) {
    return passedResult(
      "prepare-node-dependencies",
      "Prepare Node and GUI dependencies",
      "Next, Vitest, and Storybook are already warm.",
    );
  }
  return await commandResult(
    "prepare-node-dependencies",
    "Prepare Node and GUI dependencies",
    true,
    commandRunner,
    "npm",
    ["--prefix", "gui", "ci", "--prefer-offline", "--no-audit", "--no-fund"],
    "Node and GUI dependencies installed from the lockfile.",
  );
}

export async function prepareBrowserDependencies(
  environment: Record<string, string | undefined>,
  commandRunner: PreflightCommandRunner,
  filePresenceProbe: FilePresenceProbe,
): Promise<PreflightResult> {
  if (await hasBrowserDependencies(environment, filePresenceProbe)) {
    return passedResult(
      "prepare-browser-dependencies",
      "Prepare browser dependencies",
      "Playwright browsers are already warm.",
    );
  }
  if (environment.MAI_PREPARE_BROWSERS !== "1") {
    return unavailableResult(
      "prepare-browser-dependencies",
      "Prepare browser dependencies",
      "Browsers are missing; set MAI_PREPARE_BROWSERS=1 to install Chromium.",
    );
  }
  return await commandResult(
    "prepare-browser-dependencies",
    "Prepare browser dependencies",
    true,
    commandRunner,
    "gui/node_modules/.bin/playwright",
    ["install", "chromium"],
    "Playwright Chromium installed.",
  );
}

export async function checkDenoCache(
  commandRunner: PreflightCommandRunner,
  prepare: boolean,
): Promise<PreflightResult> {
  const entries = await collectWarmDenoEntries();
  if (prepare) {
    const warmed = await commandRunner("deno", [
      "cache",
      "--config",
      "deno.json",
      ...entries,
    ]);
    if (!warmed.success) {
      return failedResult("deno-cache", "Deno dependency cache", warmed.output);
    }
  }
  const cached = await commandRunner("deno", [
    "eval",
    "--cached-only",
    "--config",
    "deno.json",
    cachedDenoImportExpression(entries),
  ]);
  return cached.success
    ? passedResult(
      "deno-cache",
      "Deno dependency cache",
      "Repository test and runner entries are warm.",
    )
    : unavailableResult(
      "deno-cache",
      "Deno dependency cache",
      "Required entries are not warm; run deno task prepare.",
    );
}

export async function checkNodeDependencies(
  filePresenceProbe: FilePresenceProbe,
): Promise<PreflightResult> {
  const missing = await missingNodeDependencies(filePresenceProbe);
  return missing.length === 0
    ? passedResult(
      "node-dependencies",
      "Node and GUI dependencies",
      "Next, Vitest, and Storybook are installed.",
    )
    : unavailableResult(
      "node-dependencies",
      "Node and GUI dependencies",
      `Missing ${missing.join(", ")}; run deno task prepare.`,
    );
}

export async function checkBrowserDependencies(
  environment: Record<string, string | undefined>,
  filePresenceProbe: FilePresenceProbe,
): Promise<PreflightResult> {
  const browserPath = await firstBrowserDependencyPath(
    environment,
    filePresenceProbe,
  );
  if (browserPath !== undefined) {
    return passedResult(
      "browser-dependencies",
      "Browser test dependencies",
      `Playwright browsers found at ${browserPath}.`,
    );
  }
  return unavailableResult(
    "browser-dependencies",
    "Browser test dependencies",
    "Playwright browsers are not present; install them before GUI interaction checks.",
  );
}

async function collectWarmDenoEntries(): Promise<string[]> {
  const testEntries = (
    await Promise.all(TEST_ROOTS.map(collectTestEntries))
  ).flat();
  return [...new Set([...WARM_DENO_ENTRIES, ...testEntries])].sort();
}

async function collectTestEntries(root: string): Promise<string[]> {
  const entries: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) entries.push(...await collectTestEntries(path));
    if (entry.isFile && /(?:\.(?:spec|test)|_test)\.ts$/.test(entry.name)) {
      entries.push(path);
    }
  }
  return entries;
}

function cachedDenoImportExpression(entries: readonly string[]): string {
  const imports = entries.map((entry) => `import("./${entry}")`).join(",");
  return `await Promise.all([${imports}])`;
}

async function missingNodeDependencies(
  filePresenceProbe: FilePresenceProbe,
): Promise<string[]> {
  const required = [
    "gui/node_modules/.bin/next",
    "gui/node_modules/.bin/vitest",
    "gui/node_modules/.bin/storybook",
  ];
  const missing: string[] = [];
  for (const path of required) {
    if (!await filePresenceProbe(path)) missing.push(path);
  }
  return missing;
}

async function hasBrowserDependencies(
  environment: Record<string, string | undefined>,
  filePresenceProbe: FilePresenceProbe,
): Promise<boolean> {
  return await firstBrowserDependencyPath(environment, filePresenceProbe) !==
    undefined;
}

async function firstBrowserDependencyPath(
  environment: Record<string, string | undefined>,
  filePresenceProbe: FilePresenceProbe,
): Promise<string | undefined> {
  const cacheRoot = environment.PLAYWRIGHT_BROWSERS_PATH ??
    environment.XDG_CACHE_HOME ??
    (environment.HOME === undefined ? undefined : `${environment.HOME}/.cache`);
  const candidates = [
    "gui/node_modules/.cache/ms-playwright",
    cacheRoot === undefined ? undefined : `${cacheRoot}/ms-playwright`,
  ].filter((path): path is string => path !== undefined);
  for (const path of candidates) {
    if (await filePresenceProbe(path)) return path;
  }
  return undefined;
}

function commandResult(
  id: string,
  label: string,
  required: boolean,
  commandRunner: PreflightCommandRunner,
  command: string,
  args: readonly string[],
  successDetail: string,
): Promise<PreflightResult> {
  return commandRunner(command, args).then((result) =>
    result.success
      ? { id, label, required, status: "passed", detail: successDetail }
      : { id, label, required, status: "failed", detail: result.output }
  );
}

function passedResult(
  id: string,
  label: string,
  detail: string,
): PreflightResult {
  return { id, label, required: true, status: "passed", detail };
}

function failedResult(
  id: string,
  label: string,
  detail: string,
): PreflightResult {
  return { id, label, required: true, status: "failed", detail };
}

function unavailableResult(
  id: string,
  label: string,
  detail: string,
): PreflightResult {
  return { id, label, required: true, status: "unavailable", detail };
}
