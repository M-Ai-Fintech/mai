import {
  assertExpectedVersion,
  requireWorkstream,
} from "./application_helpers.ts";
import {
  type CommandInput,
  type CommandOutcome,
  type CreateCommand,
  outcome,
  withPayload,
} from "./command_execution.ts";
import type { WorkManagementApplicationContext } from "./application_types.ts";
import type { WorkstreamId } from "./ids.ts";
import type { Workstream } from "./model.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import { createWorkstream, transitionWorkstream } from "./workstreams.ts";

export class WorkstreamApplicationService {
  constructor(private readonly context: WorkManagementApplicationContext) {}

  async createWorkstream(
    input: CreateCommand<WorkstreamId> & {
      readonly name: string;
      readonly ownerId: Workstream["ownerId"];
    },
  ): Promise<Workstream> {
    await this.authorize(input, "create", true);
    return await this.context.commands.execute(
      withPayload(input, { name: input.name, ownerId: input.ownerId }),
      "create_workstream",
      "workstream",
      async (transaction) => {
        const value = createWorkstream({
          ...input.scope,
          id: input.id,
          name: input.name,
          ownerId: input.ownerId,
          now: this.context.options.clock.now(),
        });
        await transaction.saveWorkstream(value, 0);
        return outcome(value, "workstream.created");
      },
    );
  }

  async transitionWorkstream(
    input: CommandInput<WorkstreamId> & {
      readonly toState: Workstream["state"];
    },
  ): Promise<Workstream> {
    await this.authorize(input, "transition", true);
    await this.reauthorizeState(input);
    return await this.context.commands.execute(
      withPayload(input, { toState: input.toState }),
      "transition_workstream",
      "workstream",
      (transaction) =>
        transitionWithinTransaction(this.context, transaction, input),
    );
  }

  private authorize(
    input: CommandInput<WorkstreamId>,
    action: string,
    humanOnly = true,
    state?: string,
  ): Promise<void> {
    return this.context.authorization.requireAllowed(
      input,
      action,
      "workstream",
      humanOnly,
      state,
    ).then(() => undefined);
  }

  private async reauthorizeState(
    input: CommandInput<WorkstreamId> & {
      readonly toState: Workstream["state"];
    },
  ): Promise<void> {
    await this.context.options.unitOfWork.read(async (transaction) => {
      const current = await requireWorkstream(transaction, input);
      await this.authorize(input, "transition", true, current.state);
      void input.toState;
    });
  }
}

async function transitionWithinTransaction(
  context: WorkManagementApplicationContext,
  transaction: WorkManagementTransaction,
  input: CommandInput<WorkstreamId> & {
    readonly toState: Workstream["state"];
  },
): Promise<CommandOutcome<Workstream>> {
  const current = await requireWorkstream(transaction, input);
  await context.authorization.requireAllowed(
    input,
    "transition",
    "workstream",
    true,
    current.state,
  );
  assertExpectedVersion(input.id, current.version, input.expectedVersion);
  const tasks = input.toState === "completed"
    ? await transaction.listTasksByWorkstream(input.scope, current.id)
    : [];
  const next = transitionWorkstream(current, {
    toState: input.toState,
    actor: input.actor,
    now: context.options.clock.now(),
    tasks,
  });
  await transaction.saveWorkstream(next, current.version);
  return outcome(next, "workstream.state_changed");
}
