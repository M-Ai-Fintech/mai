import pg from "pg";
import { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import { evidenceKnowledgeMigrations } from "./migrations/index.ts";
import { EvidenceKnowledgeRepository } from "./repository.ts";
import type { EvidenceKnowledgeReadPort } from "../api/v1/evidence_knowledge.ts";
import type { CalculationId, CitationId, EvidenceId, FactId } from "./ids.ts";
import type { EvidenceScope } from "./model.ts";
import {
  calculationSelectColumns,
  factSelectColumns,
} from "./repository_sql.ts";
import { rowToCalculation, rowToFact } from "./repository_rows.ts";
import {
  AtomicFactCommandService,
  type FactCommandAuthorizationPort,
} from "./fact_commands.ts";
import { PostgresFactTransitionStore } from "./fact_command_repository.ts";
import type { ExactDocumentVersionVerificationPort } from "./document_version_verification.ts";
import { OutboxRepository } from "../platform/events/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import {
  type EvidenceWriteAuthorizationPort,
  PostgresVerifiedEvidenceWriteService,
  type VerifiedEvidenceWritePort,
} from "./citation_service.ts";

export type EvidenceKnowledgePoolOwnership = "owned" | "borrowed";
export interface EvidenceKnowledgeCompositionConfig {
  readonly pool: pg.Pool;
  readonly poolOwnership?: EvidenceKnowledgePoolOwnership;
  readonly authorization?: FactCommandAuthorizationPort;
  readonly evidenceWriteAuthorization?: EvidenceWriteAuthorizationPort;
  readonly documentVersionVerifier?: ExactDocumentVersionVerificationPort;
  readonly clock?: Clock;
}

export class EvidenceKnowledgeComposition {
  readonly transactions: PostgresTransactionRunner;
  private readonly repository = new EvidenceKnowledgeRepository();
  readonly reads: EvidenceKnowledgeReadPort;
  readonly commands?: AtomicFactCommandService;
  readonly writes?: VerifiedEvidenceWritePort;
  readonly migrations = evidenceKnowledgeMigrations;
  private readonly poolOwnership: EvidenceKnowledgePoolOwnership;
  private closed = false;

  constructor(
    readonly pool: pg.Pool,
    config: EvidenceKnowledgeCompositionConfig,
  ) {
    this.transactions = new PostgresTransactionRunner(pool);
    this.reads = new PostgresEvidenceKnowledgeReadPort(
      this.repository,
      this.transactions,
    );
    if (
      config.authorization !== undefined &&
      config.documentVersionVerifier !== undefined
    ) {
      this.commands = new AtomicFactCommandService(
        config.authorization,
        new PostgresFactTransitionStore({
          transactions: this.transactions,
          evidence: this.repository,
          verifier: config.documentVersionVerifier,
          outbox: new OutboxRepository(),
          clock: config.clock ?? { now: () => new Date() },
        }),
      );
    }
    if (
      config.evidenceWriteAuthorization !== undefined &&
      config.documentVersionVerifier !== undefined
    ) {
      this.writes = new PostgresVerifiedEvidenceWriteService(
        this.transactions,
        this.repository,
        config.documentVersionVerifier,
        config.evidenceWriteAuthorization,
      );
    }
    this.poolOwnership = config.poolOwnership ?? "borrowed";
  }
  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    return this.poolOwnership === "owned" ? this.pool.end() : Promise.resolve();
  }
}

export function createEvidenceKnowledgeComposition(
  config: EvidenceKnowledgeCompositionConfig,
): EvidenceKnowledgeComposition {
  return new EvidenceKnowledgeComposition(config.pool, config);
}

class PostgresEvidenceKnowledgeReadPort implements EvidenceKnowledgeReadPort {
  constructor(
    private readonly repository: EvidenceKnowledgeRepository,
    private readonly transactions: PostgresTransactionRunner,
  ) {}
  findCitation(scope: EvidenceScope, id: CitationId) {
    return this.transactions.run((transaction) =>
      this.repository.findCitation(transaction, scope, id)
    );
  }
  findEvidence(scope: EvidenceScope, id: EvidenceId) {
    return this.transactions.run((transaction) =>
      this.repository.findEvidence(transaction, scope, id)
    );
  }
  findFact(scope: EvidenceScope, id: FactId) {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query(
        `${factSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4`,
        [scope.tenantId, scope.workspaceId, scope.dealId, id],
      );
      return result.rows[0] === undefined
        ? undefined
        : rowToFact(result.rows[0]);
    });
  }
  findCalculation(scope: EvidenceScope, id: CalculationId) {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query(
        `${calculationSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND calculation_id=$4`,
        [scope.tenantId, scope.workspaceId, scope.dealId, id],
      );
      return result.rows[0] === undefined
        ? undefined
        : rowToCalculation(result.rows[0]);
    });
  }
}
