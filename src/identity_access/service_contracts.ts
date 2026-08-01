import type { IdentityAccessRepository } from "./contracts.ts";
import type { CommandIdempotencyStore } from "./idempotency.ts";
import type { SessionRegistry } from "./authentication.ts";

export interface IdentityAccessServiceDependencies {
  readonly repository: IdentityAccessRepository;
  readonly idempotency?: CommandIdempotencyStore;
  readonly eventIdGenerator: () => string;
  readonly sessionRegistry?: SessionRegistry;
  readonly sessionInvalidation?: SessionInvalidationPort;
  readonly jobInvalidation?: JobInvalidationPort;
}

export interface SessionInvalidationPort {
  invalidateActor(input: {
    readonly tenantId: string;
    readonly actorId: string;
    readonly revokedAt: string;
  }): Promise<void>;
}

export interface JobInvalidationPort {
  invalidate(input: {
    readonly tenantId: string;
    readonly targetType: string;
    readonly targetId: string;
  }): Promise<void>;
}
