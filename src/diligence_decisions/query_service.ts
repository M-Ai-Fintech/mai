import type { RequestContext } from "../platform/api/v1.ts";
import type {
  DecisionProjection,
  DecisionRecord,
  DecisionRequest,
  DiligenceScope,
  Finding,
  Impact,
} from "./model.ts";
import type { CommandDependencies } from "./contracts.ts";
import { authorize, protectedNotFound } from "./command_support.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";

export class DiligenceDecisionQueries {
  constructor(private readonly dependencies: CommandDependencies) {}

  getFinding(
    context: RequestContext,
    scope: DiligenceScope,
    id: FindingId,
  ): Promise<Finding> {
    return this.read(
      context,
      scope,
      "finding",
      id,
      (transaction) =>
        this.dependencies.config.repository.findFinding(transaction, scope, id),
    );
  }

  getImpact(
    context: RequestContext,
    scope: DiligenceScope,
    id: ImpactId,
  ): Promise<Impact> {
    return this.read(
      context,
      scope,
      "impact",
      id,
      (transaction) =>
        this.dependencies.config.repository.findImpact(transaction, scope, id),
    );
  }

  getDecisionRequest(
    context: RequestContext,
    scope: DiligenceScope,
    id: DecisionRequestId,
  ): Promise<DecisionRequest> {
    return this.read(
      context,
      scope,
      "decision_request",
      id,
      (transaction) =>
        this.dependencies.config.repository.findDecisionRequest(
          transaction,
          scope,
          id,
        ),
    );
  }

  getDecisionRecord(
    context: RequestContext,
    scope: DiligenceScope,
    id: DecisionRecordId,
  ): Promise<DecisionRecord> {
    return this.read(
      context,
      scope,
      "decision_record",
      id,
      (transaction) =>
        this.dependencies.config.repository.findDecisionRecord(
          transaction,
          scope,
          id,
        ),
    );
  }

  getDecisionProjection(
    context: RequestContext,
    scope: DiligenceScope,
    id: DecisionRequestId,
  ): Promise<DecisionProjection> {
    return this.read(
      context,
      scope,
      "decision_request",
      id,
      (transaction) =>
        this.dependencies.config.repository.findProjection(
          transaction,
          scope,
          id,
        ),
    );
  }

  private async read<T>(
    context: RequestContext,
    scope: DiligenceScope,
    kind: string,
    id: string,
    loader: (transaction: TransactionHandle) => Promise<T | undefined>,
  ): Promise<T> {
    await authorize(
      this.dependencies,
      { context, scope },
      kind,
      id,
      `read_${kind}`,
    );
    return this.dependencies.config.transactions.run(async (transaction) => {
      const value = await loader(transaction);
      if (value !== undefined) return value;
      throw protectedNotFound(id);
    });
  }
}
