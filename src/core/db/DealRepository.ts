import { DatabaseMemoryService } from "./DatabaseMemoryService.ts";
import {
  DealDetailRecord,
  DealListRecord,
  findDealById,
  listDealRecords,
} from "./deals/read_operations.ts";
import {
  createDealTransaction,
  PhaseTransitionRecord,
  transitionDealPhase,
} from "./deals/write_operations.ts";

export type { DealDetailRecord, DealListRecord, PhaseTransitionRecord };

/**
 * Primary Deal Repository for banker-facing M&A deal operations.
 *
 * Governed domain authority: MAI-103
 * @see backlog/docs/architecture/backend-redesign/domain-workflows/doc-20 - MAI-103-Bounded-Contexts-Aggregates-and-Workflow-State-Machines.md
 */
export class DealRepository extends DatabaseMemoryService {
  private static repoInstance: DealRepository | null = null;

  public static getRepoInstance(): DealRepository {
    if (!DealRepository.repoInstance) {
      DealRepository.repoInstance = new DealRepository();
    }
    return DealRepository.repoInstance;
  }

  /**
   * Creates a deal and its target with an initial sourcing phase.
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
