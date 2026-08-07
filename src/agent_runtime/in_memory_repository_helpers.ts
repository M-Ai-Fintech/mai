import type { RunRecord, RuntimeAttemptRecord, RuntimeScope } from "./model.ts";
import type { RuntimeCommandIdentity, RuntimeRunClaim } from "./repository.ts";

export function sameScope(left: RuntimeScope, right: RuntimeScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

export function isClaimable(run: RunRecord, now: Date): boolean {
  if (run.state === "queued") return true;
  if (run.state === "retry_scheduled") {
    return run.nextAttemptAt === undefined || run.nextAttemptAt <= now;
  }
  return run.state === "running" && run.leaseExpiresAt !== undefined &&
    run.leaseExpiresAt <= now;
}

export function isTerminalRun(state: RunRecord["state"]): boolean {
  return ["succeeded", "failed", "cancelled", "invalidated", "dead_lettered"]
    .includes(state);
}

export function startedAttempt(
  run: RunRecord,
  attemptNumber: number,
  claim: RuntimeRunClaim,
): RuntimeAttemptRecord {
  return {
    attemptId: `attempt_${run.runId}-${attemptNumber}-started`,
    scope: "run",
    subjectId: run.runId,
    runId: run.runId,
    attemptNumber,
    recordKind: "started",
    workerId: claim.workerId,
    leaseExpiresAt: claim.leaseUntil,
    startedAt: claim.now,
  };
}

export function idempotencyKey(identity: RuntimeCommandIdentity): string {
  return [
    identity.scope.tenantId,
    identity.scope.workspaceId ?? "",
    identity.scope.dealId ?? "",
    identity.actorId,
    identity.commandType,
    identity.targetType,
    identity.targetId,
    identity.idempotencyKey,
  ].join("|");
}
