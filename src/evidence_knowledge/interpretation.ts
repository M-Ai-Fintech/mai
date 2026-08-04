import type { EvidenceScope, Interpretation } from "./model.ts";

export function createInterpretation(input: Interpretation): Interpretation {
  assertText(input.statement, "Interpretation statement", 4096);
  assertScope(input.scope);
  if (input.evidenceIds.length === 0) {
    throw new Error(
      "Interpretation evidence IDs are empty; expected supporting evidence.",
    );
  }
  if (input.status !== "proposed") {
    throw new Error(
      `Interpretation status "${input.status}" is invalid; expected proposed.`,
    );
  }
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    evidenceIds: Object.freeze([...input.evidenceIds]),
  });
}
function assertScope(scope: EvidenceScope): void {
  if (!scope.tenantId || !scope.workspaceId || !scope.dealId) {
    throw new Error(
      "Interpretation scope is incomplete; expected tenant, workspace, and Deal IDs.",
    );
  }
}
function assertText(value: string, label: string, maximum: number): void {
  if (value.trim() && value.length <= maximum) return;
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}
