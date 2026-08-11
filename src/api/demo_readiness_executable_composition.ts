import { PostgresAuditEventRepository } from "../audit_activity/v1.ts";
import type { DealManagementComposition } from "../deal_management/v1.ts";
import { DemoReadinessApplication } from "../demo_readiness/application.ts";
import { DemoWorkflowPersistence } from "../demo_readiness/persistence.ts";
import type {
  DemoManifest,
  DemoResetTarget,
} from "../demo_readiness/contracts.ts";
import { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import { ExecutableRequestContext } from "./executable_request_context.ts";
import type { DemoReadinessV1RouteDependencies } from "./v1/demo_readiness_routes.ts";

export interface ExecutableDemoReadinessConfig {
  readonly manifest: DemoManifest;
  readonly fixtureRoot: URL;
  readonly target: DemoResetTarget;
  readonly now?: () => Date;
}

/** Composes the explicit local-demo projection from production policy ports.
 *
 * @example createExecutableDemoReadinessComposition(deal, config)
 */
export function createExecutableDemoReadinessComposition(
  deal: DealManagementComposition,
  config: ExecutableDemoReadinessConfig,
): DemoReadinessV1RouteDependencies {
  const transactions = new PostgresTransactionRunner(deal.pool);
  const audit = new PostgresAuditEventRepository();
  return {
    application: new DemoReadinessApplication({
      ...config,
      context: new ExecutableRequestContext(deal.http.authentication),
      authorization: deal.authorization,
      deals: deal.repository,
      transactions,
      audit,
      persistence: new DemoWorkflowPersistence(transactions, audit),
    }),
  };
}
