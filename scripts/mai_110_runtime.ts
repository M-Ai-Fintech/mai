import {
  loadExecutableDealManagement,
  PostgresDealAuthorization,
  PostgresIdentityAccessAuthentication,
} from "../src/api/deal_management_bootstrap.ts";
import type { DealCommandContext } from "../src/deal_management/v1.ts";
import type {
  ReconciliationRuntime,
  ReconciliationRuntimeModule,
} from "./deal_reconciliation.ts";

/** Creates the repository-owned authenticated MAI-110 operator runtime. */
export async function createRuntime(
  input: Parameters<ReconciliationRuntimeModule["createRuntime"]>[0],
): Promise<ReconciliationRuntime> {
  const composition = loadExecutableDealManagement();
  try {
    const credential = requiredCredential(
      Deno.env.get("MAI110_OPERATOR_SESSION"),
    );
    const authentication = new PostgresIdentityAccessAuthentication(
      composition.pool,
    );
    const principal = await authentication.authenticate({ credential });
    assertPrincipal(input, principal);
    const authorization = new PostgresDealAuthorization(composition.pool);
    await authorization.assertOperatorScope({
      actorId: principal.actor.id,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
    });
    return {
      executor: composition.reconciliation,
      commandContext: commandContext(input, principal.actor),
      close: () => composition.close(),
    };
  } catch (error) {
    await composition.close();
    throw error;
  }
}

function requiredCredential(value: string | undefined): string {
  if (value?.trim()) return value;
  throw new Error(
    "Operator credential is missing; expected MAI110_OPERATOR_SESSION.",
  );
}

function assertPrincipal(
  input: Parameters<ReconciliationRuntimeModule["createRuntime"]>[0],
  principal: Awaited<
    ReturnType<PostgresIdentityAccessAuthentication["authenticate"]>
  >,
): void {
  const matches = principal.actor.id === input.actorId &&
    principal.tenantId === input.scope.tenantId &&
    principal.workspaceId === input.scope.workspaceId;
  if (matches) return;
  throw new Error(
    `Authenticated operator scope does not match requested scope "${input.scope.tenantId}/${input.scope.workspaceId}".`,
  );
}

function commandContext(
  input: Parameters<ReconciliationRuntimeModule["createRuntime"]>[0],
  actor: Awaited<
    ReturnType<PostgresIdentityAccessAuthentication["authenticate"]>
  >["actor"],
): DealCommandContext {
  return {
    actor,
    request: {
      actorId: actor.id,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      correlationId: input.correlationId,
      origin: "internal",
    },
    now: input.now,
  };
}

const runtimeModule: ReconciliationRuntimeModule = { createRuntime };
export default runtimeModule;
