import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion, IdempotencyKey } from "../platform/api/v1.ts";
import type {
  ClosingAuthorityInput,
  ConsumedClosingAuthority,
} from "./authority.ts";
import type { ClosingEffects } from "./effects.ts";
import type { ClosingCommandResult, ClosingUnitOfWork } from "./repository.ts";
import { ClosingServiceOperations } from "./service_operations.ts";

export interface ClosingClock {
  now(): string;
}

export interface ClosingServiceDependencies {
  readonly unitOfWork: ClosingUnitOfWork;
  readonly clock: ClosingClock;
  readonly effects?: ClosingEffects;
  readonly authority?: ClosingAuthorityPort;
}

export interface ClosingAuthorityPort {
  consume(input: ClosingAuthorityInput): Promise<ConsumedClosingAuthority>;
}

export interface ClosingCommandInput {
  readonly scope: import("./model.ts").ClosingScope;
  readonly workspaceId: string;
  readonly actor: ActorReference;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
}

export interface ClosingAuthorityCommandInput extends ClosingCommandInput {
  readonly authority: Pick<
    ClosingAuthorityInput,
    "protectedCommand" | "resolver"
  >;
}

export type { ClosingCommandResult };

export class ClosingService extends ClosingServiceOperations {
  constructor(dependencies: ClosingServiceDependencies) {
    super(dependencies);
  }
}
