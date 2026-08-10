import {
  DealReconciliationExecutor,
  type ReconciliationMode,
  type ReconciliationRunResult,
  type ReconciliationVerificationResult,
} from "../src/deal_management/v1.ts";
import type { ReconciliationOutcome } from "../src/deal_management/v1.ts";
import type {
  DealCommandContext,
  DealScope,
  ReconciliationOperatorContext,
} from "../src/deal_management/v1.ts";
import type { DealReconciliationRecord } from "../src/deal_management/v1.ts";
import {
  createRuntime as createAuthenticatedRuntime,
} from "./deal_reconciliation_runtime.ts";
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
 * @example const runtimeFactory: ReconciliationRuntimeFactory = { createRuntime }
 */
export interface ReconciliationRuntimeFactory {
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
 * @example const runtime: ReconciliationRuntime = await factory.createRuntime(input)
 */
export interface ReconciliationRuntime {
  readonly executor: DealReconciliationExecutor;
  readonly commandContext: DealCommandContext;
  close(): Promise<void>;
}

/** Allows tests to inject a runtime without exposing a caller-controlled module path. */
export interface ReconciliationCliDependencies {
  readonly createRuntime?: ReconciliationRuntimeFactory["createRuntime"];
}

export interface LegacyDealSelector {
  readonly source: string;
  readonly legacyDealId: string;
}

/**
 * Runs the bounded MAI-110 operator command with explicit mode and inputs.
 *
 * Dry-run and authoritative modes use the same authenticated production
 * runtime; dry-run remains non-authoritative through the executor mode.
 *
 * @example await runReconciliationCli(["--mode", "dry-run", "--input", "selectors.json", "--tenant", "tenant_a", "--workspace", "workspace_a"])
 */
export async function runReconciliationCli(
  argumentsValue: readonly string[],
  dependencies: ReconciliationCliDependencies = {},
): Promise<void> {
  const options = parseOptions(argumentsValue);
  const scope = parseScope(options);
  const selectors = await readSelectors(options.input);
  requireApplyConfirmation(options);
  const runtime = await loadRuntime(
    dependencies.createRuntime ?? createAuthenticatedRuntime,
    scope,
    options,
  );
  try {
    const report = await runAuthoritativeMode(
      runtime,
      options,
      selectors,
      scope,
    );
    console.log(JSON.stringify(sanitizeOperatorReport(report, options.mode)));
  } finally {
    await runtime.close();
  }
}

if (import.meta.main) {
  await runReconciliationExecutable(Deno.args);
}

/** Runs the direct executable with a stable, non-sensitive failure envelope. */
export async function runReconciliationExecutable(
  argumentsValue: readonly string[],
): Promise<void> {
  try {
    await runReconciliationCli(argumentsValue);
  } catch {
    console.error(JSON.stringify({
      ok: false,
      error: {
        code: "RECONCILIATION_FAILED",
        message: "Reconciliation failed; inspect bounded operator evidence.",
        operatorInterventionRequired: true,
      },
    }));
    Deno.exitCode = 1;
  }
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
    if (flag === "--runtime-module") {
      throw new Error(
        'Operator option "--runtime-module" is retired; expected the project-owned authenticated runtime.',
      );
    }
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

async function readSelectors(
  path: string,
): Promise<readonly LegacyDealSelector[]> {
  const parsed = await parseLegacyFile(path);
  assertSelectors(path, parsed);
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

function assertSelectors(
  path: string,
  parsed: unknown,
): asserts parsed is LegacyDealSelector[] {
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Legacy input "${path}" is invalid; expected a JSON array of source and legacyDealId selectors.`,
    );
  }
  if (!parsed.every(isLegacyDealSelector)) {
    throw new Error(
      `Legacy input "${path}" contains an invalid selector; expected only non-empty source and legacyDealId strings.`,
    );
  }
}

async function loadRuntime(
  createRuntime: ReconciliationRuntimeFactory["createRuntime"],
  scope: DealScope,
  options: ReconciliationOptions,
): Promise<ReconciliationRuntime> {
  const identity = runtimeIdentity(options);
  return await createRuntime({
    scope,
    actorId: identity.actorId,
    correlationId: identity.correlationId,
    now: options.now,
  });
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
  selectors: readonly LegacyDealSelector[],
  scope: DealScope,
): Promise<
  ReconciliationReport
> {
  const operator = operatorContext(runtime, options, scope);
  const legacyDealIds = selectors.map((selector) => selector.legacyDealId);
  const legacySource = selectorSource(selectors);
  if (options.mode === "verify") {
    return await runtime.executor.verifyBatch({
      legacyDealIds,
      legacySource,
      operator,
    });
  }
  if (isRoutingMode(options.mode)) {
    return await runRoutingBatch(
      runtime,
      options.mode,
      options,
      selectors,
      operator,
    );
  }
  return await runtime.executor.runBatch({
    mode: options.mode,
    legacyDealIds,
    legacySource,
    operator,
  });
}

function selectorSource(selectors: readonly LegacyDealSelector[]): string {
  const source = selectors[0]?.source;
  if (
    source === undefined ||
    selectors.every((selector) => selector.source === source)
  ) {
    return source ?? "";
  }
  throw new Error(
    "Legacy input contains multiple sources; expected one configured production source per run.",
  );
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
  mode: RoutingReport["mode"],
  options: ReconciliationOptions,
  selectors: readonly LegacyDealSelector[],
  operator: ReturnType<typeof operatorContext>,
): Promise<RoutingReport> {
  const routed: DealReconciliationRecord[] = [];
  for (const selector of selectors) {
    routed.push(await routeRecord(runtime, options, selector, operator));
  }
  return { mode, routed };
}

function isRoutingMode(
  mode: ReconciliationOptions["mode"],
): mode is "rollback-routing" | "authoritative-routing" {
  return mode === "rollback-routing" || mode === "authoritative-routing";
}

function routeRecord(
  runtime: ReconciliationRuntime,
  options: ReconciliationOptions,
  selector: LegacyDealSelector,
  operator: ReturnType<typeof operatorContext>,
): Promise<DealReconciliationRecord> {
  if (options.mode === "rollback-routing") {
    return runtime.executor.rollbackReadRouting({
      legacySource: selector.source,
      legacyDealId: selector.legacyDealId,
      operator,
      reason: options.reason,
    });
  }
  return runtime.executor.restoreAuthoritativeReadRouting({
    legacySource: selector.source,
    legacyDealId: selector.legacyDealId,
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

function isLegacyDealSelector(value: unknown): value is LegacyDealSelector {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value) && "source" in value &&
    typeof value.source === "string" && value.source.trim().length > 0 &&
    "legacyDealId" in value && typeof value.legacyDealId === "string" &&
    value.legacyDealId.trim().length > 0 &&
    Object.keys(value).every((key) =>
      key === "source" || key === "legacyDealId"
    );
}

export type { TenantId, WorkspaceId };

interface RoutingReport {
  readonly mode: "rollback-routing" | "authoritative-routing";
  readonly routed: readonly DealReconciliationRecord[];
}

interface OperatorIssueDto {
  readonly code: string;
  readonly operatorInterventionRequired: boolean;
  readonly retrySafe: boolean;
}

interface OperatorRecordDto {
  readonly recordId: string;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId?: string;
  readonly status: DealReconciliationRecord["status"];
  readonly routingMode: DealReconciliationRecord["routingMode"];
  readonly issue?: OperatorIssueDto;
  readonly updatedAt: string;
}

interface OperatorOutcomeDto {
  readonly kind: ReconciliationOutcome["kind"] | "routed";
  readonly record: OperatorRecordDto;
}

interface OperatorReportDto {
  readonly mode: ReconciliationOptions["mode"];
  readonly outcomes: readonly OperatorOutcomeDto[];
}

type ReconciliationReport =
  | ReconciliationRunResult
  | ReconciliationVerificationResult
  | RoutingReport;

function sanitizeOperatorReport(
  report: ReconciliationReport,
  mode: ReconciliationOptions["mode"],
): OperatorReportDto {
  if ("outcomes" in report) {
    return {
      mode,
      outcomes: report.outcomes.map((outcome) => ({
        kind: outcome.kind,
        record: sanitizeOperatorRecord(outcome.record),
      })),
    };
  }
  return {
    mode,
    outcomes: report.routed.map((record) => ({
      kind: "routed",
      record: sanitizeOperatorRecord(record),
    })),
  };
}

function sanitizeOperatorRecord(
  record: DealReconciliationRecord,
): OperatorRecordDto {
  return {
    recordId: boundedOperatorIdentifier(record.recordId),
    legacySource: boundedOperatorIdentifier(record.legacySource),
    legacyDealId: boundedOperatorIdentifier(record.legacyDealId),
    ...(record.authoritativeDealId === undefined ? {} : {
      authoritativeDealId: boundedOperatorIdentifier(
        record.authoritativeDealId,
      ),
    }),
    status: record.status,
    routingMode: record.routingMode,
    ...(record.issue === undefined ? {} : {
      issue: {
        code: record.issue.code,
        operatorInterventionRequired: record.issue.operatorInterventionRequired,
        retrySafe: record.issue.retrySafe,
      },
    }),
    updatedAt: boundedOperatorTimestamp(record.updatedAt),
  };
}

function boundedOperatorIdentifier(value: string): string {
  if (
    value.length > 128 ||
    /secret|token|password|credential|protected|party|mandate|authority/i
      .test(value)
  ) {
    return "[redacted]";
  }
  return value;
}

function boundedOperatorTimestamp(value: string): string {
  return Number.isFinite(Date.parse(value)) ? value : "[redacted]";
}
