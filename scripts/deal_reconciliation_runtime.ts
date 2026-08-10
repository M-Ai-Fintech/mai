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
import type { DealCommandContext } from "../src/deal_management/v1.ts";
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
