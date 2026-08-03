import {
  DealReconciliationExecutor,
  DeterministicLegacyDealMapper,
  type LegacyDealRecord,
  type ReconciliationMode,
  type ReconciliationRunResult,
  type ReconciliationVerificationResult,
} from "../src/deal_management/v1.ts";
import type {
  DealCommandContext,
  DealScope,
  ReconciliationOperatorContext,
} from "../src/deal_management/v1.ts";
import type { DealReconciliationRecord } from "../src/deal_management/v1.ts";
import {
  type ActorId,
  type CorrelationId,
  parseActorId,
  parseCorrelationId,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "../src/platform/api/v1.ts";

const APPLY_CONFIRMATION = "APPLY_MAI_110";

/**
 * Describes the approved runtime factory required for authoritative modes.
 *
 * @example const runtimeModule: ReconciliationRuntimeModule = { createRuntime }
 */
export interface ReconciliationRuntimeModule {
  createRuntime(input: {
    readonly scope: DealScope;
    readonly actorId: ActorId;
    readonly correlationId: CorrelationId;
    readonly now: string;
  }): Promise<ReconciliationRuntime>;
}

/**
 * Provides the executor and scoped command context for one operator run.
 *
 * @example const runtime: ReconciliationRuntime = await module.createRuntime(input)
 */
export interface ReconciliationRuntime {
  readonly executor: DealReconciliationExecutor;
  readonly commandContext: DealCommandContext;
  close(): Promise<void>;
}

/**
 * Runs the bounded MAI-110 operator command with explicit mode and inputs.
 *
 * Dry-run maps JSON records without constructing an authoritative repository;
 * apply and resume require an operator-provided runtime module with approved
 * authentication, authorization, persistence, and audit dependencies.
 *
 * @example await runReconciliationCli(["--mode", "dry-run", "--input", "legacy.json", "--tenant", "tenant_a", "--workspace", "workspace_a"])
 */
export async function runReconciliationCli(
  argumentsValue: readonly string[],
): Promise<void> {
  const options = parseOptions(argumentsValue);
  const scope = parseScope(options);
  const records = await readLegacyRecords(options.input);
  if (options.mode === "dry-run") {
    await writeDryRun(records, scope, options.now);
    return;
  }
  requireApplyConfirmation(options);
  const runtime = await loadRuntime(options.runtimeModule, scope, options);
  try {
    const report = await runAuthoritativeMode(runtime, options, records, scope);
    console.log(JSON.stringify(report));
  } finally {
    await runtime.close();
  }
}

if (import.meta.main) {
  await runReconciliationCli(Deno.args);
}

interface ReconciliationOptions {
  readonly mode:
    | ReconciliationMode
    | "verify"
    | "rollback-routing"
    | "authoritative-routing";
  readonly input: string;
  readonly tenant: string;
  readonly workspace: string;
  readonly actor: string;
  readonly correlation: string;
  readonly now: string;
  readonly runtimeModule?: string;
  readonly confirmation?: string;
  readonly reason: string;
}

function parseOptions(
  argumentsValue: readonly string[],
): ReconciliationOptions {
  const values = optionValues(argumentsValue);
  const mode = requiredMode(values.get("mode"));
  return parsedOptions(values, mode);
}

function optionValues(argumentsValue: readonly string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < argumentsValue.length; index += 2) {
    const flag = argumentsValue[index];
    const value = argumentsValue[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith("--")) {
      throw new Error(
        `Operator argument "${
          flag ?? "undefined"
        }" is invalid; expected --flag value pairs.`,
      );
    }
    values.set(flag.slice(2), value);
  }
  return values;
}

function requiredMode(mode: string | undefined): ReconciliationOptions["mode"] {
  if (!isMode(mode)) {
    throw new Error(
      `Operator mode "${
        mode ?? "undefined"
      }" is invalid; expected dry-run, apply, resume, verify, or rollback-routing.`,
    );
  }
  return mode;
}

