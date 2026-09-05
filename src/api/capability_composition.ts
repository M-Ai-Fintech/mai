import type { DealManagementCompositionResult } from "../deal_management/composition.ts";
import type { ExecutableCapabilityDependencies } from "./capability_readiness.ts";
import type { ApiServerOptions } from "./server.ts";
import type { WorkspaceShellRouteDependencies } from "./workspace_shell_routes.ts";

/** Derives capability dependencies from the same objects used by the router.
 * @example executableCapabilityDependencies(dealManagement, options, shell)
 */
export function executableCapabilityDependencies(
  dealManagement: DealManagementCompositionResult,
  options: ApiServerOptions,
  workspaceShell: WorkspaceShellRouteDependencies | undefined,
): ExecutableCapabilityDependencies {
  return {
    workspaceShell: workspaceShell !== undefined,
    demoReadiness: options.demoReadiness !== undefined,
    dealManagement: dealManagement.kind === "configured",
    ...coreDependencies(options),
    ...waveDependencies(options),
  };
}

function coreDependencies(
  options: ApiServerOptions,
): Pick<
  ExecutableCapabilityDependencies,
  "workManagement" | "notifications" | "evidenceKnowledge" | "documents"
> {
  return {
    workManagement: options.coreWorkflow?.workManagement !== undefined,
    notifications: options.coreWorkflow?.notifications !== undefined,
    evidenceKnowledge: options.coreWorkflow?.evidenceKnowledge !== undefined,
    documents: options.coreWorkflow?.documents !== undefined,
  };
}

function waveDependencies(
  options: ApiServerOptions,
): Omit<
  ExecutableCapabilityDependencies,
  | "workspaceShell"
  | "demoReadiness"
  | "dealManagement"
  | "workManagement"
  | "notifications"
  | "evidenceKnowledge"
  | "documents"
> {
  return {
    valuation: options.waveG?.valuation !== undefined,
    matching: options.waveG?.matching !== undefined,
    negotiation: options.waveH?.negotiation !== undefined,
    closing: options.waveG?.closing !== undefined,
    deliverables: options.waveG?.deliverables !== undefined,
    governance: options.waveG?.governance !== undefined,
  };
}
