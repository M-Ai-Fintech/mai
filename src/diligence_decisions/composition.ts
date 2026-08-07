import pg from "pg";
import {
  platformMigrations,
  PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import { OutboxRepository } from "../platform/events/v1.ts";
import {
  auditActivityMigrations,
  type AuditEventRepository,
  PostgresAuditEventRepository,
} from "../audit_activity/v1.ts";
import type { ApprovalAuthoritySnapshotPort } from "../work_management/v1.ts";
import type { DecisionAuthorizationPort } from "./authority.ts";
import type { EvidenceBasisVerificationPort } from "./ports.ts";
import {
  type DiligenceDecisionEffects,
  PostgresDiligenceDecisionEffects,
} from "./effects.ts";
import { PostgresDiligenceDecisionsRepository } from "./repository.ts";
import {
  DiligenceDecisionService,
  type DiligenceDecisionServiceConfig,
} from "./service.ts";
import { diligenceDecisionsMigrations } from "./migrations/index.ts";

export type DiligenceDecisionsPoolOwnership = "owned" | "borrowed";

export interface DiligenceDecisionsCompositionConfig {
  readonly pool: pg.Pool;
  readonly authorization: DecisionAuthorizationPort;
  readonly authority: ApprovalAuthoritySnapshotPort;
  readonly basis: EvidenceBasisVerificationPort;
  readonly audit?: AuditEventRepository;
  readonly effects?: DiligenceDecisionEffects;
  readonly poolOwnership?: DiligenceDecisionsPoolOwnership;
  readonly clock?: DiligenceDecisionServiceConfig["clock"];
}

export class DiligenceDecisionsComposition {
  readonly transactions: PostgresTransactionRunner;
  readonly repository = new PostgresDiligenceDecisionsRepository();
  readonly effects: DiligenceDecisionEffects;
  readonly service: DiligenceDecisionService;
  readonly migrations = Object.freeze([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...diligenceDecisionsMigrations,
  ]);
  private readonly poolOwnership: DiligenceDecisionsPoolOwnership;
  private closed = false;

  constructor(
    readonly pool: pg.Pool,
    config: DiligenceDecisionsCompositionConfig,
  ) {
    this.transactions = new PostgresTransactionRunner(pool);
    this.effects = config.effects ?? new PostgresDiligenceDecisionEffects(
      new OutboxRepository(),
      config.audit ?? new PostgresAuditEventRepository(),
    );
    this.service = new DiligenceDecisionService({
      transactions: this.transactions,
      repository: this.repository,
      authorization: config.authorization,
      authority: config.authority,
      basis: config.basis,
      effects: this.effects,
      clock: config.clock,
    });
    this.poolOwnership = config.poolOwnership ?? "borrowed";
  }

  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    return this.poolOwnership === "owned" ? this.pool.end() : Promise.resolve();
  }
}

export function createDiligenceDecisionsComposition(
  config: DiligenceDecisionsCompositionConfig,
): DiligenceDecisionsComposition {
  return new DiligenceDecisionsComposition(config.pool, config);
}
