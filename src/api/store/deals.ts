import {
  AssignmentSide,
  CreateDealRequest,
  DealDetail,
  DealListQuery,
  DealPhase,
  DealStatus,
  DealSummary,
  TeamMember,
  TransitionDealPhaseRequest,
  UpdateDealRequest,
} from "../contracts.ts";
import { getDealState, getEntity, getOptionalTeamMember } from "./accessors.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import { DealState, Entity, Page } from "./types.ts";
import { clone, normalizedSearch, pageOf } from "./utils.ts";

type DealIdentity = Pick<
  DealState,
  | "id"
  | "code"
  | "title"
  | "dealType"
  | "target"
  | "targetId"
  | "valuationRange"
  | "financialStructure"
  | "activeEntityIds"
>;

export function toTargetSummary(entity: Entity): DealSummary["target"] {
  return {
    id: entity.id,
    legalName: entity.legalName,
    sector: entity.sector,
    countryCode: entity.countryCode,
  };
}

export function toAdvisorSummary(
  member: TeamMember,
): NonNullable<DealSummary["leadAdvisor"]> {
  return {
    id: member.id,
    displayName: member.displayName,
    avatarUrl: member.avatarUrl,
  };
}

function toDealSummary(deal: DealState): DealSummary {
  const {
    phaseHistory: _phaseHistory,
    financialStructure: _financialStructure,
    teamAssignments: _teamAssignments,
    activeEntityIds: _activeEntityIds,
    targetId: _targetId,
    leadAdvisorId: _leadAdvisorId,
    ...summary
  } = deal;
  return clone(summary);
}

function toDealDetail(deal: DealState): DealDetail {
  const {
    activeEntityIds: _activeEntityIds,
    targetId: _targetId,
    leadAdvisorId: _leadAdvisorId,
    ...detail
  } = deal;
  return clone(detail);
}

export class DealRepository {
  constructor(private readonly state: MvpStoreState) {}

  list(query: DealListQuery = {}): Page<DealSummary> {
    const rows = [...this.state.deals.values()]
      .filter((deal) => matchesDeal(deal, query))
      .sort(dealComparator(query));
    return pageOf(rows.map(toDealSummary), query);
  }

  get(id: string): DealDetail {
    return toDealDetail(getDealState(this.state, id));
  }

  create(input: CreateDealRequest): DealDetail {
    const target = getEntity(this.state, input.targetId);
    const advisor = getOptionalTeamMember(this.state, input.leadAdvisorId);
    const timestamp = this.state.now();
    const deal = createDealState(this.state, input, target, advisor, timestamp);
    this.state.deals.set(deal.id, deal);
    return toDealDetail(deal);
  }

  update(id: string, patch: UpdateDealRequest): DealDetail {
    const deal = getDealState(this.state, id);
    this.assertVersion(deal, patch.version);
    applyDealFields(deal, patch);
    applyTargetPatch(this.state, deal, patch.targetId);
    applyAdvisorPatch(this.state, deal, patch.leadAdvisorId);
    touchDeal(this.state, deal);
    return toDealDetail(deal);
  }

  archive(id: string, version?: number): DealDetail {
    const deal = getDealState(this.state, id);
    if (version !== undefined) this.assertVersion(deal, version);
    if (deal.status === DealStatus.Archived) return toDealDetail(deal);
    deal.status = DealStatus.Archived;
    deal.activeEntityIds = [];
    deal.version += 1;
    deal.updatedAt = this.state.now();
    return toDealDetail(deal);
  }

  transition(id: string, input: TransitionDealPhaseRequest): DealDetail {
    const deal = getDealState(this.state, id);
    this.assertVersion(deal, input.version);
    assertPhaseTransition(deal, input.toPhase);
    const timestamp = this.state.now();
    appendPhaseHistory(this.state, deal, input, timestamp);
    deal.currentPhase = input.toPhase;
    deal.version += 1;
    deal.updatedAt = timestamp;
    return toDealDetail(deal);
  }

  private assertVersion(deal: DealState, version: number): void {
    if (deal.version !== version) {
      throw new MvpStoreError(
        "RESOURCE_VERSION_CONFLICT",
        "Deal version is stale",
        409,
      );
    }
  }
}

function matchesDeal(deal: DealState, query: DealListQuery): boolean {
  const assigneeMatches = !query.assigneeId ||
    deal.teamAssignments.some((item) =>
      item.teamMember.id === query.assigneeId
    );
  const text = `${deal.code} ${deal.title} ${deal.target.legalName}`
    .toLocaleLowerCase();
  return (!query.status || deal.status === query.status) &&
    (!query.phase || deal.currentPhase === query.phase) &&
    assigneeMatches &&
    (!query.search || text.includes(normalizedSearch(query.search)));
}

function dealComparator(
  query: DealListQuery,
): (left: DealState, right: DealState) => number {
  const descending = query.sort?.startsWith("-") ?? false;
  const sortKey = query.sort?.replace(/^-/, "") ?? "updatedAt";
  return (left, right) => {
    const leftValue = sortKey === "title" ? left.title : left.updatedAt;
    const rightValue = sortKey === "title" ? right.title : right.updatedAt;
    return leftValue.localeCompare(rightValue) * (descending ? -1 : 1);
  };
}

