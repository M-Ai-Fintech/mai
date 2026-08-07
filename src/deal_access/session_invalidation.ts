import type {
  DealAccessScope,
  DealParticipation,
  ExternalGrant,
} from "./model.ts";
import {
  DealAccessInvariantError,
  DealAccessSessionInvalidationError,
} from "./errors.ts";
import type {
  DealAccessRepository,
  SessionInvalidationRecord,
  SessionInvalidationTarget,
} from "./repository.ts";
import type {
  DealAccessClock,
  ExternalSessionInvalidator,
  SessionInvalidationRetryResult,
} from "./service_contracts.ts";

export class DealAccessSessionInvalidationCoordinator {
  constructor(
    private readonly repository: DealAccessRepository,
    private readonly sessions: ExternalSessionInvalidator,
    private readonly clock: DealAccessClock,
  ) {}

  async flush(
    scope: DealAccessScope,
    target: SessionInvalidationTarget,
  ): Promise<void> {
    const pending = await this.repository.transaction((store) =>
      store.listPendingSessionInvalidations(scope, target)
    );
    for (const record of pending) await this.deliver(record);
  }

  async retry(scope: DealAccessScope): Promise<SessionInvalidationRetryResult> {
    const pending = await this.repository.transaction((store) =>
      store.listPendingSessionInvalidations(scope)
    );
    let completed = 0;
    let failed = 0;
    for (const record of pending) {
      try {
        await this.deliver(record);
        completed += 1;
      } catch (error) {
        if (error instanceof DealAccessSessionInvalidationError) {
          failed += 1;
          continue;
        }
        throw error;
      }
    }
    return { attempted: pending.length, completed, failed };
  }

  private async deliver(record: SessionInvalidationRecord): Promise<void> {
    await this.repository.transaction((store) =>
      store.recordSessionInvalidationAttempt(
        record.scope,
        record.invalidationId,
      )
    );
    try {
      await this.invalidateExternalSessions(record);
    } catch (error) {
      await this.recordFailure(record, error);
      throw new DealAccessSessionInvalidationError(record.invalidationId);
    }
    await this.repository.transaction((store) =>
      store.completeSessionInvalidation(
        record.scope,
        record.invalidationId,
        this.clock.now(),
      )
    );
  }

  private async invalidateExternalSessions(
    record: SessionInvalidationRecord,
  ): Promise<void> {
    if (record.grantId !== undefined) {
      await this.sessions.invalidateGrant(
        record.grantId as ExternalGrant["id"],
      );
      return;
    }
    if (record.participationId !== undefined) {
      await this.sessions.invalidateParticipation(
        record.participationId as DealParticipation["id"],
      );
      return;
    }
    throw new DealAccessInvariantError(
      `Session invalidation "${record.invalidationId}" has no target; expected a grant or participation ID.`,
    );
  }

  private recordFailure(
    record: SessionInvalidationRecord,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    return this.repository.transaction((store) =>
      store.markSessionInvalidationFailure(
        record.scope,
        record.invalidationId,
        message,
      )
    );
  }
}
