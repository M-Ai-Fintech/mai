import type { Assumption } from "./model.ts";

export function createAssumption(input: Assumption): Assumption {
  assertText(input.statement, "Assumption statement", 4096);
  if (input.rationale !== undefined) {
    assertText(input.rationale, "Assumption rationale", 4096);
  }
  if (input.status !== "proposed") {
    throw new Error(
      `Assumption status "${input.status}" is invalid; expected proposed.`,
    );
  }
  if (
    !input.scope.tenantId || !input.scope.workspaceId || !input.scope.dealId
  ) {
    throw new Error(
      "Assumption scope is incomplete; expected tenant, workspace, and Deal IDs.",
    );
  }
  return Object.freeze({ ...input, scope: Object.freeze({ ...input.scope }) });
}
function assertText(value: string, label: string, maximum: number): void {
  if (value.trim() && value.length <= maximum) return;
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}
