import { TeamMember } from "../contracts.ts";
import { assertAdvisor, getDealState } from "./accessors.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import {
  ListQuery,
  Page,
  TeamAssignment,
  TeamAssignmentInput,
} from "./types.ts";
import { clone, normalizedSearch, pageOf } from "./utils.ts";

export interface TeamMemberListQuery extends ListQuery {
  role?: string;
  active?: boolean;
}

export class TeamRepository {
  constructor(private readonly state: MvpStoreState) {}

  listMembers(query: TeamMemberListQuery = {}): Page<TeamMember> {
    const search = normalizedSearch(query.search);
    const rows = [...this.state.teamMembers.values()]
      .filter((member) =>
        (query.active === undefined || member.active === query.active) &&
        (!query.role || member.role === query.role) &&
        (!search || `${member.displayName} ${member.email} ${member.firmName}`
          .toLocaleLowerCase().includes(search))
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return pageOf(rows, query);
  }

  getAssignments(dealId: string): TeamAssignment[] {
    return clone(getDealState(this.state, dealId).teamAssignments);
  }

  putAssignments(
    dealId: string,
    version: number,
    inputs: TeamAssignmentInput[],
  ): { data: TeamAssignment[]; version: number } {
    const deal = getDealState(this.state, dealId);
    assertAssignmentVersion(dealId, deal.version, version);
    assertSingleLead(inputs);
    const assignments = inputs.map((input) =>
      createAssignment(this.state, input)
    );
    deal.teamAssignments = assignments;
    deal.version += 1;
    deal.updatedAt = this.state.now();
    return clone({ data: assignments, version: deal.version });
  }
}

function assertAssignmentVersion(
  dealId: string,
  actual: number,
  expected: number,
): void {
  if (actual === expected) return;
  throw new MvpStoreError(
    "RESOURCE_VERSION_CONFLICT",
    `Deal "${dealId}" has version "${actual}"; expected "${expected}"`,
    409,
  );
}

function assertSingleLead(inputs: TeamAssignmentInput[]): void {
  if (inputs.filter((item) => item.isLead).length <= 1) return;
  throw new MvpStoreError(
    "TEAM_ASSIGNMENT_INVALID",
    `Received multiple lead assignments; expected at most one`,
    422,
    { assignments: ["Only one assignment may be marked as lead"] },
  );
}

function createAssignment(
  state: MvpStoreState,
  input: TeamAssignmentInput,
): TeamAssignment {
  assertAdvisor(state, input.teamMemberId);
  const { teamMemberId, ...assignment } = input;
  return {
    ...clone(assignment),
    id: state.id(),
    teamMember: clone(state.teamMembers.get(teamMemberId)!),
  };
}
