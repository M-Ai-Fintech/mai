import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  IdempotencyKey,
  RequestContext,
} from "../platform/api/v1.ts";
import type {
  ClosingAuthorityInput,
  ConsumedClosingAuthority,
} from "./authority.ts";
import type { ClosingAuthorizationPort } from "./authorization.ts";
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
  readonly authorization?: ClosingAuthorizationPort;
}

export interface ClosingAuthorityPort {
  consume(input: ClosingAuthorityInput): Promise<ConsumedClosingAuthority>;
}

export interface ClosingCommandInput {
  readonly context: RequestContext;
  readonly scope: import("./model.ts").ClosingScope;
  readonly workspaceId: string;
  readonly actor: ActorReference;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
}

export interface ClosingReadInput {
  readonly context: RequestContext;
  readonly scope: import("./model.ts").ClosingScope;
  readonly workspaceId: string;
  readonly actor: ActorReference;
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
