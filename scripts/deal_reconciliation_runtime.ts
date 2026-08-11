import {
  loadExecutableDealManagement,
  PostgresDealAuthorization,
  PostgresIdentityAccessAuthentication,
} from "../src/api/deal_management_bootstrap.ts";
import type {
  AuthenticatedPrincipal,
  AuthenticationPort,
} from "../src/identity_access/v1.ts";
import type {
  DealManagementComposition,
} from "../src/deal_management/composition.ts";
import type {
  DealCommandContext,
  DealReconciliationRecord,
  ReconciliationMode,
  ReconciliationOutcome,
  ReconciliationRunResult,
  ReconciliationVerificationResult,
} from "../src/deal_management/v1.ts";
import type {
  ReconciliationRuntime,
  ReconciliationRuntimeFactory,
} from "./deal_reconciliation.ts";

type RuntimeInput = Parameters<
  ReconciliationRuntimeFactory["createRuntime"]
>[0];
type RuntimeComposition = Pick<
  DealManagementComposition,
  "reconciliation" | "close"
>;

export type ReconciliationCliMode =
  | ReconciliationMode
  | "verify"
  | "rollback-routing"
  | "authoritative-routing";

export interface RoutingReport {
  readonly mode: "rollback-routing" | "authoritative-routing";
  readonly routed: readonly DealReconciliationRecord[];
}

export type ReconciliationReport =
  | ReconciliationRunResult
  | ReconciliationVerificationResult
  | RoutingReport;

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
  readonly mode: ReconciliationCliMode;
  readonly outcomes: readonly OperatorOutcomeDto[];
}

export function sanitizeOperatorReport(
  report: ReconciliationReport,
  mode: ReconciliationCliMode,
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

interface OperatorAuthorization {
  assertOperatorScope(input: {
    readonly sessionId: string;
    readonly identityId: string;
    readonly actorId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
  }): Promise<void>;
  assertReconciliationPermission(input: {
    readonly context: DealCommandContext;
    readonly scope: RuntimeInput["scope"];
  }): Promise<void>;
}

export interface OperatorRuntimeDependencies {
  readonly authentication: AuthenticationPort;
  readonly authorization: OperatorAuthorization;
}

/** Creates the repository-owned authenticated MAI-110 operator runtime. */
export async function createRuntime(
  input: RuntimeInput,
  loadComposition: () => DealManagementComposition =
    loadExecutableDealManagement,
): Promise<ReconciliationRuntime> {
  const composition = loadComposition();
  let credential: string;
  try {
    credential = requiredCredential(
      Deno.env.get("DEAL_MANAGEMENT_OPERATOR_SESSION"),
    );
  } catch (error) {
    await composition.close();
    throw error;
  }
  return await createOperatorRuntime(
    input,
    composition,
    credential,
    productionOperatorDependencies(composition),
  );
}

/** Creates an authenticated operator runtime from an explicit composition. */
export async function createOperatorRuntime(
  input: RuntimeInput,
  composition: RuntimeComposition,
  credential: string,
  dependencies: OperatorRuntimeDependencies,
): Promise<ReconciliationRuntime> {
  try {
    const principal = await dependencies.authentication.authenticate({
      credential,
    });
    assertPrincipal(input, principal);
    await dependencies.authorization.assertOperatorScope({
      sessionId: principal.sessionId,
      identityId: principal.identityId,
      actorId: principal.actor.id,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
    });
    const context = commandContext(input, principal);
    await dependencies.authorization.assertReconciliationPermission({
      context,
      scope: input.scope,
    });
    return {
      executor: composition.reconciliation,
      commandContext: context,
      close: () => composition.close(),
    };
  } catch (error) {
    await composition.close();
    throw error;
  }
}

function productionOperatorDependencies(
  composition: DealManagementComposition,
): OperatorRuntimeDependencies {
  return {
    authentication: new PostgresIdentityAccessAuthentication(composition.pool),
    authorization: new PostgresDealAuthorization(composition.pool),
  };
}

function requiredCredential(value: string | undefined): string {
  if (value?.trim()) return value;
  throw new Error(
    "Operator credential is missing; expected DEAL_MANAGEMENT_OPERATOR_SESSION.",
  );
}

function assertPrincipal(
  input: RuntimeInput,
  principal: AuthenticatedPrincipal,
): void {
  if (principal.actor.kind !== "human") {
    throw new Error(
      `Reconciliation operator actor "${principal.actor.id}" is not human; expected a human actor.`,
    );
  }
  const matches = principal.actor.id === input.actorId &&
    principal.tenantId === input.scope.tenantId &&
    principal.workspaceId === input.scope.workspaceId;
  if (matches) return;
  throw new Error(
    `Authenticated operator scope does not match requested scope "${input.scope.tenantId}/${input.scope.workspaceId}".`,
  );
}

function commandContext(
  input: RuntimeInput,
  principal: AuthenticatedPrincipal,
): DealCommandContext {
  return {
    actor: principal.actor,
    request: {
      actorId: principal.actor.id,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      sessionId: principal.sessionId,
      identityId: principal.identityId,
      correlationId: input.correlationId,
      origin: "internal",
    },
    now: input.now,
  };
}

const runtimeFactory: ReconciliationRuntimeFactory = { createRuntime };
export default runtimeFactory;
