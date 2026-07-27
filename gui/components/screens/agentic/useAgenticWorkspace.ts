import type { AgenticWorkspaceController } from "./agentic-workspace-types";
import { useAgenticWorkspaceActions } from "./agentic-workspace-actions";
import { useAgenticCoreActions } from "./agentic-workspace-core-actions";
import {
  agenticWorkspaceControllerFromGroups,
  useAgenticStateGroups,
} from "./agentic-workspace-state";

export function useAgenticWorkspace(
  dealId: string,
): AgenticWorkspaceController {
  const groups = useAgenticStateGroups();
  const coreActions = useAgenticCoreActions(dealId, groups);
  const actions = useAgenticWorkspaceActions(dealId, groups, coreActions);
  return agenticWorkspaceControllerFromGroups(groups, actions);
}
