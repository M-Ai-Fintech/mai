import { DatabaseMemoryService } from "./DatabaseMemoryService.ts";
import {
  DealDetailRecord,
  DealListRecord,
  findDealById,
  listDealRecords,
} from "./transactions/read_operations.ts";
import {
  createDealTransaction,
  PhaseTransitionRecord,
  transitionDealPhase,
} from "./transactions/write_operations.ts";

export type { DealDetailRecord, DealListRecord, PhaseTransitionRecord };

export class TransactionRepository extends DatabaseMemoryService {
  private static repoInstance: TransactionRepository | null = null;

  public static getRepoInstance(): TransactionRepository {
    if (!TransactionRepository.repoInstance) {
      TransactionRepository.repoInstance = new TransactionRepository();
    }
    return TransactionRepository.repoInstance;
  }

  /**
   * Creates a transaction and its target with an initial sourcing phase.
   *
   * @example await repository.createDeal("Target", "D-1", "M&A", "Buy", "Active", 10)
   */
  public createDeal(
    title: string,
    code: string,
    typeName: string,
    strategyName: string,
    statusName: string,
    targetValuation: number,
  ): Promise<string> {
    return createDealTransaction(this.pool, {
      title,
      code,
      typeName,
      strategyName,
      statusName,
      targetValuation,
    });
  }

  /**
   * Lists deals with target and current-phase information.
   *
   * @example await repository.getDeals({ activeOnly: true })
   */
  public getDeals(
    options?: { activeOnly?: boolean },
  ): Promise<DealListRecord[]> {
    return listDealRecords(this, options);
  }

  /**
   * Loads one deal and its financial, target, and phase records.
   *
   * @example await repository.getDealById("deal-id")
   */
  public getDealById(id: string): Promise<DealDetailRecord | null> {
    return findDealById(this, id);
  }

  /**
   * Completes the current phase and appends the requested phase.
   *
   * @example await repository.updateDealPhase("deal-id", "Diligence", "In Progress")
   */
  public updateDealPhase(
    dealId: string,
    phaseName: string,
    statusName: string,
    comments?: string,
    data?: Record<string, unknown>,
  ): Promise<PhaseTransitionRecord> {
    return transitionDealPhase(this.pool, {
      dealId,
      phaseName,
      statusName,
      comments,
      data,
    });
  }
}
