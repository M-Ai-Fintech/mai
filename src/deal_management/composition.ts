import pg from "pg";
import {
  auditActivityMigrations,
  PostgresAuditEventRepository,
  TransactionalAuditOutboxAppender,
} from "../audit_activity/v1.ts";
import { type AuthenticationPort } from "../identity_access/v1.ts";
import {
  type ContextMigration,
  platformMigrations,
  PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import { OutboxRepository } from "../platform/events/v1.ts";
import type { CorrelationId } from "../platform/api/v1.ts";
import type {
  DealAuditEventFactory,
  DealAuthorizationPort,
  DealClock,
} from "./contracts.ts";
import type { DealManagementHttpDependencies } from "./http_shared.ts";
import {
  type DealManagementDependencies,
  DealManagementService,
} from "./service.ts";
import type { DealIdFactory } from "./ids.ts";
import { PostgresDealRepository } from "./repository.ts";
import { PostgresLegacyDealSource } from "./legacy_source.ts";
import { DeterministicLegacyDealMapper } from "./legacy_mapper.ts";
import { PostgresDealReconciliationStore } from "./reconciliation_store.ts";
import { CompatibilityDealReader } from "./compatibility_reader.ts";
import { DealReconciliationExecutor } from "./reconciliation.ts";
import type {
  DealReconciliationStore,
  LegacyDealMapper,
  LegacyDealSource,
} from "./legacy_contracts.ts";
import { dealManagementMigrations } from "./migrations/index.ts";
import {
  createPool,
  DealAuditEventFactoryAdapter,
  IdentityAccessDealAuthentication,
  loadUnavailable,
  type PoolResult,
  randomCorrelationId,
  randomDealIds,
  systemClock,
  validateCompositionConfig,
} from "./composition_support.ts";

/**
 * Describes the application-owned inputs needed to compose Deal Management.
 *
 * A pool may be injected by an application test or process supervisor; when
 * omitted, a validated PostgreSQL URL is required and exactly one pool is
 * created for the composed Deal and legacy repositories.
 *
 * @example createDealManagementComposition({ authentication, authorization, databaseUrl })
 */
export interface DealManagementCompositionConfig {
  readonly databaseUrl?: string;
  readonly pool?: pg.Pool;
  readonly authentication: AuthenticationPort;
  readonly authorization: DealAuthorizationPort;
  readonly ids?: DealIdFactory;
  readonly clock?: DealClock;
  readonly nextCorrelationId?: () => CorrelationId;
  readonly audit?: DealAuditEventFactory;
  readonly poolMax?: number;
  readonly legacySource?: LegacyDealSource;
  readonly legacyMapper?: LegacyDealMapper;
  readonly reconciliationStore?: DealReconciliationStore;
}

export type DealManagementCompositionResult =
  | {
    readonly kind: "configured";
    readonly composition: DealManagementComposition;
  }
  | {
    readonly kind: "unavailable";
    readonly reason: "missing_configuration" | "invalid_configuration";
    readonly message: string;
  };

/**
 * Owns one process-scoped Deal Management dependency graph.
 *
 * It deliberately does not apply migrations on startup; callers use the
 * exposed migration list in the separately governed migration procedure.
 *
 * @example await composition.close()
 */
export class DealManagementComposition {
  readonly repository: PostgresDealRepository;
  readonly service: DealManagementService;
  readonly http: DealManagementHttpDependencies;
  readonly compatibilityReader: CompatibilityDealReader;
  readonly reconciliation: DealReconciliationExecutor;
  readonly migrations: readonly ContextMigration[];

  constructor(
    readonly pool: pg.Pool,
    dependencies: DealManagementDependencies,
    http: DealManagementHttpDependencies,
    compatibilityReader: CompatibilityDealReader,
    reconciliation: DealReconciliationExecutor,
  ) {
    this.repository = dependencies.repository as PostgresDealRepository;
    this.service = new DealManagementService(dependencies);
    this.http = http;
    this.compatibilityReader = compatibilityReader;
    this.reconciliation = reconciliation;
    this.migrations = Object.freeze([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...dealManagementMigrations,
    ]);
  }

  /**
   * Closes the process-scoped database pool after requests have drained.
   *
   * @example await composition.close()
   */
  close(): Promise<void> {
    return this.pool.end();
  }
}

/**
 * Builds a concrete Deal Management graph or a fail-closed unavailable state.
 *
 * Authentication and authorization are required inputs, so this function
 * cannot accidentally promote a test fake or anonymous request to production
 * composition.
 *
 * @example const result = createDealManagementComposition(config)
 */
export function createDealManagementComposition(
  config: DealManagementCompositionConfig,
): DealManagementCompositionResult {
  const validation = validateCompositionConfig(config);
  if (validation !== undefined) return validation;
  const poolResult = createPool(config);
  if (poolResult.kind !== "configured") return poolResult;
  return configuredComposition(config, poolResult);
}

function configuredComposition(
  config: DealManagementCompositionConfig,
  poolResult: Extract<PoolResult, { readonly kind: "configured" }>,
): DealManagementCompositionResult {
  const clock = config.clock ?? systemClock();
  const ids = config.ids ?? randomDealIds();
  const transactions = new PostgresTransactionRunner(poolResult.pool);
  const repository = createRepository(transactions);
  const audit = config.audit ?? new DealAuditEventFactoryAdapter();
  const service = new DealManagementService({
    repository,
    authorization: config.authorization,
    ids,
    clock,
    audit,
  });
  const legacySource = config.legacySource ??
    new PostgresLegacyDealSource(transactions);
  const legacyMapper = config.legacyMapper ??
    new DeterministicLegacyDealMapper();
  const reconciliationStore = config.reconciliationStore ??
    new PostgresDealReconciliationStore(transactions);
  const compatibilityReader = new CompatibilityDealReader(
    repository,
    legacySource,
    legacyMapper,
    reconciliationStore,
    config.authorization,
  );
  const reconciliation = new DealReconciliationExecutor(
    legacySource,
    legacyMapper,
    reconciliationStore,
    service,
    repository,
  );
  const http = {
    authentication: new IdentityAccessDealAuthentication(config.authentication),
    authorization: config.authorization,
    repository,
    service,
    now: () => clock.now(),
    nextCorrelationId: config.nextCorrelationId ?? randomCorrelationId,
  } satisfies DealManagementHttpDependencies;
  return {
    kind: "configured",
    composition: new DealManagementComposition(
      poolResult.pool,
      { repository, authorization: config.authorization, ids, clock, audit },
      http,
      compatibilityReader,
      reconciliation,
    ),
  };
}

function createRepository(
  transactions: PostgresTransactionRunner,
): PostgresDealRepository {
  const auditEvents = new PostgresAuditEventRepository();
  const outbox = new OutboxRepository();
  return new PostgresDealRepository(
    transactions,
    outbox,
    new TransactionalAuditOutboxAppender(
      auditEvents,
      new OutboxRepository(),
    ),
  );
}

/**
 * Loads a composition configuration from approved process environment values.
 *
 * The function reports missing database configuration separately from invalid
 * URLs and never includes a password in the returned diagnostic.
 *
 * @example loadDealManagementEnvironment({ authentication, authorization })
 */
export function loadDealManagementEnvironment(input: {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly authentication?: AuthenticationPort;
  readonly authorization?: DealAuthorizationPort;
}): DealManagementCompositionResult {
  const environment = input.environment ?? {
    MAI106_DATABASE_URL: Deno.env.get("MAI106_DATABASE_URL"),
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
  };
  const databaseUrl = environment.MAI106_DATABASE_URL ??
    environment.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    return loadUnavailable(
      "missing_configuration",
      "Deal Management database configuration is missing; expected MAI106_DATABASE_URL or DATABASE_URL.",
    );
  }
  if (input.authentication === undefined) {
    return loadUnavailable(
      "missing_configuration",
      "Deal Management authentication is missing; expected an approved Identity Access port.",
    );
  }
  if (input.authorization === undefined) {
    return loadUnavailable(
      "missing_configuration",
      "Deal Management authorization is missing; expected an authoritative policy port.",
    );
  }
  return createDealManagementComposition({
    databaseUrl,
    authentication: input.authentication,
    authorization: input.authorization,
  });
}
