import { humanizeEntityValue } from "./entity-options";
import type { EntityRole } from "./entity-state";
import type { WorkspaceRuntime } from "./entities-workspace-types";

export function hasWorkspaceFilters(runtime: WorkspaceRuntime): boolean {
  return Boolean(
    runtime.filters.search || runtime.filters.sector ||
      runtime.filters.countryCode !== "BR",
  );
}

export function modalRoleLabel(runtime: WorkspaceRuntime): string {
  return humanizeEntityValue(modalRole(runtime));
}

function modalRole(runtime: WorkspaceRuntime): EntityRole {
  return runtime.formState.editingEntity?.roles[0] ??
    runtime.formState.form.roles[0] ?? runtime.filters.role;
}
