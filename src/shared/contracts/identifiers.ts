const MAX_IDENTIFIER_LENGTH = 64;
const identifierBrand: unique symbol = Symbol("identifier");

type Identifier<Kind extends string> = string & {
  readonly [identifierBrand]: Kind;
};

export type ActorId = Identifier<"ActorId">;
export type TenantId = Identifier<"TenantId">;
export type WorkspaceId = Identifier<"WorkspaceId">;
export type DealId = Identifier<"DealId">;
export type CorrelationId = Identifier<"CorrelationId">;
export type IdempotencyKey = Identifier<"IdempotencyKey">;
export type OperationId = Identifier<"OperationId">;
export type JobId = Identifier<"JobId">;

export type IdentifierIssueCode =
  | "EMPTY"
  | "WHITESPACE_ONLY"
  | "SURROUNDING_WHITESPACE"
  | "WRONG_PREFIX"
  | "INCOMPLETE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT"
  | "INVALID_TYPE";

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
    readonly ok: false;
    readonly issue: { readonly code: IdentifierIssueCode };
  };

export function parseActorId(value: unknown): ParseResult<ActorId> {
  return parseIdentifier(value, "actor_");
}

export function parseTenantId(value: unknown): ParseResult<TenantId> {
  return parseIdentifier(value, "tenant_");
}

export function parseWorkspaceId(value: unknown): ParseResult<WorkspaceId> {
  return parseIdentifier(value, "workspace_");
}

export function parseDealId(value: unknown): ParseResult<DealId> {
  return parseIdentifier(value, "deal_");
}

export function parseCorrelationId(value: unknown): ParseResult<CorrelationId> {
  return parseIdentifier(value, "cor_");
}

export function parseIdempotencyKey(
  value: unknown,
): ParseResult<IdempotencyKey> {
  return parseIdentifier(value, "idem_");
}

export function parseOperationId(value: unknown): ParseResult<OperationId> {
  return parseIdentifier(value, "op_");
}

export function parseJobId(value: unknown): ParseResult<JobId> {
  return parseIdentifier(value, "job_");
}

export function serializeActorId(value: ActorId): string {
  return value;
}

export function serializeTenantId(value: TenantId): string {
  return value;
}

export function serializeWorkspaceId(value: WorkspaceId): string {
  return value;
}

export function serializeDealId(value: DealId): string {
  return value;
}

export function serializeCorrelationId(value: CorrelationId): string {
  return value;
}

export function serializeIdempotencyKey(value: IdempotencyKey): string {
  return value;
}

export function serializeOperationId(value: OperationId): string {
  return value;
}

export function serializeJobId(value: JobId): string {
  return value;
}

function parseIdentifier<Kind extends string>(
  value: unknown,
  prefix: string,
): ParseResult<Identifier<Kind>> {
  const issue = identifierIssue(value, prefix);
  return issue === undefined
    ? { ok: true, value: value as Identifier<Kind> }
    : { ok: false, issue: { code: issue } };
}

function identifierIssue(
  value: unknown,
  prefix: string,
): IdentifierIssueCode | undefined {
  if (typeof value !== "string") return "INVALID_TYPE";
  if (value.length === 0) return "EMPTY";
  if (value.trim().length === 0) return "WHITESPACE_ONLY";
  if (value !== value.trim()) return "SURROUNDING_WHITESPACE";
  if (!value.startsWith(prefix)) return "WRONG_PREFIX";
  if (value.length === prefix.length) return "INCOMPLETE";
  if (value.length > MAX_IDENTIFIER_LENGTH) return "INVALID_LENGTH";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
    ? undefined
    : "INVALID_FORMAT";
}
