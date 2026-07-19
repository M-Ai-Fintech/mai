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
    const search = normalizedSearch(query.search);
    let rows = [...this.state.deals.values()].filter((deal) =>
      (!query.status || deal.status === query.status) &&
      (!query.phase || deal.currentPhase === query.phase) &&
      (!query.assigneeId ||
        deal.teamAssignments.some((assignment) =>
          assignment.teamMember.id === query.assigneeId
        )) &&
      (!search || `${deal.code} ${deal.title} ${deal.target.legalName}`
        .toLocaleLowerCase().includes(search))
    );
    const descending = query.sort?.startsWith("-") ?? false;
    const sortKey = query.sort?.replace(/^-/, "") ?? "updatedAt";
    rows = rows.sort((a, b) => {
      const left = sortKey === "title" ? a.title : a.updatedAt;
      const right = sortKey === "title" ? b.title : b.updatedAt;
      return left.localeCompare(right) * (descending ? -1 : 1);
    });
    return pageOf(rows.map(toDealSummary), query);
  }

  get(id: string): DealDetail {
    return toDealDetail(getDealState(this.state, id));
  }

  create(input: CreateDealRequest): DealDetail {
    const target = getEntity(this.state, input.targetId);
    const leadAdvisor = getOptionalTeamMember(
      this.state,
      input.leadAdvisorId,
    );
    const timestamp = this.state.now();
    const id = this.state.id();
    const deal: DealState = {
      id,
      code: input.code,
      title: input.title,
      dealType: input.dealType,
      status: DealStatus.Active,
      currentPhase: DealPhase.Sourcing,
      target: toTargetSummary(target),
      targetId: target.id,
      valuationRange: clone(input.valuationRange),
      leadAdvisor: leadAdvisor ? toAdvisorSummary(leadAdvisor) : null,
      leadAdvisorId: leadAdvisor?.id ?? null,
      updatedAt: timestamp,
      version: 1,
      phaseHistory: [{
        id: this.state.id(),
        fromPhase: null,
        toPhase: DealPhase.Sourcing,
        comment: "Deal created",
        changedAt: timestamp,
        changedBy: leadAdvisor ? toAdvisorSummary(leadAdvisor) : null,
      }],
      financialStructure: clone(input.financialStructure),
      teamAssignments: leadAdvisor
        ? [{
          id: this.state.id(),
          teamMember: clone(leadAdvisor),
          assignmentRole: "lead_advisor",
          side: AssignmentSide.Neutral,
          isLead: true,
        }]
        : [],
      activeEntityIds: [target.id],
    };
    this.state.deals.set(id, deal);
    return toDealDetail(deal);
  }

  update(id: string, patch: UpdateDealRequest): DealDetail {
    const deal = getDealState(this.state, id);
    this.assertVersion(deal, patch.version);
    const target = patch.targetId
      ? getEntity(this.state, patch.targetId)
      : null;
    const advisor = patch.leadAdvisorId !== undefined
      ? getOptionalTeamMember(this.state, patch.leadAdvisorId)
      : undefined;
    const { version: _expectedVersion, ...changes } = patch;
    if (changes.code !== undefined) deal.code = changes.code;
    if (changes.title !== undefined) deal.title = changes.title;
    if (changes.dealType !== undefined) deal.dealType = changes.dealType;
    if (changes.valuationRange !== undefined) {
      deal.valuationRange = clone(changes.valuationRange);
    }
    if (changes.financialStructure !== undefined) {
      deal.financialStructure = clone(changes.financialStructure);
    }
    if (target) {
      deal.target = toTargetSummary(target);
      deal.targetId = target.id;
      deal.activeEntityIds = deal.status === DealStatus.Active
        ? [target.id]
        : [];
    }
    if (advisor !== undefined) {
      deal.leadAdvisor = advisor ? toAdvisorSummary(advisor) : null;
      deal.leadAdvisorId = advisor?.id ?? null;
      deal.teamAssignments = deal.teamAssignments.map((assignment) => ({
        ...assignment,
        isLead: advisor ? assignment.teamMember.id === advisor.id : false,
      }));
      if (
        advisor &&
        !deal.teamAssignments.some((assignment) =>
          assignment.teamMember.id === advisor.id
        )
      ) {
        deal.teamAssignments.push({
          id: this.state.id(),
          teamMember: clone(advisor),
          assignmentRole: "lead_advisor",
          side: AssignmentSide.Neutral,
          isLead: true,
        });
      }
    }
    deal.version += 1;
    deal.updatedAt = this.state.now();
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
    const sequence = [
      DealPhase.Sourcing,
      DealPhase.DueDiligence,
      DealPhase.Negotiation,
      DealPhase.Closing,
    ];
    const currentIndex = sequence.indexOf(deal.currentPhase);
    if (
      deal.status !== DealStatus.Active ||
      input.toPhase !== sequence[currentIndex + 1]
    ) {
      throw new MvpStoreError(
        "DEAL_PHASE_TRANSITION_INVALID",
        `Cannot transition from ${deal.currentPhase} to ${input.toPhase}`,
        422,
        { toPhase: ["Deal phases must advance one step in sequence"] },
      );
    }
    const timestamp = this.state.now();
    deal.phaseHistory.push({
      id: this.state.id(),
      fromPhase: deal.currentPhase,
      toPhase: input.toPhase,
      comment: input.comment || null,
      changedAt: timestamp,
      changedBy: deal.leadAdvisor ? clone(deal.leadAdvisor) : null,
    });
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
