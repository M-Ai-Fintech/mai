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
import {
  PostgresLegacyDealSource,
  PostgresLegacyReferenceResolver,
} from "./legacy_source.ts";
import { DeterministicLegacyDealMapper } from "./legacy_mapper.ts";
import { PostgresDealReconciliationStore } from "./reconciliation_store.ts";
import { CompatibilityDealReader } from "./compatibility_reader.ts";
import { DealReconciliationExecutor } from "./reconciliation.ts";
import { PostgresReconciliationEvidenceVerifier } from "./reconciliation_verification.ts";
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
  readonly poolOwnership?: PoolOwnership;
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

export type PoolOwnership = "owned" | "borrowed";

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
    private readonly poolOwnership: PoolOwnership = "borrowed",
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
  private closed = false;

  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    return this.poolOwnership === "owned" ? this.pool.end() : Promise.resolve();
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
  const core = configuredCore(config, poolResult.pool);
  const legacy = configuredLegacy(config, core.transactions);
  const compatibility = configuredCompatibility(config, core, legacy);
  return configuredResult(config, poolResult, core, compatibility);
}

function configuredCore(
  config: DealManagementCompositionConfig,
  pool: pg.Pool,
) {
  const clock = config.clock ?? systemClock();
  const ids = config.ids ?? randomDealIds();
  const transactions = new PostgresTransactionRunner(pool);
  const repository = createRepository(transactions);
  const audit = config.audit ?? new DealAuditEventFactoryAdapter();
  const service = new DealManagementService({
    repository,
    authorization: config.authorization,
    ids,
    clock,
    audit,
  });
  return { clock, ids, transactions, repository, audit, service };
}

function configuredLegacy(
  config: DealManagementCompositionConfig,
  transactions: PostgresTransactionRunner,
) {
  const legacySource = config.legacySource ??
    new PostgresLegacyDealSource(transactions);
  const legacyMapper = config.legacyMapper ??
    new DeterministicLegacyDealMapper(
      new PostgresLegacyReferenceResolver(transactions),
    );
  const reconciliationStore = config.reconciliationStore ??
    new PostgresDealReconciliationStore(transactions);
  return { legacySource, legacyMapper, reconciliationStore };
}

type ConfiguredCore = ReturnType<typeof configuredCore>;
type ConfiguredLegacy = ReturnType<typeof configuredLegacy>;

function configuredCompatibility(
  config: DealManagementCompositionConfig,
  core: ConfiguredCore,
  legacy: ConfiguredLegacy,
) {
  const { repository, service, transactions } = core;
  const { legacySource, legacyMapper, reconciliationStore } = legacy;
  const compatibilityReader = configuredReader(config, core, legacy);
  const reconciliation = new DealReconciliationExecutor(
    legacySource,
    legacyMapper,
    reconciliationStore,
    service,
    repository,
    new PostgresReconciliationEvidenceVerifier(transactions),
  );
  return { compatibilityReader, reconciliation };
}

function configuredReader(
  config: DealManagementCompositionConfig,
  core: ConfiguredCore,
  legacy: ConfiguredLegacy,
) {
  return new CompatibilityDealReader(
    core.repository,
    legacy.legacySource,
    legacy.legacyMapper,
    legacy.reconciliationStore,
    config.authorization,
  );
}

function configuredResult(
  config: DealManagementCompositionConfig,
  poolResult: Extract<PoolResult, { readonly kind: "configured" }>,
  core: ConfiguredCore,
  compatibility: ReturnType<typeof configuredCompatibility>,
): DealManagementCompositionResult {
  const { clock, ids, repository, audit } = core;
  const http = configuredHttp(config, core);
  return {
    kind: "configured",
    composition: new DealManagementComposition(
      poolResult.pool,
      { repository, authorization: config.authorization, ids, clock, audit },
      http,
      compatibility.compatibilityReader,
      compatibility.reconciliation,
      poolResult.ownership,
    ),
  };
}

function configuredHttp(
  config: DealManagementCompositionConfig,
  core: ConfiguredCore,
): DealManagementHttpDependencies {
  return {
    authentication: new IdentityAccessDealAuthentication(config.authentication),
    authorization: config.authorization,
    repository: core.repository,
    service: core.service,
    now: () => core.clock.now(),
    nextCorrelationId: config.nextCorrelationId ?? randomCorrelationId,
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