function parsedOptions(
  values: ReadonlyMap<string, string>,
  mode: ReconciliationOptions["mode"],
): ReconciliationOptions {
  return {
    mode,
    input: requiredOption(values, "input"),
    tenant: requiredOption(values, "tenant"),
    workspace: requiredOption(values, "workspace"),
    actor: values.get("actor") ?? "actor_operator",
    correlation: values.get("correlation") ?? "cor_reconciliation",
    now: values.get("now") ?? new Date().toISOString(),
    runtimeModule: values.get("runtime-module"),
    confirmation: values.get("confirm"),
    reason: values.get("reason") ?? "MAI-110 operator routing procedure",
  };
}

function parseScope(options: ReconciliationOptions): DealScope {
  const tenant = parseTenantId(options.tenant);
  const workspace = parseWorkspaceId(options.workspace);
  if (!tenant.ok || !workspace.ok) {
    throw new Error(
      `Operator scope "${options.tenant}/${options.workspace}" is invalid; expected tenant_<slug>/workspace_<slug>.`,
    );
  }
  return { tenantId: tenant.value, workspaceId: workspace.value };
}

async function readLegacyRecords(
  path: string,
): Promise<readonly LegacyDealRecord[]> {
  const parsed = await parseLegacyFile(path);
  assertLegacyRecords(path, parsed);
  return parsed;
}

async function parseLegacyFile(path: string): Promise<unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    throw new Error(
      `Legacy input "${path}" could not be read as JSON; expected a readable JSON array: ${
        error instanceof Error ? error.message : String(error)
      }.`,
    );
  }
  return parsed;
}

function assertLegacyRecords(
  path: string,
  parsed: unknown,
): asserts parsed is LegacyDealRecord[] {
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Legacy input "${path}" is invalid; expected a JSON array of LegacyDealRecord objects.`,
    );
  }
  if (!parsed.every(isLegacyDealRecord)) {
    throw new Error(
      `Legacy input "${path}" contains an invalid record; expected source, legacyDealId, parties, and team fields.`,
    );
  }
}

async function writeDryRun(
  records: readonly LegacyDealRecord[],
  scope: DealScope,
  now: string,
): Promise<void> {
  const mapper = new DeterministicLegacyDealMapper();
  const mappings = [];
  for (const record of records) {
    mappings.push(await mapper.map({ record, scope, now }));
  }
  console.log(
    JSON.stringify({ mode: "dry-run", authoritativeWrites: 0, mappings }),
  );
}

async function loadRuntime(
  path: string | undefined,
  scope: DealScope,
  options: ReconciliationOptions,
): Promise<ReconciliationRuntime> {
  const runtimePath = path ?? "./scripts/mai_110_runtime.ts";
  const imported: unknown = await importRuntime(runtimePath);
  if (!isRuntimeModule(imported)) {
    throw new Error(
      `Operator runtime module "${runtimePath}" is invalid; expected createRuntime(input).`,
    );
  }
  const identity = runtimeIdentity(options);
  return await imported.createRuntime({
    scope,
    actorId: identity.actorId,
    correlationId: identity.correlationId,
    now: options.now,
  });
}

function importRuntime(path: string): Promise<unknown> {
  return import(new URL(path, `file://${Deno.cwd()}/`).href);
}

function runtimeIdentity(
  options: ReconciliationOptions,
): { actorId: ActorId; correlationId: CorrelationId } {
  const actor = parseActorId(options.actor);
  const correlation = parseCorrelationId(options.correlation);
  if (actor.ok && correlation.ok) {
    return { actorId: actor.value, correlationId: correlation.value };
  }
  throw new Error(
    `Operator identity "${options.actor}" or correlation "${options.correlation}" is invalid; expected canonical identifiers.`,
  );
}

