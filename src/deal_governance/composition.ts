import type { PostgresTransactionRunner } from "../platform/persistence/transaction.ts";
import type {
  DealGovernanceIdFactory,
  ErasureExecutor,
  GovernanceAuthorizationPort,
  GovernanceClock,
} from "./service_contracts.ts";
import type { ErasureGateEvidencePort } from "./trusted_evidence.ts";
import {
  consequencePreviewId,
  deletionApprovalId,
  deletionRequestId,
  erasureManifestId,
  governanceEventId,
  governanceId,
  legalHoldId,
  orchestrationId,
  retentionAssignmentId,
} from "./ids.ts";
import { InMemoryDealGovernanceRepository } from "./repository.ts";
import { PostgresDealGovernanceRepository } from "./repository_postgres.ts";
import {
  type DealGovernanceDependencies,
  DealGovernanceService,
} from "./service.ts";

export interface DealGovernanceTestCompositionOptions {
  readonly authorization: GovernanceAuthorizationPort;
  readonly clock: GovernanceClock;
  readonly erasureExecutor?: ErasureExecutor;
  readonly erasureGateEvidence?: ErasureGateEvidencePort;
}

export interface DealGovernanceTestComposition {
  readonly adapter: "in_memory_test";
  readonly repository: InMemoryDealGovernanceRepository;
  readonly service: DealGovernanceService;
}

export function createInMemoryDealGovernanceTestComposition(
  options: DealGovernanceTestCompositionOptions,
): DealGovernanceTestComposition {
  const repository = new InMemoryDealGovernanceRepository();
  return {
    adapter: "in_memory_test",
    repository,
    service: new DealGovernanceService(dependencies(repository, options)),
  };
}

export interface DealGovernancePostgresCompositionOptions
  extends DealGovernanceTestCompositionOptions {
  readonly transactions: PostgresTransactionRunner;
}

export interface DealGovernancePostgresComposition {
  readonly adapter: "postgres";
  readonly repository: PostgresDealGovernanceRepository;
  readonly service: DealGovernanceService;
}

export function createPostgresDealGovernanceComposition(
  options: DealGovernancePostgresCompositionOptions,
): DealGovernancePostgresComposition {
  const repository = new PostgresDealGovernanceRepository(options.transactions);
  return {
    adapter: "postgres",
    repository,
    service: new DealGovernanceService(dependencies(repository, options)),
  };
}

function dependencies(
  repository: DealGovernanceDependencies["repository"],
  options: DealGovernanceTestCompositionOptions,
): DealGovernanceDependencies {
  return {
    repository,
    authorization: options.authorization,
    ids: new SequentialDealGovernanceIds(),
    clock: options.clock,
    erasureGateEvidence: options.erasureGateEvidence ?? {
      resolve: () => undefined,
    },
    ...(options.erasureExecutor === undefined
      ? {}
      : { erasureExecutor: options.erasureExecutor }),
  };
}

export class SequentialDealGovernanceIds implements DealGovernanceIdFactory {
  private sequence = 0;

  nextGovernanceId() {
    return governanceId(`governance_test-${this.next()}`);
  }

  nextPreviewId() {
    return consequencePreviewId(`preview_test-${this.next()}`);
  }

  nextRetentionAssignmentId() {
    return retentionAssignmentId(`retention_test-${this.next()}`);
  }

  nextLegalHoldId() {
    return legalHoldId(`hold_test-${this.next()}`);
  }

  nextDeletionRequestId() {
    return deletionRequestId(`deletion_test-${this.next()}`);
  }

  nextDeletionApprovalId() {
    return deletionApprovalId(`approval_test-${this.next()}`);
  }

  nextOrchestrationId() {
    return orchestrationId(`orchestration_test-${this.next()}`);
  }

  nextManifestId() {
    return erasureManifestId(`manifest_test-${this.next()}`);
  }

  nextEventId() {
    return governanceEventId(`event_test-${this.next()}`);
  }

  private next(): number {
    this.sequence += 1;
    return this.sequence;
  }
}
