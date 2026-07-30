import type { IdempotencyKey } from "./identifiers.ts";
import type { RequestContext } from "./request_context.ts";
import type { AggregateVersion } from "./aggregate_version.ts";

export declare const commandResultType: unique symbol;
export declare const queryResultType: unique symbol;

export interface Command<Name extends string, Payload, Result> {
  readonly name: Name;
  readonly payload: Payload;
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: AggregateVersion;
  readonly [commandResultType]?: Result;
}

export interface Query<Name extends string, Input, Result> {
  readonly name: Name;
  readonly input: Input;
  readonly context: RequestContext;
  readonly [queryResultType]?: Result;
}

export type CommandResult<T extends Command<string, unknown, unknown>> =
  T extends Command<string, unknown, infer Result> ? Result : never;

export type QueryResult<T extends Query<string, unknown, unknown>> = T extends
  Query<string, unknown, infer Result> ? Result : never;

export interface CommandPort<
  TCommand extends Command<string, unknown, unknown>,
> {
  execute(command: TCommand): Promise<CommandResult<TCommand>>;
}

export interface QueryPort<TQuery extends Query<string, unknown, unknown>> {
  execute(query: TQuery): Promise<QueryResult<TQuery>>;
}