async function runAuthoritativeMode(
  runtime: ReconciliationRuntime,
  options: ReconciliationOptions,
  records: readonly LegacyDealRecord[],
  scope: DealScope,
): Promise<
  | ReconciliationRunResult
  | ReconciliationVerificationResult
  | Readonly<Record<string, unknown>>
> {
  const operator = operatorContext(runtime, options, scope);
  const legacyDealIds = records.map((record) => record.legacyDealId);
  if (options.mode === "verify") {
    return await runtime.executor.verifyBatch({ legacyDealIds, operator });
  }
  if (isRoutingMode(options.mode)) {
    return await runRoutingBatch(runtime, options, records, operator);
  }
  return await runtime.executor.runBatch({
    mode: options.mode,
    legacyDealIds,
    operator,
  });
}

function operatorContext(
  runtime: ReconciliationRuntime,
  options: ReconciliationOptions,
  scope: DealScope,
): ReconciliationOperatorContext {
  return {
    scope,
    actorId: runtime.commandContext.actor.id,
    correlationId: runtime.commandContext.request.correlationId,
    now: options.now,
    commandContext: runtime.commandContext,
  };
}

async function runRoutingBatch(
  runtime: ReconciliationRuntime,
  options: ReconciliationOptions,
  records: readonly LegacyDealRecord[],
  operator: ReturnType<typeof operatorContext>,
): Promise<Readonly<Record<string, unknown>>> {
  const routed: DealReconciliationRecord[] = [];
  for (const record of records) {
    routed.push(await routeRecord(runtime, options, record, operator));
  }
  return { mode: options.mode, routed };
}

function isRoutingMode(
  mode: ReconciliationOptions["mode"],
): mode is "rollback-routing" | "authoritative-routing" {
  return mode === "rollback-routing" || mode === "authoritative-routing";
}

function routeRecord(
  runtime: ReconciliationRuntime,
  options: ReconciliationOptions,
  record: LegacyDealRecord,
  operator: ReturnType<typeof operatorContext>,
): Promise<DealReconciliationRecord> {
  if (options.mode === "rollback-routing") {
    return runtime.executor.rollbackReadRouting({
      legacySource: record.source,
      legacyDealId: record.legacyDealId,
      operator,
      reason: options.reason,
    });
  }
  return runtime.executor.restoreAuthoritativeReadRouting({
    legacySource: record.source,
    legacyDealId: record.legacyDealId,
    operator,
    reason: options.reason,
  });
}

function requireApplyConfirmation(options: ReconciliationOptions): void {
  if (options.mode !== "apply") return;
  if (options.confirmation === APPLY_CONFIRMATION) return;
  throw new Error(
    `Apply confirmation "${
      options.confirmation ?? "undefined"
    }" is invalid; expected --confirm ${APPLY_CONFIRMATION}.`,
  );
}

function requiredOption(
  values: ReadonlyMap<string, string>,
  name: string,
): string {
  const value = values.get(name);
  if (value !== undefined && value.trim().length > 0) return value;
  throw new Error(
    `Operator option "--${name}" is missing; expected a non-empty value.`,
  );
}

function isMode(
  value: string | undefined,
): value is ReconciliationOptions["mode"] {
  return value === "dry-run" || value === "apply" || value === "resume" ||
    value === "verify" || value === "rollback-routing" ||
    value === "authoritative-routing";
}

function isRuntimeModule(value: unknown): value is ReconciliationRuntimeModule {
  return typeof value === "object" && value !== null &&
    "createRuntime" in value && typeof value.createRuntime === "function";
}

function isLegacyDealRecord(value: unknown): value is LegacyDealRecord {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value) && "source" in value &&
    typeof value.source === "string" &&
    "legacyDealId" in value && typeof value.legacyDealId === "string" &&
    "parties" in value && Array.isArray(value.parties) &&
    "team" in value && Array.isArray(value.team);
}

export type { TenantId, WorkspaceId };
