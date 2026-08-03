import type { Deal } from "./contracts.ts";
import { DealVersionConflictError } from "./errors.ts";
import type { DealWrite } from "./repository.ts";

export function assertDealWriteVersion(
  write: DealWrite,
  current: Deal | number | undefined,
): void {
  const stored = typeof current === "object" && current !== null
    ? current.version
    : current;
  const createsFirstVersion = stored === undefined &&
    write.expectedVersion === undefined && write.aggregate.version === 1;
  if (createsFirstVersion) return;
  const advancesStoredVersion = stored !== undefined &&
    write.expectedVersion === stored && write.aggregate.version === stored + 1;
  if (advancesStoredVersion) return;
  throw new DealVersionConflictError(
    write.aggregate.id,
    write.expectedVersion,
    stored ?? 0,
  );
}
