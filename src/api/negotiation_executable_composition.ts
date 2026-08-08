import type { RequestContext } from "../platform/api/v1.ts";
import { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import {
  type DealAuthorizationInput,
  type DealAuthorizationPort,
} from "../deal_management/contracts.ts";
import type {
  DealAuthenticationPort,
  DealManagementComposition,
} from "../deal_management/v1.ts";
import { JobRepository } from "../platform/jobs/repository.ts";
import type {
  JobAuditAppendPort,
  JobFailurePolicy,
} from "../platform/jobs/v1.ts";
import {
  correlationFromRequest,
  type NegotiationAuthenticatedContext,
  type NegotiationContextPort,
  NegotiationRequestError,
  NegotiationV1Application,
} from "./v1/negotiation.ts";
import {
  type NegotiationAuthorizationInput,
  type NegotiationAuthorizationPort,
} from "../negotiation/authorization.ts";
import {
  type NegotiationDeliveryAuthorizationPort,
} from "../negotiation/delivery_worker.ts";
import {
  type NegotiationDeliveryFeatureGate,
  type NegotiationDeliveryJobInput,
  type NegotiationDeliveryPort,
} from "../negotiation/jobs.ts";
import { PostgresNegotiationEffects } from "../negotiation/effects.ts";
import {
  PostgresNegotiationUnitOfWork,
} from "../negotiation/repository_sql.ts";
import { NegotiationDeliveryWorker } from "../negotiation/delivery_worker.ts";
import {
  type NegotiationJobScheduler,
  NegotiationService,
} from "../negotiation/service.ts";
import type { NegotiationTransaction } from "../negotiation/repository.ts";
import { negotiationMigrations } from "../negotiation/migrations/index.ts";
import type { AuthorityProofResolver } from "../work_management/authority_proof.ts";

export interface ExecutableNegotiationDeliveryConfig {
  readonly enabled?: boolean;
  readonly transport?: NegotiationDeliveryPort;
  readonly authorization?: NegotiationDeliveryAuthorizationPort;
}

export interface ExecutableNegotiationConfig {
  readonly authorityResolver?: AuthorityProofResolver;
  readonly delivery?: ExecutableNegotiationDeliveryConfig;
}

export interface ExecutableNegotiationComposition {
  readonly application: NegotiationV1Application;
  readonly context: NegotiationContextPort;
  readonly service: NegotiationService;
  readonly featureGate: NegotiationDeliveryFeatureGate;
  readonly deliveryTransport?: NegotiationDeliveryPort;
  readonly deliveryAuthorization?: NegotiationDeliveryAuthorizationPort;
  readonly createDeliveryWorker: (input: {
    readonly failurePolicy: JobFailurePolicy;
    readonly audit: JobAuditAppendPort;
  }) => NegotiationDeliveryWorker;
  readonly migrations: typeof negotiationMigrations;
}

export function createExecutableNegotiationComposition(input: {
  readonly deal: DealManagementComposition;
  readonly config?: ExecutableNegotiationConfig;
}): ExecutableNegotiationComposition {
  const config = input.config ?? {};
  const deliveryEnabled = config.delivery?.enabled === true;
  if (
    deliveryEnabled &&
    (config.delivery?.transport === undefined ||
      config.delivery.authorization === undefined)
  ) {
    throw new Error(
      "Negotiation delivery configuration is incomplete; explicit provider transport and current authorization are required before enabling delivery.",
    );
  }
  const pool = input.deal.pool;
  const transactions = new PostgresTransactionRunner(pool);
  const clock = { now: () => new Date() };
  const unitOfWork = new PostgresNegotiationUnitOfWork(transactions, clock);
  const effects = new PostgresNegotiationEffects();
  const featureGate: NegotiationDeliveryFeatureGate = {
    deliveryEnabled: () => deliveryEnabled,
  };
  const scheduler = new PostgresNegotiationJobScheduler();
  const service = new NegotiationService({
    unitOfWork,
    effects,
    clock: { now: () => clock.now().toISOString() },
    authorization: new DealBackedNegotiationAuthorization(
      input.deal.authorization,
    ),
    deliveryFeatureGate: featureGate,
    jobScheduler: scheduler,
  });
  const authorityResolver = config.authorityResolver ??
    { resolve: () => Promise.resolve(undefined) };
  const application = new NegotiationV1Application(
    service,
    authorityResolver,
  );
  return {
    application,
    context: new ExecutableNegotiationContext(input.deal.http.authentication),
    service,
    featureGate,
    ...(config.delivery?.transport === undefined
      ? {}
      : { deliveryTransport: config.delivery.transport }),
    ...(config.delivery?.authorization === undefined
      ? {}
      : { deliveryAuthorization: config.delivery.authorization }),
    createDeliveryWorker: ({ failurePolicy, audit }) => {
      if (
        !deliveryEnabled || config.delivery?.transport === undefined ||
        config.delivery.authorization === undefined
      ) {
        throw new Error(
          "Negotiation delivery worker is disabled until explicit transport, current authorization, and readiness configuration are present.",
        );
      }
      return new NegotiationDeliveryWorker({
        transactions,
        store: scheduler.jobs,
        unitOfWork,
        transport: config.delivery.transport,
        authorization: config.delivery.authorization,
        featureGate,
        clock,
        failurePolicy,
        audit,
      });
    },
    migrations: negotiationMigrations,
  };
}

export function createExecutableNegotiationDeliveryConfig(input: {
  readonly transport: NegotiationDeliveryPort;
  readonly authorization: NegotiationDeliveryAuthorizationPort;
}): ExecutableNegotiationDeliveryConfig {
  return { enabled: true, ...input };
}

class PostgresNegotiationJobScheduler implements NegotiationJobScheduler {
  readonly jobs = new JobRepository();

  enqueue(
    transaction: NegotiationTransaction,
    job: NegotiationDeliveryJobInput,
  ): Promise<void> {
    if (transaction.handle === undefined) {
      throw new Error(
        "Executable Negotiation delivery scheduling requires a PostgreSQL transaction handle.",
      );
    }
    return this.jobs.enqueue(transaction.handle, job);
  }
}

class DealBackedNegotiationAuthorization
  implements NegotiationAuthorizationPort {
  constructor(private readonly delegate: DealAuthorizationPort) {}

  authorize(input: NegotiationAuthorizationInput) {
    const dealInput: DealAuthorizationInput = {
      context: {
        actor: input.actor,
        request: input.context,
        now: input.now,
      },
      scope: {
        tenantId: input.scope.tenantId,
        workspaceId: input.scope.workspaceId,
        // The Deal contract scopes policy to workspace, while its shared
        // authorization token supports deal binding. Preserve that exact
        // binding through the adapter rather than dropping the deal.
        dealId: input.scope.dealId,
      } as never,
      resource: input.resource,
      action: input.action,
      requestedFields: [],
      humanOnly: input.humanOnly,
    };
    return this.delegate.authorize(dealInput);
  }
}

class ExecutableNegotiationContext implements NegotiationContextPort {
  constructor(private readonly authentication: DealAuthenticationPort) {}

  async contextFor(request: Request): Promise<NegotiationAuthenticatedContext> {
    const credential = request.headers.get("Authorization");
    if (credential === null || credential.trim().length === 0) {
      throw new NegotiationRequestError(
        "Negotiation routes require an authenticated session credential.",
      );
    }
    const correlationId = correlationFromRequest(request);
    const principal = await this.authentication.authenticate({
      credential,
      request,
      correlationId,
    });
    const dealId = request.headers.get("X-Deal-Id");
    if (dealId === null || !/^deal_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dealId)) {
      throw new NegotiationRequestError(
        "Negotiation routes require a valid X-Deal-Id header.",
      );
    }
    const context: RequestContext = {
      actorId: principal.actor.id,
      sessionId: principal.sessionId,
      identityId: principal.identityId,
      tenantId: principal.tenantId,
      workspaceId: principal.workspaceId,
      dealId: dealId as never,
      correlationId,
      origin: "http",
    };
    return { context, actor: principal.actor };
  }
}