function createDealState(
  state: MvpStoreState,
  input: CreateDealRequest,
  target: Entity,
  advisor: TeamMember | null,
  timestamp: string,
): DealState {
  return {
    ...dealIdentity(state.id(), input, target),
    ...dealWorkflow(state, advisor, timestamp),
  };
}

function dealIdentity(
  id: string,
  input: CreateDealRequest,
  target: Entity,
): DealIdentity {
  return {
    id,
    code: input.code,
    title: input.title,
    dealType: input.dealType,
    target: toTargetSummary(target),
    targetId: target.id,
    valuationRange: clone(input.valuationRange),
    financialStructure: clone(input.financialStructure),
    activeEntityIds: [target.id],
  };
}

function dealWorkflow(
  state: MvpStoreState,
  advisor: TeamMember | null,
  timestamp: string,
): Omit<DealState, keyof ReturnType<typeof dealIdentity>> {
  return {
    status: DealStatus.Active,
    currentPhase: DealPhase.Sourcing,
    leadAdvisor: advisor ? toAdvisorSummary(advisor) : null,
    leadAdvisorId: advisor?.id ?? null,
    updatedAt: timestamp,
    version: 1,
    phaseHistory: [createdHistory(state, advisor, timestamp)],
    teamAssignments: advisor ? [leadAssignment(state, advisor)] : [],
  };
}

function createdHistory(
  state: MvpStoreState,
  advisor: TeamMember | null,
  timestamp: string,
): DealState["phaseHistory"][number] {
  return {
    id: state.id(),
    fromPhase: null,
    toPhase: DealPhase.Sourcing,
    comment: "Deal created",
    changedAt: timestamp,
    changedBy: advisor ? toAdvisorSummary(advisor) : null,
  };
}

function leadAssignment(
  state: MvpStoreState,
  advisor: TeamMember,
): DealState["teamAssignments"][number] {
  return {
    id: state.id(),
    teamMember: clone(advisor),
    assignmentRole: "lead_advisor",
    side: AssignmentSide.Neutral,
    isLead: true,
  };
}

function applyDealFields(deal: DealState, patch: UpdateDealRequest): void {
  if (patch.code !== undefined) deal.code = patch.code;
  if (patch.title !== undefined) deal.title = patch.title;
  if (patch.dealType !== undefined) deal.dealType = patch.dealType;
  if (patch.valuationRange !== undefined) {
    deal.valuationRange = clone(patch.valuationRange);
  }
  if (patch.financialStructure !== undefined) {
    deal.financialStructure = clone(patch.financialStructure);
  }
}

function applyTargetPatch(
  state: MvpStoreState,
  deal: DealState,
  targetId?: string,
): void {
  if (!targetId) return;
  const target = getEntity(state, targetId);
  deal.target = toTargetSummary(target);
  deal.targetId = target.id;
  deal.activeEntityIds = deal.status === DealStatus.Active ? [target.id] : [];
}

function applyAdvisorPatch(
  state: MvpStoreState,
  deal: DealState,
  advisorId?: string | null,
): void {
  if (advisorId === undefined) return;
  const advisor = getOptionalTeamMember(state, advisorId);
  deal.leadAdvisor = advisor ? toAdvisorSummary(advisor) : null;
  deal.leadAdvisorId = advisor?.id ?? null;
  markLeadAssignment(deal, advisor);
  if (advisor && !hasAdvisor(deal, advisor.id)) {
    deal.teamAssignments.push(leadAssignment(state, advisor));
  }
}

function markLeadAssignment(deal: DealState, advisor: TeamMember | null): void {
  deal.teamAssignments = deal.teamAssignments.map((assignment) => ({
    ...assignment,
    isLead: advisor ? assignment.teamMember.id === advisor.id : false,
  }));
}

function hasAdvisor(deal: DealState, advisorId: string): boolean {
  return deal.teamAssignments.some((item) => item.teamMember.id === advisorId);
}

function touchDeal(state: MvpStoreState, deal: DealState): void {
  deal.version += 1;
  deal.updatedAt = state.now();
}

function assertPhaseTransition(deal: DealState, next: DealPhase): void {
  const sequence = [
    DealPhase.Sourcing,
    DealPhase.DueDiligence,
    DealPhase.Negotiation,
    DealPhase.Closing,
  ];
  const expected = sequence[sequence.indexOf(deal.currentPhase) + 1];
  if (deal.status === DealStatus.Active && next === expected) return;
  throw new MvpStoreError(
    "DEAL_PHASE_TRANSITION_INVALID",
    `Cannot transition from "${deal.currentPhase}" to "${next}"; expected "${expected}"`,
    422,
    { toPhase: ["Deal phases must advance one step in sequence"] },
  );
}

function appendPhaseHistory(
  state: MvpStoreState,
  deal: DealState,
  input: TransitionDealPhaseRequest,
  timestamp: string,
): void {
  deal.phaseHistory.push({
    id: state.id(),
    fromPhase: deal.currentPhase,
    toPhase: input.toPhase,
    comment: input.comment || null,
    changedAt: timestamp,
    changedBy: deal.leadAdvisor ? clone(deal.leadAdvisor) : null,
  });
}
