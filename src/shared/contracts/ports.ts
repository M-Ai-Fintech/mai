import type { IdempotencyKey } from "./identifiers.ts";
import type { RequestContext } from "./request_context.ts";
import type { AggregateVersion } from "./aggregate_version.ts";

export interface Command<Name extends string, Payload, Result> {
  readonly name: Name;
  readonly payload: Payload;
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: AggregateVersion;
  readonly result?: Result;
}

export interface Query<Name extends string, Input, Result> {
  readonly name: Name;
  readonly input: Input;
  readonly context: RequestContext;
  readonly result?: Result;
}

export type CommandResult<T extends Command<string, unknown, unknown>> =
  T extends Command<string, unknown, infer Result> ? Result : never;

export type QueryResult<T extends Query<string, unknown, unknown>> = T extends
  Query<string, unknown, infer Result> ? Result : never;

export interface CommandPort {
  execute<T extends Command<string, unknown, unknown>>(
    command: T,
  ): Promise<CommandResult<T>>;
}

export interface QueryPort {
  execute<T extends Query<string, unknown, unknown>>(
    query: T,
  ): Promise<QueryResult<T>>;
}
