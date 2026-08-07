const runtimeIdentifierBrand: unique symbol = Symbol("agent-runtime-id");

type RuntimeIdentifier<Kind extends string> = string & {
  readonly [runtimeIdentifierBrand]: Kind;
};

export type MissionId = RuntimeIdentifier<"MissionId">;
export type PlanId = RuntimeIdentifier<"PlanId">;
export type RunId = RuntimeIdentifier<"RunId">;
export type StepId = RuntimeIdentifier<"StepId">;
export type ToolActivityId = RuntimeIdentifier<"ToolActivityId">;
export type ResultId = RuntimeIdentifier<"ResultId">;
export type ArtifactId = RuntimeIdentifier<"ArtifactId">;

export type RuntimeIdentifierIssueCode =
  | "INVALID_TYPE"
  | "EMPTY"
  | "SURROUNDING_WHITESPACE"
  | "WRONG_PREFIX"
  | "INCOMPLETE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT";

export type RuntimeIdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
    readonly ok: false;
    readonly issue: { readonly code: RuntimeIdentifierIssueCode };
  };

export const parseMissionId = parser<MissionId>("mission_");
export const parsePlanId = parser<PlanId>("plan_");
export const parseRunId = parser<RunId>("run_");
export const parseStepId = parser<StepId>("step_");
export const parseToolActivityId = parser<ToolActivityId>("activity_");
export const parseResultId = parser<ResultId>("result_");
export const parseArtifactId = parser<ArtifactId>("artifact_");

function parser<T>(
  prefix: string,
): (value: unknown) => RuntimeIdentifierResult<T> {
  return (value) =>
    parseIdentifier(value, prefix) as RuntimeIdentifierResult<T>;
}

function parseIdentifier(
  value: unknown,
  prefix: string,
): RuntimeIdentifierResult<string> {
  if (typeof value !== "string") return failure("INVALID_TYPE");
  if (value.length === 0) return failure("EMPTY");
  if (value !== value.trim()) return failure("SURROUNDING_WHITESPACE");
  if (!value.startsWith(prefix)) return failure("WRONG_PREFIX");
  if (value.length === prefix.length) return failure("INCOMPLETE");
  if (value.length > 96) return failure("INVALID_LENGTH");
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
    ? { ok: true, value }
    : failure("INVALID_FORMAT");
}

function failure(
  code: RuntimeIdentifierIssueCode,
): RuntimeIdentifierResult<never> {
  return { ok: false, issue: { code } };
}
