import { TeamMember } from "../contracts.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import { DealState, Entity } from "./types.ts";
import { clone } from "./utils.ts";

export function getDealState(state: MvpStoreState, id: string): DealState {
  const deal = state.deals.get(id);
  if (!deal) throw new MvpStoreError("DEAL_NOT_FOUND", "Deal not found", 404);
  return deal;
}

export function getEntity(state: MvpStoreState, id: string): Entity {
  const entity = state.entities.get(id);
  if (!entity) {
    throw new MvpStoreError("ENTITY_NOT_FOUND", "Entity not found", 404);
  }
  return clone(entity);
}

export function assertAdvisor(state: MvpStoreState, id: string | null): void {
  if (id && !state.teamMembers.has(id)) {
    throw new MvpStoreError(
      "TEAM_MEMBER_NOT_FOUND",
      "Team member not found",
      404,
    );
  }
}

export function getOptionalTeamMember(
  state: MvpStoreState,
  id: string | null,
): TeamMember | null {
  if (id === null) return null;
  assertAdvisor(state, id);
  return clone(state.teamMembers.get(id)!);
}
