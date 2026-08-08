import {
  consumeClosingAuthority,
  type ConsumedClosingAuthority,
} from "./authority.ts";
import {
  action,
  type AllowedAuthorizationDecision,
} from "../platform/authz/v1.ts";
import {
  authorizeClosingAction,
  type ClosingAuthorizationInput,
  type ClosingAuthorizationPort,
  closingWorkspaceResource,
  denyClosingAuthorization,
} from "./authorization.ts";
import { type ClosingEffects, NoopClosingEffects } from "./effects.ts";
import { ClosingError, type ClosingWorkspace } from "./model.ts";
import type { ClosingCommandResult, ClosingTransaction } from "./repository.ts";
import { invalidateClosingReadiness } from "./readiness.ts";
import {
  appendEffects,
  assertHumanActor,
  assertMutableWorkspace,
  commandIdentity,
  protectedNotFound,
  recordMutation,
  type WorkspaceChanges,
} from "./service_support.ts";
import type {
  ClosingAuthorityCommandInput,
  ClosingCommandInput,
  ClosingServiceDependencies,
} from "./service.ts";
import type { ClosingAuthorityPort } from "./service.ts";

export class ClosingServiceRuntime {
  protected readonly dependencies: ClosingServiceDependencies;
  protected readonly effects: ClosingEffects;
  protected readonly authority: ClosingAuthorityPort;
  protected readonly authorization: ClosingAuthorizationPort;

  constructor(dependencies: ClosingServiceDependencies) {
    this.dependencies = dependencies;
    this.effects = dependencies.effects ?? new NoopClosingEffects();
    this.authority = dependencies.authority ?? {
      consume: consumeClosingAuthority,
    };
    this.authorization = dependencies.authorization ?? denyClosingAuthorization;
  }

  protected authorize(
    input: ClosingAuthorizationInput,
  ): Promise<AllowedAuthorizationDecision> {
    return authorizeClosingAction(this.authorization, input);
  }

  protected mutate(
    input: ClosingCommandInput,
    commandType: string,
    payload: Readonly<Record<string, unknown>>,
    callback: (workspace: ClosingWorkspace) => WorkspaceChanges,
    withJob = false,
    invalidate = true,
    resource = closingWorkspaceResource(input.workspaceId),
  ): Promise<ClosingCommandResult> {
    return this.runCommand(
      input,
      commandType,
      payload,
      resource,
      async (transaction, workspace) => {
        const base = invalidate
          ? this.invalidateReadiness(workspace, commandType)
          : workspace;
        const changes = callback(base);
        const next = recordMutation(
          base,
          changes,
          input.actor,
          commandType,
          payload,
          this.dependencies.clock.now(),
        );
        await transaction.replace(next, input.expectedVersion);
        await appendEffects(
          this.effects,
          transaction,
          next,
          input.actor,
          commandType,
          undefined,
          withJob,
        );
        return next;
      },
    );
  }

  protected authorizedMutation(
    input: ClosingAuthorityCommandInput,
    commandType: string,
    payload: Readonly<Record<string, unknown>>,
    callback: (
      workspace: ClosingWorkspace,
      authority: ConsumedClosingAuthority,
    ) => WorkspaceChanges,
    withJob = false,
    invalidate = true,
    resource = closingWorkspaceResource(input.workspaceId),
  ): Promise<ClosingCommandResult> {
    return this.runCommand(
      input,
      commandType,
      payload,
      resource,
      async (transaction, workspace) => {
        const authority = await this.authority.consume({
          ...input.authority,
          scope: input.scope,
          targetId: input.workspaceId,
          expectedVersion: input.expectedVersion,
          commandType,
          actorId: input.actor.id,
          idempotencyKey: input.idempotencyKey,
          consumedAt: this.dependencies.clock.now(),
        });
        assertHumanActor(
          authority.actor,
          "execute a protected Closing command",
        );
        if (authority.actor.id !== input.actor.id) {
          throw new ClosingError(
            "SCOPE_MISMATCH",
            `Consumed Closing authority actor "${authority.actor.id}" does not match command actor "${input.actor.id}"; expected one exact human identity.`,
          );
        }
        const base = invalidate
          ? this.invalidateReadiness(workspace, commandType)
          : workspace;
        const changes = callback(base, authority);
        const next = recordMutation(
          base,
          changes,
          input.actor,
          commandType,
          payload,
          this.dependencies.clock.now(),
          authority.proof.proofId,
        );
        await transaction.replace(next, input.expectedVersion);
        await appendEffects(
          this.effects,
          transaction,
          next,
          input.actor,
          commandType,
          authority.proof.proofId,
          withJob,
        );
        return next;
      },
    );
  }

  private invalidateReadiness(
    workspace: ClosingWorkspace,
    commandType: string,
  ): ClosingWorkspace {
    return invalidateClosingReadiness(
      workspace,
      commandType,
      this.dependencies.clock.now(),
    );
  }

  private async runCommand(
    input: ClosingCommandInput,
    commandType: string,
    payload: Readonly<Record<string, unknown>>,
    resource: ReturnType<typeof closingWorkspaceResource>,
    operation: (
      transaction: ClosingTransaction,
      workspace: ClosingWorkspace,
    ) => Promise<ClosingWorkspace>,
  ): Promise<ClosingCommandResult> {
    assertHumanActor(input.actor, commandType);
    const now = this.dependencies.clock.now();
    await this.authorize({
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      resource,
      action: action(commandType),
      humanOnly: true,
      now,
    });
    const identity = await commandIdentity(
      input.scope,
      input.actor,
      commandType,
      input.workspaceId,
      input.idempotencyKey,
      payload,
      now,
    );
    return this.dependencies.unitOfWork.run(identity, async (transaction) => {
      const workspace = await transaction.find(input.scope, input.workspaceId);
      if (workspace === undefined) throw protectedNotFound(input.workspaceId);
      assertMutableWorkspace(workspace, commandType);
      return operation(transaction, workspace);
    });
  }
}
